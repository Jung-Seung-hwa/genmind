import os, re, json, time, asyncio, uuid
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv, find_dotenv

import pandas as pd
from pypdf import PdfReader
import httpx
from difflib import SequenceMatcher
from tqdm import tqdm

# ====== 설정 ======
DEFAULT_MAX_PER_SECTION = 5       # 섹션당 최대 Q/A 수
MIN_CONFIDENCE = 0.0              # 0~1, 이 미만 항목 제거
SECTIONS_MAX_CHARS = 7000         # LLM에 보낼 섹션 최대 길이
MODEL_DEFAULT = "gpt-4o-mini"     # .env에 LLM_MODEL 없으면 사용
HTTP_TIMEOUT = 120.0
RETRY = 3
OUTPUT_DIR = "faq_output"
SAVE_DEBUG_RAW = True             # LLM 원문 응답 저장 (_debug/*.txt)
# ===================

# .env 로드 (backend/.env 자동 탐색)
load_dotenv(find_dotenv(usecwd=True))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", MODEL_DEFAULT)
assert OPENAI_API_KEY, "환경변수 OPENAI_API_KEY가 필요합니다 (.env에 설정)."

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
if SAVE_DEBUG_RAW:
    Path(OUTPUT_DIR, "_debug").mkdir(parents=True, exist_ok=True)

# ---------- 텍스트 전처리 ----------
def _clean_artifacts(text: str) -> str:
    """페이지 머리글/바닥글 제거, 공백/줄바꿈/하이픈 깨짐 보정"""
    lines = []
    for ln in text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if s in {"법제처", "국가법령정보센터"}:
            continue
        if re.fullmatch(r"\d+\s*", s):  # 단독 숫자 라인(페이지 번호 등)
            continue
        s = re.sub(r"\s+", " ", s)     # 공백 정규화
        lines.append(s)
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"(\S)-\s+(\S)", r"\1\2", cleaned)  # 줄바꿈 하이픈 보정
    return cleaned

def extract_text_from_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    texts = []
    for p in reader.pages:
        t = p.extract_text() or ""
        if t.strip():
            texts.append(t)
    raw = "\n".join(texts).strip()
    return _clean_artifacts(raw)

# ---------- 섹션 분리 ----------
HEADER_RE = re.compile(
    r"^("
    r"(제?\s*\d+\s*조(\s*\([\w\d가-하]+\))?)|"  # 제7조, 제7조의5(…)
    r"(\d+[\.\)]\s)|"                           # 1. / 1)
    r"([가-하]\.\s)|"                           # 가. 나.
    r"(□|■)|"                                   # 박스 마커
    r"(\#{1,6}\s)|"                              # 마크다운 헤더
    r"(\[[^\]]+\])"                              # [섹션]
    r")"
)

def split_into_sections(text: str) -> List[str]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return []
    sections, buf = [], []
    for ln in lines:
        if HEADER_RE.search(ln) and buf:
            sections.append("\n".join(buf))
            buf = [ln]
        else:
            buf.append(ln)
    if buf:
        sections.append("\n".join(buf))

    # 200자 미만 섹션은 이전 섹션과 병합
    merged = []
    for s in sections:
        if merged and len(s) < 200:
            merged[-1] = merged[-1] + "\n" + s
        else:
            merged.append(s)

    # 너무 긴 섹션은 문단 단위로 잘라 여러 청크로
    chunked = []
    for s in merged:
        if len(s) <= SECTIONS_MAX_CHARS:
            chunked.append(s)
        else:
            paras = re.split(r"\n{2,}", s)
            cur = ""
            for para in paras:
                if len(cur) + len(para) + 2 > SECTIONS_MAX_CHARS:
                    if cur:
                        chunked.append(cur)
                    cur = para
                else:
                    cur = (cur + "\n\n" + para) if cur else para
            if cur:
                chunked.append(cur)
    return chunked

# ---------- 프롬프트 ----------
def build_prompt(section_text: str, k: int) -> str:
    return f"""
너는 한국어 법령/규정 문서 섹션에서 FAQ를 추출한다.

출력 형식(중요): 오직 JSON 배열만 출력.
각 항목은 {{"question":"...", "answer":"...", "confidence":0~1, "ref_article":"제7조(…)"}} 형식.

규칙:
- 최대 {k}개
- 문서에 없는 내용은 "근거 부족", confidence=0.0~0.3, ref_article="" (빈 문자열)
- answer는 간결·정확·조건/예외 포함. 임의 추측/날조 금지.
- ref_article에는 해당 조문/항목을 간단히 기입(예: "제7조의5(병가)").

섹션:
\"\"\"{section_text[:SECTIONS_MAX_CHARS]}\"\"\"
"""

# ---------- JSON 파싱 ----------
def _normalize_rows(arr: List[Dict]) -> List[Dict]:
    out = []
    for it in arr:
        q = (it.get("question") or "").strip()
        a = (it.get("answer") or "").strip()
        ra = (it.get("ref_article") or "").strip()
        try:
            c = float(it.get("confidence", 0))
        except:
            c = 0.0
        if q and a:
            out.append({
                "question": q,
                "answer": a,
                "confidence": max(0.0, min(1.0, c)),
                "ref_article": ra
            })
    return out

def parse_json_safe(s: str) -> List[Dict]:
    # 1차: 그대로
    try:
        data = json.loads(s)
        if isinstance(data, list):
            return _normalize_rows(data)
    except:
        pass
    # 2차: 대괄호 구간만 추출
    i, j = s.find("["), s.rfind("]")
    if i != -1 and j != -1 and j > i:
        try:
            data = json.loads(s[i:j+1])
            if isinstance(data, list):
                return _normalize_rows(data)
        except:
            pass
    return []

# ---------- LLM 호출 ----------
async def call_llm(prompt: str, temperature: float = 0.2) -> str:
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": "너는 한국어 문서 요약·FAQ 추출 어시스턴트다."},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(HTTP_TIMEOUT)) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()

# ---------- 후처리/중복 ----------
def _post_fix(row: Dict) -> Dict:
    row["question"] = re.sub(r"\s*\?\s*$", "?", row["question"]).strip()
    row["answer"] = re.sub(r"\s+", " ", row["answer"]).strip()
    if len(row["answer"]) < 3:
        row["confidence"] = min(row["confidence"], 0.3)
    return row

def dedup_rows(rows: List[Dict], sim_threshold: float = 0.92) -> List[Dict]:
    out: List[Dict] = []
    for r in rows:
        q = re.sub(r"\s+", " ", r["question"].strip().lower())
        dup = False
        for x in out:
            qx = re.sub(r"\s+", " ", x["question"].strip().lower())
            if SequenceMatcher(None, q, qx).ratio() >= sim_threshold:
                dup = True
                break
        if not dup:
            out.append(r)
    return out

# ---------- PDF → rows ----------
async def faq_from_pdf(pdf_path: Path,
                       max_per_section: int = DEFAULT_MAX_PER_SECTION,
                       min_confidence: float = MIN_CONFIDENCE) -> List[Dict]:
    text = extract_text_from_pdf(pdf_path)
    if not text:
        return []
    sections = split_into_sections(text)

    rows: List[Dict] = []
    for idx, sec in enumerate(tqdm(sections, desc=f"[LLM] {pdf_path.name}", leave=False), start=1):
        prompt = build_prompt(sec, k=max_per_section)
        for attempt in range(RETRY):
            try:
                raw = await call_llm(prompt)
                if SAVE_DEBUG_RAW:
                    dbg = Path(OUTPUT_DIR, "_debug", f"{pdf_path.stem}_sec{idx}.txt")
                    dbg.write_text(raw, encoding="utf-8")
                items = parse_json_safe(raw)
                for it in items:
                    it["section_id"] = idx
                    it["source_file"] = pdf_path.name
                rows.extend(items)
                break
            except Exception as e:
                if attempt == RETRY - 1:
                    print(f"  ! {pdf_path.name} 섹션{idx} 실패: {e}")
                else:
                    time.sleep(1.5 * (attempt + 1))

    rows = [_post_fix(r) for r in rows]
    rows = [r for r in rows if r["confidence"] >= float(min_confidence)]
    rows = dedup_rows(rows)
    return rows

# ---------- 저장 ----------
def save_rows_to_xlsx(rows: List[Dict], out_path: Path):
    df = pd.DataFrame(rows, columns=["source_file", "section_id", "question", "answer", "confidence", "ref_article"])
    if df.empty:
        df = pd.DataFrame(columns=["source_file", "section_id", "question", "answer", "confidence", "ref_article"])
    with pd.ExcelWriter(out_path, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="FAQ")
        guide = pd.DataFrame([{
            "설명": "검수/수정 후 이 파일을 임베딩 파이프라인으로 등록하세요.",
            "권장 컬럼": "source_file, section_id, question, answer, confidence, ref_article",
            "팁": "answer가 '근거 부족'인 항목은 문서 근거를 보강하거나 제거하세요."
        }])
        guide.to_excel(w, index=False, sheet_name="GUIDE")

# ---------- 엔트리 ----------
async def run_per_file(input_dir: Path, k: int, min_conf: float):
    pdfs = sorted([p for p in input_dir.iterdir() if p.suffix.lower() == ".pdf"])
    total = 0
    for pdf in pdfs:
        rows = await faq_from_pdf(pdf, max_per_section=k, min_confidence=min_conf)
        out = Path(OUTPUT_DIR) / f"faq_{pdf.stem}_{uuid.uuid4().hex[:6]}.xlsx"
        save_rows_to_xlsx(rows, out)
        print(f"[완료] {pdf.name}: {len(rows)}개 Q/A → {out}")
        total += len(rows)
    print(f"[합계] 총 {len(pdfs)}개 PDF, {total}개 Q/A 생성")

async def run_combined(input_dir: Path, k: int, min_conf: float):
    pdfs = sorted([p for p in input_dir.iterdir() if p.suffix.lower() == ".pdf"])
    all_rows: List[Dict] = []
    for pdf in pdfs:
        rows = await faq_from_pdf(pdf, max_per_section=k, min_confidence=min_conf)
        all_rows.extend(rows)
    out = Path(OUTPUT_DIR) / f"faq_combined_{uuid.uuid4().hex[:8]}.xlsx"
    save_rows_to_xlsx(all_rows, out)
    print(f"[완료] {len(all_rows)}개 Q/A → {out}")

async def run_single_file(pdf_path: Path, k: int, min_conf: float):
    rows = await faq_from_pdf(pdf_path, max_per_section=k, min_confidence=min_conf)
    out = Path(OUTPUT_DIR) / f"faq_{pdf_path.stem}_{uuid.uuid4().hex[:6]}.xlsx"
    save_rows_to_xlsx(rows, out)
    print(f"[완료] {pdf_path.name}: {len(rows)}개 Q/A → {out}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PDF → FAQ 엑셀 생성 (품질 보강 버전)")
    parser.add_argument("input_path", help="PDF 폴더 경로 또는 단일 PDF 파일 경로")
    parser.add_argument("--mode", choices=["per_file", "combined", "single"], default="per_file",
                        help="per_file: 파일별 저장 / combined: 하나로 합쳐 저장 / single: 단일 파일만")
    parser.add_argument("--k", type=int, default=DEFAULT_MAX_PER_SECTION, help="섹션당 최대 Q/A 개수")
    parser.add_argument("--min_conf", type=float, default=MIN_CONFIDENCE, help="confidence 하한")
    args = parser.parse_args()

    p = Path(args.input_path)
    assert p.exists(), f"경로가 없습니다: {p}"

    if args.mode == "single":
        assert p.is_file() and p.suffix.lower() == ".pdf", "single 모드에는 단일 PDF 파일 경로를 주세요."
        asyncio.run(run_single_file(p, args.k, args.min_conf))
    else:
        assert p.is_dir(), "per_file/combined 모드에는 폴더 경로를 주세요."
        if args.mode == "per_file":
            asyncio.run(run_per_file(p, args.k, args.min_conf))
        else:
            asyncio.run(run_combined(p, args.k, args.min_conf))

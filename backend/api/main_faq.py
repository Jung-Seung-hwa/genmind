# backend/api/main_faq.py
import os, re, json, time, asyncio
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv, find_dotenv

from pypdf import PdfReader
import httpx
from difflib import SequenceMatcher
from tqdm import tqdm

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from db.session import get_db
from models.faq import CompFAQ   # ✅ 모델 import 확인

import sys, os

from fastapi import APIRouter, Depends, Body
from api.auth import get_current_user   # 로그인 유저 정보
from models.user import User as UserModel

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# ====== 설정 ======
DEFAULT_MAX_PER_SECTION = 5
MIN_CONFIDENCE = 0.0
SECTIONS_MAX_CHARS = 7000
MODEL_DEFAULT = "gpt-4o-mini"
HTTP_TIMEOUT = 120.0
RETRY = 3
# ==================

# .env 로드
load_dotenv(find_dotenv(usecwd=True))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", MODEL_DEFAULT)
assert OPENAI_API_KEY, "환경변수 OPENAI_API_KEY가 필요합니다 (.env에 설정)."

# ---------- 텍스트 전처리 ----------
def _clean_artifacts(text: str) -> str:
    lines = []
    for ln in text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if s in {"법제처", "국가법령정보센터"}:
            continue
        if re.fullmatch(r"\d+\s*", s):
            continue
        s = re.sub(r"\s+", " ", s)
        lines.append(s)
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"(\S)-\s+(\S)", r"\1\2", cleaned)
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
    r"(제?\s*\d+\s*조(\s*\([\w\d가-하]+\))?)|"
    r"(\d+[\.\)]\s)|"
    r"([가-하]\.\s)|"
    r"(□|■)|"
    r"(\#{1,6}\s)|"
    r"(\[[^\]]+\])"
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
    merged = []
    for s in sections:
        if merged and len(s) < 200:
            merged[-1] = merged[-1] + "\n" + s
        else:
            merged.append(s)
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
- 문서에 없는 내용은 "근거 부족", confidence=0.0~0.3, ref_article=""
- answer는 간결·정확·조건/예외 포함
- ref_article에는 해당 조문/항목을 간단히 기입

섹션:
\"\"\"{section_text[:SECTIONS_MAX_CHARS]}\"\"\""""

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
    try:
        data = json.loads(s)
        if isinstance(data, list):
            return _normalize_rows(data)
    except:
        pass
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

# ---------- 후처리 ----------
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

# ---------- DB 저장 ----------
def save_rows_to_db(rows: List[Dict], comp_domain: str, db: Session):
    for r in rows:
        faq = CompFAQ(
            comp_domain=comp_domain,
            sc_file=r.get("source_file"),
            question=r.get("question"),
            answer=r.get("answer"),
            ref_article=r.get("ref_article"),
            views=0
        )
        db.add(faq)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        print("DB 저장 실패:", e)

# ---------- 엔트리 ----------
async def run_single_file(pdf_path: Path, comp_domain: str, k: int, min_conf: float, db: Session):
    rows = await faq_from_pdf(pdf_path, max_per_section=k, min_confidence=min_conf)
    save_rows_to_db(rows, comp_domain, db)
    print(f"[완료] {pdf_path.name}: {len(rows)}개 Q/A → DB 저장")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PDF → FAQ DB 저장")
    parser.add_argument("pdf_path", help="PDF 파일 경로")
    parser.add_argument("--domain", required=True, help="회사 도메인 (comp_domain)")
    parser.add_argument("--k", type=int, default=DEFAULT_MAX_PER_SECTION, help="섹션당 최대 Q/A 개수")
    parser.add_argument("--min_conf", type=float, default=MIN_CONFIDENCE, help="confidence 하한")
    args = parser.parse_args()

    db = next(get_db())
    p = Path(args.pdf_path)
    assert p.exists(), f"경로가 없습니다: {p}"

    asyncio.run(run_single_file(p, args.domain, args.k, args.min_conf, db))
    
    
router = APIRouter()

@router.post("/faqs/bulk-save")
async def bulk_save(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    comp_domain = current_user.comp_domain   # 로그인한 사용자의 회사 도메인
    sc_file = payload.get("file_id")         # 원래 파일명
    faqs = payload.get("faqs", [])

    if not sc_file or not faqs:
        return {"error": "file_id와 faqs는 필수입니다."}

    # 기존 데이터 지우고 새로 저장 (원하는 경우만)
    db.query(CompFAQ).filter(
        CompFAQ.comp_domain == comp_domain,
        CompFAQ.sc_file == sc_file
    ).delete()

    # 새 데이터 저장
    for row in faqs:
        q = str(row.get("q", "")).strip()
        a = str(row.get("a", "")).strip()
        if not q or not a:
            continue
        faq = CompFAQ(
            comp_domain=comp_domain,
            sc_file=sc_file,
            question=q,
            answer=a,
            ref_article=row.get("ref_article") or None,
            views=0
        )
        db.add(faq)
    db.commit()
    return {"status": "ok", "count": len(faqs)}
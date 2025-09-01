# backend/api/faq.py
from fastapi import APIRouter, Body, BackgroundTasks, Depends, HTTPException
import fitz  # PyMuPDF
import openai
import os
import glob
from typing import List, Optional

# === DB / 모델 ===
from sqlalchemy.orm import Session
from sqlalchemy import select  # ✅ 옵션 A 검증용
from db.session import get_db
from models.faq import CompFAQ
from models.company import Company  # ✅ 옵션 A 검증용

# === 벡터 인덱스 업서트 (배치 유틸 재사용) ===
#   backend/db/ingest_faq_to_faiss.py 에 정의됨
from db.ingest_faq_to_faiss import upsert_faqs_to_faiss

# === OpenAI 설정 ===
openai_api_key = os.getenv("OPENAI_API_KEY", "sk-...YOUR_KEY...")
openai_client = openai.OpenAI(api_key=openai_api_key)

router = APIRouter()
UPLOAD_DIR = "./uploaded_files"  # 실제 업로드 경로 유지

# === 옵션 A: 엄격 도메인 검증 스위치 ===
STRICT_DOMAIN = True  # 존재하지 않는 comp_domain이면 409로 차단

# ---------------------------
# 유틸: PDF 텍스트 추출
# ---------------------------
def extract_text_from_pdf_path(path: str) -> str:
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# ---------------------------
# 유틸: GPT에게 FAQ 생성 요청
# ---------------------------
def ask_gpt_for_faq(text: str) -> str:
    prompt = f"""
    다음은 회사 문서의 본문입니다. 이 내용을 요약하고, 주요 고객 질문(FAQ) 3~5개와 그에 대한 답변을 생성해 주세요.

    [본문]
    {text}

    [출력 예시]
    요약: ...
    FAQ:
    Q1: ...
    A1: ...
    Q2: ...
    A2: ...
    """
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
        temperature=0.2,
    )
    return response.choices[0].message.content

# ---------------------------
# 엔드포인트: 업로드 파일 → 요약/FAQ 생성
# ---------------------------
@router.post("/ai/extract-faq")
async def extract_faq(data: dict = Body(...)):
    """
    요청 예시:
    { "file_id": "abcd-1234" }
    """
    file_id = data.get("file_id")
    # 확장자 무관하게 file_id로 시작하는 파일 찾기
    files = glob.glob(os.path.join(UPLOAD_DIR, f"{file_id}.*"))
    if not files:
        return {"summary": "파일을 찾을 수 없습니다.", "faqs": []}

    file_path = files[0]
    text = extract_text_from_pdf_path(file_path)

    # 텍스트가 너무 길면 앞부분 일부만 사용 (토큰 초과 방지)
    max_chars = 6000
    if len(text) > max_chars:
        text = text[:max_chars]

    try:
        gpt_result = ask_gpt_for_faq(text)
        summary = gpt_result.split("FAQ:")[0].replace("요약:", "").strip()
        faqs = []
        try:
            faq_block = gpt_result.split("FAQ:")[1].strip()
            for qa in faq_block.split("Q")[1:]:
                if "A" in qa:
                    q, a = qa.split("A", 1)
                    faqs.append({"q": q.strip(" :\n"), "a": a.strip(" :\n")})
        except Exception as e:
            # 파싱 실패 시 전체 FAQ를 텍스트로 반환
            faqs = [{"q": "파싱 오류", "a": str(e)}]
        return {"summary": summary, "faqs": faqs}
    except Exception as e:
        # GPT 호출 실패 시 안내 메시지 반환
        return {"summary": "AI 요약/FAQ 생성 중 오류가 발생했습니다.", "faqs": [{"q": "오류", "a": str(e)}]}

# ---------------------------
# 스키마: FAQ 커밋 (프론트에서 저장 버튼 시 사용)
# ---------------------------
from pydantic import BaseModel

class FAQItemIn(BaseModel):
    qa_id: Optional[int] = None
    question: str
    answer: str
    ref_article: Optional[str] = None
    sc_file: Optional[str] = ""  # ✅ 각 항목의 출처 파일명/ID (없으면 공통 기본값 사용)

class FAQCommitIn(BaseModel):
    comp_domain: str
    items: List[FAQItemIn]
    source_file: Optional[str] = None  # ✅ 모든 항목에 공통으로 적용할 파일명/ID (예: 업로드된 file_id)

# ---------------------------
# 엔드포인트: FAQ 저장 → 임베딩/FAISS 업서트 (옵션 A: 엄격 도메인 검증 추가)
# ---------------------------
@router.post("/faq/commit")
def commit_faqs(payload: FAQCommitIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    """
    요청 예시:
    {
      "comp_domain": "example.com",
      "source_file": "handbook_v1.pdf",   # 선택(공통 기본값)
      "items": [
        {"qa_id": null, "question": "연차는 어떻게 쓰나요?", "answer": "연차는 ...", "ref_article": null, "sc_file": ""},
        {"qa_id": 12,   "question": "복장 규정?", "answer": "자유복 ...", "sc_file": "mydoc.pdf"}
      ]
    }
    - qa_id 가 있으면 UPDATE, 없으면 INSERT
    - DB 반영 직후, 백그라운드에서 해당 항목만 벡터화 → FAISS 업서트
    """
    # 0) comp_domain 정규화(공백 제거만; 케이스는 DB 값과 동일 사용)
    comp_domain = (payload.comp_domain or "").strip()
    if not comp_domain:
        raise HTTPException(status_code=400, detail="comp_domain is required")

    # 0-1) 옵션 A: 존재 도메인 엄격 검증 (없으면 409와 허용 도메인 목록 반환)
    if STRICT_DOMAIN:
        allowed_domains: List[str] = db.scalars(select(Company.comp_domain)).all()
        if comp_domain not in allowed_domains:
            # FK 오류가 나기 전에 미리, 깔끔하게 차단
            raise HTTPException(
                status_code=409,
                detail={
                    "msg": f"Unknown comp_domain: {comp_domain}",
                    "allowed_domains": allowed_domains,
                },
            )

    # sc_file 기본값: 항목에 없으면 공통값 사용, 그것도 없으면 'manual'
    default_sc_file = (payload.source_file or "").strip() or "manual"

    faq_ids: List[int] = []

    # 1) DB 반영
    for it in payload.items:
        sc_file_val = (it.sc_file or "").strip() or default_sc_file

        if it.qa_id:  # UPDATE
            row = db.query(CompFAQ).filter(CompFAQ.qa_id == it.qa_id).first()
            if not row:
                raise HTTPException(status_code=404, detail=f"QA {it.qa_id} not found")
            row.question    = it.question
            row.answer      = it.answer
            row.ref_article = it.ref_article
            row.sc_file     = sc_file_val   # ✅ NOT NULL 보장
            db.flush()
            faq_ids.append(row.qa_id)
        else:        # INSERT
            row = CompFAQ(
                comp_domain = comp_domain,
                question    = it.question,
                answer      = it.answer,
                ref_article = it.ref_article,
                sc_file     = sc_file_val,  # ✅ NOT NULL 보장
                views       = 0,
            )
            db.add(row)
            db.flush()  # qa_id 확보
            faq_ids.append(row.qa_id)

    db.commit()

    # 2) 비동기 벡터화 → FAISS 업서트
    #    (동일 id는 제거 후 재추가)
    bg.add_task(upsert_faqs_to_faiss, comp_domain, faq_ids)

    return {"ok": True, "faq_ids": faq_ids, "count": len(faq_ids)}

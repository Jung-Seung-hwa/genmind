
from fastapi import APIRouter, Body
import fitz  # PyMuPDF

import openai
import os
import glob

router = APIRouter()
UPLOAD_DIR = "./uploaded_files"  # 실제 업로드 경로에 맞게 수정


openai_api_key = os.getenv("OPENAI_API_KEY", "sk-...YOUR_KEY...")
openai_client = openai.OpenAI(api_key=openai_api_key)

def extract_text_from_pdf_path(path):
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def ask_gpt_for_faq(text):
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

@router.post("/ai/extract-faq")
async def extract_faq(data: dict = Body(...)):
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

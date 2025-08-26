from pathlib import Path
import os
from dotenv import load_dotenv, find_dotenv

# 현재 파일(api/) 기준으로 부모 폴더(backend)에 있는 .env를 자동 탐색
env_path = find_dotenv(usecwd=True)
if env_path:
    load_dotenv(env_path)
else:
    print("⚠️ .env 파일을 찾지 못했습니다.")

print("CWD:", os.getcwd())
print(".env path:", env_path or "NOT FOUND")
print("OPENAI_API_KEY exists? ", bool(os.getenv("OPENAI_API_KEY")))
print("LLM_MODEL =", os.getenv("LLM_MODEL"))
print("EMBEDDING_MODEL =", os.getenv("EMBEDDING_MODEL"))

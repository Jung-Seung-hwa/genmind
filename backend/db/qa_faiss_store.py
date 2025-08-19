from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from dotenv import load_dotenv
import os

# 환경변수 로드
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# 임베딩 및 LLM 준비
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)

# 벡터스토어 로드
store_dir = "db/vector_store/faiss_langchain"
vectorstore = FAISS.load_local(
    store_dir,
    embeddings=embeddings,
    allow_dangerous_deserialization=True
)

# 질의응답 체인 생성
qa = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever()
)

# 사용자 질문 입력
question = input("질문을 입력하세요: ")
answer = qa.run(question)
print("\n[답변]")
print(answer)
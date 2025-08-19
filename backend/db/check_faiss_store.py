from langchain_community.vectorstores import FAISS

store_dir = "db/vector_store/faiss_langchain"

vs = FAISS.load_local(
    store_dir,
    embeddings=None,
    allow_dangerous_deserialization=True  # ← 이 옵션 추가
)

print(f"총 문서(청크) 개수: {len(vs.docstore._dict)}")

for i, (k, v) in enumerate(vs.docstore._dict.items()):
    print(f"\n--- 문서 {i+1} ---")
    print(v.page_content[:300])
    if i >= 2:
        break
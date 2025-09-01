import React from "react";

export default function FaqUpload() {
  return <div>FAQ 업로드 페이지 (웹이 아닌 환경용 fallback)</div>;
}

// 공통 헬퍼 (원하는 곳에)
export async function commitFAQs({ baseUrl, comp_domain, qaList }) {
  const payload = {
    comp_domain,
    items: qaList.map(x => ({
      qa_id: x.qa_id ?? null,
      question: String(x.question || "").trim(),
      answer: String(x.answer || "").trim(),
      ref_article: x.ref_article ?? null,
    })),
  };

  const res = await fetch(`${baseUrl}/faq/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("commit failed");
  return res.json();
}

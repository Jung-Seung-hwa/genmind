# backend/schemas/faq.py
from pydantic import BaseModel
from typing import List, Optional

class FAQItemIn(BaseModel):
    qa_id: Optional[int] = None
    question: str
    answer: str
    ref_article: Optional[str] = None

class FAQCommitIn(BaseModel):
    comp_domain: str
    items: List[FAQItemIn]

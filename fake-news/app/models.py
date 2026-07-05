from pydantic import BaseModel, Field
from typing import Optional


class ExpertSettings(BaseModel):
    max_text_length: int = Field(default=50000, ge=100, le=200000, description="Max characters to analyze")
    max_claims: int = Field(default=3, ge=1, le=20, description="Max claims to extract")
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Similarity threshold for local judging")
    model_name: Optional[str] = Field(default=None, description="Override the LLM model name")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0, description="Override LLM temperature")


class ModelInfo(BaseModel):
    name: str = Field(description="Model name that responded")
    mode: str = Field(description="local or llm")


class AnalyzeRequest(BaseModel):
    text: Optional[str] = Field(None, description="Article text")
    url: Optional[str] = Field(None, description="Article URL")
    api_key: Optional[str] = Field(None, description="Optional LLM API key for this request")
    expert: Optional[ExpertSettings] = Field(None, description="Expert mode settings")


class Claim(BaseModel):
    text: str
    verdict: str
    confidence: float
    evidence: list[str]
    explanation: str


class ArticleInfo(BaseModel):
    title: str
    source: str
    text_preview: str


class AnalyzeResponse(BaseModel):
    article: ArticleInfo
    claims: list[Claim]
    overall_score: float
    overall_verdict: str
    summary: str
    warnings: list[str]
    mode: str
    model_info: Optional[ModelInfo] = None


class ErrorResponse(BaseModel):
    error: str

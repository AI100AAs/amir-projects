import json
import re
from typing import Generator
from app.models import Claim, ArticleInfo, AnalyzeResponse, ExpertSettings, ModelInfo
from app.llm_client import call_llm
from app.rag_engine import search_similar_claims


CLAIM_EXTRACTION_PROMPT = """You are a professional fact-checker. Extract the main factual claims from the following article. For each claim, output a JSON object.

Return a JSON object with this structure:
{{"claims": [{{"text": "The exact claim as stated or implied in the article"}}]}}

Extract up to 3 distinct factual claims. Focus on verifiable factual assertions, not opinions. If the article makes fewer claims, extract what is there."""

JUDGE_PROMPT = """You are an impartial AI judge evaluating the credibility of news claims. For each claim, you are given:
1. The claim itself
2. Top similar fact-checked claims from a verified knowledge base (with their verdicts and sources)

Your job: determine if the claim is TRUE, FALSE, or MISLEADING, and provide reasoning.

Return a JSON object with this structure:
{{"verdict": "true", "confidence": 0.85, "explanation": "Clear reasoning", "evidence": ["Source 1", "Source 2"]}}

Guidelines:
- TRUE: supported by reliable evidence and matches verified knowledge
- FALSE: contradicts verifiable facts or is a known disinformation claim
- MISLEADING: contains elements of truth but is presented deceptively or lacks context
- Confidence: 0.0 to 1.0
- Be objective. Do not favor any political agenda. Base judgments on evidence.
- If evidence is insufficient, say so and set low confidence.

CONTEXT:
{context}"""

WARNINGS_PROMPT = """Based on the article text and the fact-check results, identify any potential issues:
- Hallucination risks (claims that seem fabricated)
- Source bias indicators
- Emotional manipulation language
- Lack of verifiable sources

Return a JSON object with a single key "warnings" containing a list of strings.
Example: {{"warnings": ["Article uses emotionally charged language (\"shocking\", \"outrageous\")", "Claims lack citations to verifiable sources"]}}

Return an empty array if no significant warnings."""


EMOTIONAL_KEYWORDS = {
    "shocking", "unbelievable", "outrageous", "mind-blowing", "you won't believe",
    "they don't want you to know", "must read", "absolutely", "devastating",
    "nightmare", "scandal", "cover-up", "exposed", "hidden truth", "wake up",
    "conspiracy", "they are hiding", "mainstream media won't tell you",
    "what they don't want you to know", "censored", "banned", "secret",
    "they lied", "fraud", "corrupt", "rigged", "stolen",
}


def _extract_claims_local(text: str, max_claims: int = 3) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    claims = []
    seen = set()
    for s in sentences:
        s = s.strip().strip('"').strip("'")
        if not s:
            continue
        if len(s) < 15 or len(s) > 500:
            continue
        if s.endswith("?") or s.endswith("?"):
            continue
        norm = s.lower().strip(".")
        skip_prefixes = (
            "for example", "in addition", "moreover", "however",
            "therefore", "meanwhile", "nevertheless", "consequently",
            "furthermore", "on the other hand", "as a result", "in fact",
        )
        if any(norm.startswith(p) for p in skip_prefixes):
            continue
        if norm not in seen and len(norm) > 10:
            seen.add(norm)
            claims.append(s)
        if len(claims) >= max_claims:
            break
    return claims


def _judge_claim_local(claim_text: str, similarity_threshold: float = 0.7) -> tuple[str, float, list[str], str]:
    similar = search_similar_claims(claim_text, n_results=5)
    if not similar:
        return "unverifiable", 0.0, [], "No matching claims found in the knowledge base."

    best = similar[0]
    dist = best["distance"]
    close_threshold = 1.0 - similarity_threshold
    partial_threshold = 1.0 - (similarity_threshold * 0.6)

    if dist < close_threshold:
        verdict = best["verdict"]
        confidence = round(max(0.5, 1.0 - dist), 2)
        explanation = (
            f"Closely matches a known {best['verdict']} claim in the knowledge base. "
            f"The verified claim is: \"{best['claim']}\" (source: {best['source']})."
        )
    elif dist < partial_threshold:
        verdict = best["verdict"]
        confidence = round(max(0.3, 1.0 - dist), 2)
        explanation = (
            f"Partially similar to a known {best['verdict']} claim. "
            f"Similar claim: \"{best['claim']}\" (source: {best['source']}). "
            "Confidence is moderate due to limited direct overlap."
        )
    else:
        verdict = "unverifiable"
        confidence = 0.2
        explanation = (
            f"No closely matching claim found in the knowledge base. "
            f"The closest match is \"{best['claim']}\" (distance: {dist:.2f}), "
            "which is too dissimilar for a confident verdict."
        )

    evidence = []
    for s in similar[:3]:
        evidence.append(f"\"{s['claim']}\" → {s['verdict']} ({s['source']})")
    return verdict, confidence, evidence, explanation


def _compute_warnings_local(text: str) -> list[str]:
    warnings = []
    lowered = text.lower()
    emo_found = [w for w in EMOTIONAL_KEYWORDS if w in lowered]
    if emo_found:
        warnings.append(f"Emotional or sensational language detected: {', '.join(emo_found[:4])}")
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    if len(sentences) < 3:
        warnings.append("Very short text — may not contain enough substance for meaningful analysis.")
    if len(text) < 100:
        warnings.append("Text is extremely brief; results may be unreliable.")
    if not warnings:
        warnings.append("No significant red flags detected at the surface level.")
    return warnings


def _parse_json(text: str) -> dict:
    if not text:
        raise RuntimeError("Empty LLM response")
    text = text.strip()
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl != -1:
            text = text[first_nl + 1:]
        closing = text.rfind("```")
        if closing != -1:
            text = text[:closing]
        text = text.strip()
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        text = text[brace_start:brace_end + 1]
    text = re.sub(r",\s*}", "}", text)
    text = re.sub(r",\s*]", "]", text)
    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass
    text = re.sub(r"'", '"', text)
    text = re.sub(r"(?<!\\)\\(?![\\\"\/bfnrtu])", "", text)
    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass
    raise RuntimeError(f"Failed to parse LLM response as JSON object. Response:\n{text[:500]}")


def _extract_claims_llm(text: str, api_key: str, model: str | None = None, temperature: float | None = None, max_claims: int = 3) -> tuple[list[str], str]:
    raw, model_used, _ = call_llm(CLAIM_EXTRACTION_PROMPT, text, api_key=api_key, model=model, temperature=temperature)
    data = _parse_json(raw)
    claims = [c.get("text") or c.get("claim", "") for c in data.get("claims", [])]
    return claims[:max_claims], model_used


def _judge_claim_llm(
    claim_text: str, api_key: str,
    model: str | None = None, temperature: float | None = None
) -> tuple[str, float, list[str], str]:
    similar = search_similar_claims(claim_text, n_results=5)
    context_parts = ["Similar verified claims from knowledge base:"]
    for s in similar:
        context_parts.append(
            f"- \"{s['claim']}\" → Verdict: {s['verdict']} (source: {s['source']}, "
            f"distance: {s['distance']:.3f})"
        )
    context = "\n".join(context_parts)
    prompt = JUDGE_PROMPT.format(context=context)
    raw, _, _ = call_llm(prompt, f"Claim: {claim_text}\n\nContext from knowledge base:\n{context}", api_key=api_key, model=model, temperature=temperature)
    data = _parse_json(raw)
    verdict = data.get("verdict", "unverifiable").lower()
    confidence = float(data.get("confidence", 0.0))
    evidence = data.get("evidence", [])
    explanation = data.get("explanation", "No explanation provided.")
    return verdict, confidence, evidence, explanation


def _compute_warnings_llm(text: str, api_key: str, model: str | None = None, temperature: float | None = None) -> list[str]:
    try:
        raw, _, _ = call_llm(WARNINGS_PROMPT, text, api_key=api_key, model=model, temperature=temperature)
        data = _parse_json(raw)
        return data.get("warnings", [])
    except Exception:
        return ["Could not analyze warnings — LLM unavailable."]


def analyze_article_stream(
    article: ArticleInfo, full_text: str, api_key: str = "",
    expert: ExpertSettings | None = None,
) -> Generator[dict, None, None]:
    use_llm = bool(api_key)
    mode = "llm" if use_llm else "local"

    if expert is None:
        expert = ExpertSettings()

    text_slice = full_text[:expert.max_text_length]
    max_claims = expert.max_claims
    similarity_threshold = expert.similarity_threshold
    model_override = expert.model_name
    temperature_override = expert.temperature

    yield {"type": "mode", "mode": mode}
    model_used = None

    yield {"type": "status", "message": "Extracting factual claims from article..."}
    if use_llm:
        claim_texts, model_used = _extract_claims_llm(
            text_slice, api_key, model=model_override, temperature=temperature_override, max_claims=max_claims
        )
    else:
        model_used = "sentence-transformers/all-MiniLM-L6-v2"
        claim_texts = _extract_claims_local(text_slice, max_claims=max_claims)

    if not claim_texts:
        yield {"type": "status", "message": "No extractable claims found."}
    else:
        yield {"type": "status", "message": f"Found {len(claim_texts)} claim(s) to verify."}

    claims: list[Claim] = []
    for i, ct in enumerate(claim_texts):
        yield {"type": "claim_start", "index": i + 1, "total": len(claim_texts), "text": ct}
        yield {"type": "status", "message": f"Searching knowledge base for claim {i + 1}..."}

        if use_llm:
            verdict, confidence, evidence, explanation = _judge_claim_llm(
                ct, api_key, model=model_override, temperature=temperature_override
            )
        else:
            verdict, confidence, evidence, explanation = _judge_claim_local(ct, similarity_threshold=similarity_threshold)

        claims.append(Claim(
            text=ct,
            verdict=verdict,
            confidence=confidence,
            evidence=evidence,
            explanation=explanation,
        ))

        yield {"type": "claim_result", "index": i + 1, "total": len(claim_texts),
               "text": ct, "verdict": verdict, "confidence": confidence,
               "evidence": evidence, "explanation": explanation}

    yield {"type": "status", "message": "Computing overall credibility score..."}

    if claims:
        score_map = {"true": 1.0, "misleading": 0.4, "false": 0.1, "unverifiable": 0.3}
        scores = [score_map.get(c.verdict, 0.3) * c.confidence for c in claims]
        overall_score = round(sum(scores) / len(scores), 2)
    else:
        overall_score = 0.0

    if overall_score >= 0.7:
        overall_verdict = "likely credible"
    elif overall_score >= 0.4:
        overall_verdict = "mixed / needs verification"
    else:
        overall_verdict = "likely not credible"

    true_count = sum(1 for c in claims if c.verdict == "true")
    false_count = sum(1 for c in claims if c.verdict == "false")
    misleading_count = sum(1 for c in claims if c.verdict == "misleading")
    unverifiable_count = sum(1 for c in claims if c.verdict == "unverifiable")

    summary_parts = []
    if true_count:
        summary_parts.append(f"{true_count} claim(s) found true")
    if false_count:
        summary_parts.append(f"{false_count} claim(s) found false")
    if misleading_count:
        summary_parts.append(f"{misleading_count} claim(s) found misleading")
    if unverifiable_count:
        summary_parts.append(f"{unverifiable_count} claim(s) unverifiable")
    summary = ", ".join(summary_parts) if summary_parts else "No claims could be verified"

    yield {"type": "status", "message": "Analyzing for potential issues..."}

    if use_llm:
        warnings = _compute_warnings_llm(text_slice, api_key, model=model_override, temperature=temperature_override)
    else:
        warnings = _compute_warnings_local(text_slice)
    if not claim_texts:
        warnings.append("No extractable claims found in the text.")

    result = AnalyzeResponse(
        article=article,
        claims=claims,
        overall_score=overall_score,
        overall_verdict=overall_verdict,
        summary=summary,
        warnings=warnings,
        mode=mode,
        model_info=ModelInfo(name=model_used or "unknown", mode=mode),
    )

    yield {"type": "done", "result": result.model_dump()}


def analyze_article(
    article: ArticleInfo, full_text: str, api_key: str = "",
    expert: ExpertSettings | None = None,
) -> AnalyzeResponse:
    result_data = None
    for event in analyze_article_stream(article, full_text, api_key, expert=expert):
        if event["type"] == "done":
            result_data = event["result"]
    if result_data is None:
        raise RuntimeError("Analysis produced no result")
    return AnalyzeResponse(**result_data)

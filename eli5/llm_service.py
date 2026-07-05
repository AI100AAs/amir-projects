"""
Robust LLM service with retry logic, graceful degradation,
and sophisticated prompting for summarization, linking, and ethics.
"""

import os
import re
import json
import time
import requests
from urllib.parse import urlparse
from typing import Dict, List, Tuple, Optional

def get_llm_config() -> Dict[str, str]:
    """Get LLM configuration from environment variables."""
    return {
        'api_key': os.environ.get('LLM_API_KEY', ''),
        'api_url': os.environ.get('LLM_API_URL', 'https://api.openai.com/v1/chat/completions'),
        'model': os.environ.get('LLM_MODEL', 'gpt-4o-mini'),
    }

def _is_local_endpoint(url: str) -> bool:
    """Check if the endpoint is a local server (LM Studio, Ollama, etc.)."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ''
        return hostname in ('localhost', '127.0.0.1', '0.0.0.0', '::1')
    except Exception:
        return False

def is_configured() -> bool:
    """Return True if we have a valid API key OR a local endpoint."""
    config = get_llm_config()
    return bool(config['api_key']) or _is_local_endpoint(config['api_url'])

def call_llm(messages: list, temperature: float = 0.3, max_retries: int = 3) -> str:
    """Call the LLM API with retry logic. Supports OpenAI, LM Studio, Ollama, and other local servers."""
    config = get_llm_config()
    is_local = _is_local_endpoint(config['api_url'])

    # For cloud APIs we need a key; for local servers we don't
    if not config['api_key'] and not is_local:
        return "MOCK_RESPONSE"

    headers = {'Content-Type': 'application/json'}
    if config['api_key']:
        headers['Authorization'] = f'Bearer {config["api_key"]}'

    payload = {
        'model': config['model'],
        'messages': messages,
        'temperature': temperature,
        'max_tokens': 2000
    }

    # Local models are often slower — give them more time
    timeout = 120 if is_local else 60

    last_error = None
    for attempt in range(max_retries):
        try:
            response = requests.post(
                config['api_url'],
                headers=headers,
                json=payload,
                timeout=timeout
            )
            response.raise_for_status()
            data = response.json()

            # Some local servers return empty choices when model is loading
            choices = data.get('choices', [])
            if not choices:
                last_error = "LLM returned empty choices (model may still be loading)"
                time.sleep(3)
                continue

            content = choices[0].get('message', {}).get('content', '')
            if not content:
                last_error = "LLM returned empty content"
                time.sleep(2 ** attempt)
                continue

            return content
        except requests.exceptions.ConnectionError:
            last_error = f"Cannot connect to LLM at {config['api_url']}. Is LM Studio running?"
            time.sleep(2 ** attempt)
        except requests.exceptions.Timeout:
            last_error = "LLM API timeout"
            time.sleep(2 ** attempt)
        except requests.exceptions.HTTPError as e:
            last_error = f"LLM API HTTP error: {e.response.status_code}"
            if e.response.status_code == 429:
                time.sleep(2 ** attempt)
            elif e.response.status_code >= 500:
                time.sleep(2 ** attempt)
            else:
                break  # Don't retry client errors
        except Exception as e:
            last_error = f"LLM API error: {e}"
            time.sleep(2 ** attempt)

    print(f"LLM call failed after {max_retries} retries: {last_error}")
    return "MOCK_RESPONSE"

def _extract_json(text: str) -> Optional[Dict]:
    """Robustly extract JSON from LLM response text."""
    text = text.strip()

    # Try markdown code blocks
    patterns = [
        r'```json\s*(.*?)\s*```',
        r'```\s*(.*?)\s*```',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue

    # Try finding JSON object directly
    # Find outermost braces
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass

    # Try finding JSON array
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass

    return None

def summarize_article_eli5(title: str, text: str) -> Tuple[str, float, float, List[str]]:
    """
    Summarize an article into ELI5 format.
    Returns: (eli5_summary, confidence_level, modification_level, topics)
    """
    # Truncate very long texts
    max_chars = 6000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n...[truncated]"

    prompt = f"""You are an expert at explaining complex news in simple terms (ELI5 - Explain Like I'm 5).

Task: Summarize the following news article in a way that a 5-year-old could understand.
Rules:
- Use simple words, short sentences, and analogies to everyday life
- Keep it under 150 words
- Preserve the core facts but remove jargon
- Do NOT add information not in the original
- Do NOT include phrases like "Imagine someone told you..." — just explain directly

Article Title: {title}
Article Text: {text}

Respond ONLY in this JSON format:
{{
    "eli5_summary": "...",
    "confidence": 0.85,
    "modification": 0.40,
    "topics": ["topic1", "topic2", "topic3"]
}}

Where:
- confidence: 0.0-1.0 score for how sure you are the summary accurately reflects the original
- modification: 0.0-1.0 score for how much simplification/changing of meaning was required
- topics: 3-5 relevant topic tags"""

    response = call_llm([
        {"role": "system", "content": "You are a helpful assistant that summarizes news for children. Always respond with valid JSON only. No extra text."},
        {"role": "user", "content": prompt}
    ])

    if response == "MOCK_RESPONSE":
        return _mock_summary(title, text)

    data = _extract_json(response)
    if data and isinstance(data, dict):
        return (
            data.get('eli5_summary', 'Summary unavailable.'),
            float(data.get('confidence', 0.5)),
            float(data.get('modification', 0.5)),
            data.get('topics', ['uncategorized'])
        )

    # Fallback: return raw response truncated
    print(f"Failed to parse summary JSON. Raw: {response[:200]}")
    return (response[:500], 0.5, 0.5, ['uncategorized'])

def _mock_summary(title: str, text: str) -> Tuple[str, float, float, List[str]]:
    """Generate a contextual mock summary based on the actual text."""
    text_lower = text.lower()
    topics = []

    # Simple keyword-based topic extraction for mock mode
    keyword_topics = {
        'climate': ['climate', 'warming', 'temperature', 'emission', 'carbon', 'greenhouse'],
        'politics': ['government', 'president', 'election', 'vote', 'policy', 'law', 'senate', 'congress'],
        'technology': ['ai', 'software', 'computer', 'internet', 'app', 'algorithm', 'tech'],
        'health': ['hospital', 'disease', 'vaccine', 'medical', 'health', 'covid', 'pandemic'],
        'science': ['nasa', 'mars', 'space', 'research', 'study', 'scientist', 'discovery'],
        'economy': ['market', 'stock', 'inflation', 'recession', 'economy', 'trade', 'money'],
        'environment': ['pollution', 'forest', 'ocean', 'wildlife', 'nature', 'renewable'],
    }

    for topic, keywords in keyword_topics.items():
        if any(kw in text_lower for kw in keywords):
            topics.append(topic)

    if not topics:
        topics = ['news', 'general']

    # Generate a simple contextual summary
    sentences = text.split('.')
    first_sentence = sentences[0].strip() if sentences else text[:100]
    if len(first_sentence) > 200:
        first_sentence = first_sentence[:200] + "..."

    summary = (
        f"This news is about {title.lower()}. "
        f"{first_sentence}. "
        f"In simple words: something important happened, and people are talking about what it means. "
        f"The big idea is that this could change how things work in the future."
    )

    return (summary, 0.65, 0.45, topics)

def find_article_links(new_article: Dict, existing_articles: List[Dict]) -> List[Dict]:
    """
    Find links between a new article and existing articles using LLM.
    Returns list of link dicts.
    """
    if not existing_articles:
        return []

    # Limit context to prevent token overflow
    existing_summary = "\n\n".join([
        f"Article {a['id']}: {a['title']}\nTopics: {', '.join(a.get('topics', []))}"
        for a in existing_articles[:15]
    ])

    prompt = f"""Analyze connections between news articles.

New Article: {new_article['title']}
New Article Summary: {new_article.get('eli5_summary', 'N/A')[:300]}
New Article Topics: {', '.join(new_article.get('topics', []))}

Existing Articles:
{existing_summary}

Task: Identify meaningful links. Link types:
- 'update': New information about the same ongoing story/event
- 'contradiction': Information that conflicts with or challenges the existing article
- 'related': Same broad topic area, adds context
- 'similar_topic': Shares themes or subject matter

For each link, provide ONLY these fields:
- target_article_id: integer ID
- link_type: one of the types above
- description: 1-sentence explanation
- confidence: 0.0-1.0

Respond ONLY as a JSON array. Empty array [] if no strong links."""

    response = call_llm([
        {"role": "system", "content": "You are a news analyst. Respond with valid JSON array only. No markdown formatting. No extra text."},
        {"role": "user", "content": prompt}
    ], temperature=0.2)

    if response == "MOCK_RESPONSE":
        return _mock_links(new_article, existing_articles)

    data = _extract_json(response)
    if data and isinstance(data, list):
        # Validate and filter
        valid = []
        for link in data:
            if isinstance(link, dict) and 'target_article_id' in link:
                valid.append({
                    'target_article_id': int(link['target_article_id']),
                    'link_type': link.get('link_type', 'related'),
                    'description': link.get('description', 'Related article'),
                    'confidence': min(max(float(link.get('confidence', 0.5)), 0.0), 1.0)
                })
        return valid

    print(f"Failed to parse link JSON. Raw: {response[:200]}")
    return []

def _mock_links(new_article: Dict, existing_articles: List[Dict]) -> List[Dict]:
    """Generate semantic links based on topic overlap for mock mode."""
    links = []
    new_topics = set(new_article.get('topics', []))
    for article in existing_articles:
        existing_topics = set(article.get('topics', []))
        overlap = new_topics & existing_topics
        if len(overlap) >= 2:
            links.append({
                'target_article_id': article['id'],
                'link_type': 'related',
                'description': f"Shares topics: {', '.join(overlap)}",
                'confidence': min(0.5 + 0.1 * len(overlap), 0.9)
            })
    return links

def generate_ethical_analysis(article_text: str, summary: str) -> Dict[str, str]:
    """Generate ethical considerations for an article."""
    text_preview = article_text[:800]
    summary_preview = summary[:400]

    prompt = f"""Analyze this news article and its ELI5 summary for ethical concerns. Be concise.

Original (excerpt): {text_preview}
ELI5 Summary: {summary_preview}

Provide brief analysis (1-2 sentences each):
1. potential_bias: What viewpoints might be missing or favored?
2. missing_context: What important details were lost in simplification?
3. reliability_concern: What should readers verify independently?
4. echo_chamber_risk: Could this reinforce existing beliefs?

Respond ONLY in this JSON format:
{{
    "potential_bias": "...",
    "missing_context": "...",
    "reliability_concern": "...",
    "echo_chamber_risk": "..."
}}"""

    response = call_llm([
        {"role": "system", "content": "You are a media literacy expert. Respond with valid JSON only."},
        {"role": "user", "content": prompt}
    ], temperature=0.3)

    if response == "MOCK_RESPONSE":
        return _mock_ethics()

    data = _extract_json(response)
    if data and isinstance(data, dict):
        return {
            "potential_bias": data.get('potential_bias', 'Unable to analyze.'),
            "missing_context": data.get('missing_context', 'Unable to analyze.'),
            "reliability_concern": data.get('reliability_concern', 'Please verify independently.'),
            "echo_chamber_risk": data.get('echo_chamber_risk', 'Consider diverse sources.')
        }

    return _mock_ethics()

def _mock_ethics() -> Dict[str, str]:
    return {
        "potential_bias": "This summary may unintentionally favor the most commonly reported perspective.",
        "missing_context": "Simplified versions remove nuanced details about motivations and historical background.",
        "reliability_concern": "Without checking original sources, readers cannot verify if key facts were preserved accurately.",
        "echo_chamber_risk": "If the user only sees similar summaries, they may miss alternative interpretations."
    }

def generate_link_explanation(article_a: Dict, article_b: Dict, link_type: str) -> str:
    """Generate a human-readable explanation of why two articles are linked."""
    prompt = f"""Explain the connection between these two news articles in one sentence.

Article A: {article_a['title']}
Summary A: {article_a.get('eli5_summary', 'N/A')[:200]}

Article B: {article_b['title']}
Summary B: {article_b.get('eli5_summary', 'N/A')[:200]}

Link type: {link_type}

Respond with a single sentence explanation."""

    response = call_llm([
        {"role": "system", "content": "You are a concise news analyst."},
        {"role": "user", "content": prompt}
    ], temperature=0.3)

    if response == "MOCK_RESPONSE":
        return f"These articles share related themes and may provide context on each other."

    # Clean up response
    explanation = response.strip().strip('"').strip("'")
    if not explanation.endswith('.'):
        explanation += '.'
    return explanation

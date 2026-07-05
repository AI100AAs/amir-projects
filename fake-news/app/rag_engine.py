import json
import time
import httpx
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from app.config import DATA_DIR, CHROMA_COLLECTION, EMBEDDING_MODEL
from app.datasets import SEED_CLAIMS
from typing import Any


_embedder: Any = None
_client: Any = None
_collection: Any = None

FACTCHECK_API = "https://toolbox.google.com/factcheck/api/v1/claimsearch"


def _get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
    return _embedder


def _try_fetch_factchecks(query: str, max_results: int = 20) -> list[dict]:
    """Fetch fact-checks from Google Fact Check Tools API. Returns [] on failure."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(FACTCHECK_API, params={"query": query, "max_results": max_results})
            if resp.status_code != 200:
                return []
            data = resp.json()
            claims = []
            for item in data.get("claims", []):
                text = item.get("text", "")
                if not text:
                    continue
                # Determine verdict from the first review
                reviews = item.get("claimReview", [])
                verdict = "misleading"
                source = "Google Fact Check"
                for r in reviews:
                    rating = (r.get("textualRating", "") or "").lower()
                    source = r.get("publisher", {}).get("name", source)
                    if "true" in rating or "correct" in rating or "accurate" in rating:
                        verdict = "true"
                    elif "false" in rating or "incorrect" in rating or "fake" in rating:
                        verdict = "false"
                    elif "misleading" in rating or "mostly false" in rating or "half true" in rating:
                        verdict = "misleading"
                    elif "unverifiable" in rating or "not proven" in rating:
                        verdict = "unverifiable"
                claims.append({
                    "claim": text[:500],
                    "verdict": verdict,
                    "source": source,
                    "category": "factcheck",
                })
            return claims
    except Exception:
        return []


def _try_seed_from_api():
    """Try to augment seed claims with results from Fact Check API queries."""
    topics = ["covid", "vaccine", "climate", "election", "immigration", "crime", "economy", "health", "science", "technology"]
    extra = []
    seen = set()
    for topic in topics:
        results = _try_fetch_factchecks(topic, 15)
        for r in results:
            norm = r["claim"].lower().strip()
            if norm not in seen and len(norm) > 20:
                seen.add(norm)
                extra.append(r)
        time.sleep(0.5)  # be polite
    return extra


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(
            path=str(DATA_DIR / "chroma"),
            settings=Settings(anonymized_telemetry=False),
        )
        existing = _client.list_collections()
        names = [c.name for c in existing]
        if CHROMA_COLLECTION in names:
            _collection = _client.get_collection(CHROMA_COLLECTION)
        else:
            _collection = _client.create_collection(CHROMA_COLLECTION)
            _seed_data()
    return _collection


def _seed_data():
    if _collection is None:
        return
    all_claims = list(SEED_CLAIMS)

    # Try to enrich from Google Fact Check API
    try:
        api_claims = _try_seed_from_api()
        if api_claims:
            all_claims.extend(api_claims)
    except Exception:
        pass

    embedder = _get_embedder()
    texts = [c["claim"] for c in all_claims]
    ids = [f"seed_{i}" for i in range(len(all_claims))]
    metadatas = [
        {"verdict": c["verdict"], "source": c.get("source", ""), "category": c.get("category", "")}
        for c in all_claims
    ]
    embeddings = embedder.encode(texts).tolist()
    _collection.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=texts)


def search_similar_claims(query: str, n_results: int = 5) -> list[dict]:
    collection = _get_collection()
    embedder = _get_embedder()
    query_emb = embedder.encode([query]).tolist()
    results = collection.query(query_embeddings=query_emb, n_results=n_results)
    items = []
    for i in range(len(results["ids"][0])):
        items.append({
            "id": results["ids"][0][i],
            "claim": results["documents"][0][i],
            "verdict": results["metadatas"][0][i].get("verdict", "unknown"),
            "source": results["metadatas"][0][i].get("source", ""),
            "category": results["metadatas"][0][i].get("category", ""),
            "distance": results["distances"][0][i] if results.get("distances") else 0,
        })
    return items


def rebuild_index():
    global _collection, _client
    if _client is not None:
        try:
            _client.delete_collection(CHROMA_COLLECTION)
        except Exception:
            pass
    _collection = None
    _get_collection()

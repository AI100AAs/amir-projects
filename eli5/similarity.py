"""
Semantic similarity engine for article linking using TF-IDF and cosine similarity.
Provides a fast, local, deterministic way to find related articles.
"""

import pickle
import numpy as np
from typing import List, Dict, Tuple, Optional

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

def compute_similarities(new_article_text: str, existing_articles: List[Dict],
                         threshold: float = 0.15) -> List[Tuple[int, float]]:
    """
    Compute TF-IDF cosine similarity between a new article and existing ones.
    Returns list of (article_id, similarity_score) above threshold.
    """
    if not HAS_SKLEARN or not existing_articles:
        return []

    texts = [a['original_text'] for a in existing_articles]
    texts.append(new_article_text)

    try:
        vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.95
        )
        tfidf_matrix = vectorizer.fit_transform(texts)

        new_vec = tfidf_matrix[-1]
        existing_vecs = tfidf_matrix[:-1]

        similarities = cosine_similarity(new_vec, existing_vecs).flatten()

        results = []
        for i, score in enumerate(similarities):
            if score >= threshold:
                results.append((existing_articles[i]['id'], float(score)))

        return sorted(results, key=lambda x: x[1], reverse=True)
    except Exception as e:
        print(f"Similarity computation error: {e}")
        return []

def serialize_vector(vector: np.ndarray) -> bytes:
    """Serialize a numpy array to bytes for SQLite storage."""
    return pickle.dumps(vector)

def deserialize_vector(data: bytes) -> Optional[np.ndarray]:
    """Deserialize bytes back to numpy array."""
    try:
        return pickle.loads(data)
    except Exception:
        return None

def compute_all_pairwise_similarities(articles: List[Dict],
                                       threshold: float = 0.2) -> List[Dict]:
    """
    Compute all pairwise similarities for a set of articles.
    Returns link-like dicts for pairs above threshold.
    """
    if not HAS_SKLEARN or len(articles) < 2:
        return []

    texts = [a['original_text'] for a in articles]
    ids = [a['id'] for a in articles]

    try:
        vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.95
        )
        tfidf_matrix = vectorizer.fit_transform(texts)
        sim_matrix = cosine_similarity(tfidf_matrix)

        links = []
        n = len(articles)
        for i in range(n):
            for j in range(i + 1, n):
                score = sim_matrix[i, j]
                if score >= threshold:
                    links.append({
                        'source_article_id': ids[i],
                        'target_article_id': ids[j],
                        'link_type': 'semantic',
                        'description': f"Semantically similar content (score: {score:.2f})",
                        'confidence': min(float(score), 1.0),
                        'method': 'semantic'
                    })
        return links
    except Exception as e:
        print(f"Pairwise similarity error: {e}")
        return []

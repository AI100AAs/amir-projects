"""
ELI5 News Database - Main Flask Application
Robust REST API with validation, error handling, and modern features.
Supports OpenAI, LM Studio, Ollama, and other OpenAI-compatible local LLMs.
"""

import os
import json
import re
from datetime import datetime
from functools import wraps

from dotenv import load_dotenv
load_dotenv()  # Load .env file before any env reads

from flask import Flask, request, jsonify, render_template
from flask import Response

from database import (
    init_db, add_article, get_all_articles, get_article,
    update_article_summary, add_link, get_links_for_article,
    delete_article, search_articles, get_stats, get_topic_distribution,
    get_articles_by_ids, get_all_links as db_get_all_links
)
from llm_service import (
    summarize_article_eli5, find_article_links,
    generate_ethical_analysis, is_configured
)
from url_fetcher import fetch_article, is_valid_url, estimate_reading_time
from similarity import compute_similarities, compute_all_pairwise_similarities

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['JSON_SORT_KEYS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size

# Initialize database
init_db()

# ─── Error Handling ─────────────────────────────────────────────────────────

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request', 'message': str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found', 'message': str(e)}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error', 'message': 'Something went wrong'}), 500

# ─── Validation Helpers ───────────────────────────────────────────────────────

def validate_article_input(data: dict) -> tuple:
    """Validate article input. Returns (is_valid, error_message)."""
    title = data.get('title', '').strip()
    text = data.get('text', '').strip()

    if not title:
        return False, "Title is required"
    if len(title) > 500:
        return False, "Title too long (max 500 characters)"
    if not text:
        return False, "Article text is required"
    if len(text) < 50:
        return False, "Article text too short (min 50 characters)"
    if len(text) > 50000:
        return False, "Article text too long (max 50000 characters)"

    source_url = data.get('source_url', '').strip()
    if source_url and not is_valid_url(source_url):
        return False, "Invalid source URL"

    return True, None

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config', methods=['GET'])
def get_config():
    """Return current LLM config (without API key for security)."""
    api_url = os.environ.get('LLM_API_URL', 'https://api.openai.com/v1/chat/completions')
    model = os.environ.get('LLM_MODEL', 'gpt-4o-mini')
    is_local = any(h in api_url for h in ('localhost', '127.0.0.1', '0.0.0.0'))
    return jsonify({
        'api_url': api_url,
        'model': model,
        'has_api_key': is_configured(),
        'demo_mode': not is_configured(),
        'is_local': is_local,
        'provider': 'LM Studio' if is_local else 'OpenAI / Cloud'
    })

@app.route('/api/stats', methods=['GET'])
def api_stats():
    """Get database statistics."""
    return jsonify(get_stats())

@app.route('/api/topics', methods=['GET'])
def api_topics():
    """Get topic distribution."""
    return jsonify(get_topic_distribution())

@app.route('/api/articles', methods=['GET'])
def get_articles():
    """List all articles with optional pagination."""
    limit = request.args.get('limit', type=int)
    offset = request.args.get('offset', 0, type=int)
    articles = get_all_articles(limit=limit, offset=offset)
    return jsonify(articles)

@app.route('/api/articles/search', methods=['GET'])
def search_articles_endpoint():
    """Search articles by query string."""
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return jsonify({'error': 'Query too short'}), 400
    results = search_articles(query, limit=50)
    return jsonify(results)

@app.route('/api/articles', methods=['POST'])
def create_article():
    """Create a new article with ELI5 summarization and linking."""
    data = request.get_json(silent=True) or {}

    # Handle URL import mode
    url = data.get('url', '').strip()
    if url:
        if not is_valid_url(url):
            return jsonify({'error': 'Invalid URL'}), 400
        try:
            title, text = fetch_article(url)
            source_url = url
        except Exception as e:
            return jsonify({'error': f'Failed to fetch article: {str(e)}'}), 400
    else:
        title = data.get('title', '').strip()
        text = data.get('text', '').strip()
        source_url = data.get('source_url', '').strip()

        is_valid, error = validate_article_input(data)
        if not is_valid:
            return jsonify({'error': error}), 400

    # Compute reading stats
    word_count = len(text.split())
    reading_time = estimate_reading_time(text)

    # Add article to DB
    article_id = add_article(
        title=title,
        original_text=text,
        source_url=source_url,
        reading_time=reading_time,
        word_count=word_count
    )

    # Generate ELI5 summary
    summary, confidence, modification, topics = summarize_article_eli5(title, text)

    # Generate ethical analysis
    ethical = generate_ethical_analysis(text, summary)

    # Update article with generated data
    update_article_summary(
        article_id, summary, confidence, modification,
        topics, ethical, reading_time, word_count
    )

    # Find semantic similarities (local, fast, deterministic)
    existing_articles = [a for a in get_all_articles() if a['id'] != article_id]
    semantic_links = compute_similarities(text, existing_articles, threshold=0.15)

    for target_id, sim_score in semantic_links:
        add_link(
            article_id, target_id, 'semantic',
            f"Semantically similar content (similarity: {sim_score:.2f})",
            min(sim_score, 1.0), method='semantic'
        )

    # Find LLM-based links (semantic understanding)
    new_article = {
        'id': article_id,
        'title': title,
        'eli5_summary': summary,
        'topics': topics
    }
    llm_links = find_article_links(new_article, existing_articles)

    for link in llm_links:
        add_link(
            article_id, link['target_article_id'], link['link_type'],
            link['description'], link['confidence'], method='llm'
        )

    # Build response
    article = get_article(article_id)
    links = get_links_for_article(article_id)

    return jsonify({
        'article': article,
        'links': links,
        'ethical_analysis': ethical,
        'semantic_links_found': len(semantic_links),
        'llm_links_found': len(llm_links)
    })

@app.route('/api/articles/<int:article_id>', methods=['GET'])
def get_single_article(article_id):
    article = get_article(article_id)
    if not article:
        return jsonify({'error': 'Article not found'}), 404
    links = get_links_for_article(article_id)
    return jsonify({'article': article, 'links': links})

@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
def remove_article(article_id):
    article = get_article(article_id)
    if not article:
        return jsonify({'error': 'Article not found'}), 404
    delete_article(article_id)
    return jsonify({'success': True, 'deleted_id': article_id})

@app.route('/api/articles/<int:article_id>/ethical', methods=['GET'])
def get_article_ethical(article_id):
    article = get_article(article_id)
    if not article:
        return jsonify({'error': 'Article not found'}), 404
    return jsonify(article.get('ethical_flags', {}))

@app.route('/api/links', methods=['GET'])
def get_links():
    """Get all links with article titles for graph visualization."""
    links = db_get_all_links()
    # Enrich with article titles
    article_ids = set()
    for l in links:
        article_ids.add(l['source_article_id'])
        article_ids.add(l['target_article_id'])

    articles = {a['id']: a for a in get_articles_by_ids(list(article_ids))}

    enriched = []
    for l in links:
        enriched.append({
            **l,
            'source_title': articles.get(l['source_article_id'], {}).get('title', 'Unknown'),
            'target_title': articles.get(l['target_article_id'], {}).get('title', 'Unknown')
        })
    return jsonify(enriched)

@app.route('/api/graph', methods=['GET'])
def get_graph_data():
    """Get nodes and edges for graph visualization."""
    articles = get_all_articles()
    links = db_get_all_links()

    nodes = []
    for a in articles:
        nodes.append({
            'id': a['id'],
            'title': a['title'],
            'topics': a.get('topics', []),
            'confidence': a.get('confidence_level', 0),
            'date': a.get('created_at', ''),
            'word_count': a.get('word_count', 0)
        })

    edges = []
    for l in links:
        edges.append({
            'source': l['source_article_id'],
            'target': l['target_article_id'],
            'type': l['link_type'],
            'confidence': l.get('confidence', 0),
            'description': l.get('description', '')
        })

    return jsonify({'nodes': nodes, 'edges': edges})

@app.route('/api/export', methods=['GET'])
def export_data():
    """Export all articles and links as JSON."""
    articles = get_all_articles()
    links = db_get_all_links()
    return jsonify({
        'exported_at': datetime.now().isoformat(),
        'articles': articles,
        'links': links
    })

@app.route('/api/import', methods=['POST'])
def import_data():
    """Import articles and links from JSON export."""
    data = request.get_json(silent=True) or {}
    articles = data.get('articles', [])
    links = data.get('links', [])

    imported_count = 0
    id_map = {}  # old_id -> new_id

    for a in articles:
        new_id = add_article(
            title=a.get('title', 'Untitled'),
            original_text=a.get('original_text', ''),
            source_url=a.get('source_url'),
            eli5_summary=a.get('eli5_summary'),
            confidence_level=a.get('confidence_level', 0),
            modification_level=a.get('modification_level', 0),
            topics=a.get('topics', []),
            ethical_flags=a.get('ethical_flags', {}),
            reading_time=a.get('reading_time', 0),
            word_count=a.get('word_count', 0)
        )
        id_map[a.get('id')] = new_id
        imported_count += 1

    # Rebuild links with new IDs
    for l in links:
        old_source = l.get('source_article_id')
        old_target = l.get('target_article_id')
        if old_source in id_map and old_target in id_map:
            add_link(
                id_map[old_source], id_map[old_target],
                l.get('link_type', 'related'),
                l.get('description', ''),
                l.get('confidence', 0),
                l.get('method', 'llm')
            )

    return jsonify({
        'imported_articles': imported_count,
        'imported_links': len(links)
    })

# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)

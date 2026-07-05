"""
URL fetching utility to extract article text from web pages.
Falls back to meta tags if full extraction fails.
"""

import re
import requests
from urllib.parse import urlparse
from typing import Tuple, Optional

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def is_valid_url(url: str) -> bool:
    """Basic URL validation."""
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)

def fetch_article(url: str, timeout: int = 15) -> Tuple[str, str]:
    """
    Fetch article from URL. Returns (title, text).
    Raises exception on failure.
    """
    if not is_valid_url(url):
        raise ValueError("Invalid URL provided")

    response = requests.get(url, headers=HEADERS, timeout=timeout)
    response.raise_for_status()

    if not HAS_BS4:
        # Fallback: try to extract title and text with regex
        title = _extract_title_regex(response.text) or url
        text = _extract_text_regex(response.text)
        return title, text

    soup = BeautifulSoup(response.content, 'lxml')

    # Extract title
    title = _extract_title(soup) or url

    # Extract article text
    text = _extract_article_text(soup)

    if len(text) < 200:
        # Fallback to meta description + all paragraphs
        text = _extract_fallback_text(soup)

    return title, text

def _extract_title(soup) -> Optional[str]:
    """Extract title from soup."""
    # Try article headline first
    for selector in ['h1.article-title', 'h1.headline', 'h1.entry-title', 'h1.post-title', 'h1']:
        tag = soup.select_one(selector)
        if tag:
            return tag.get_text(strip=True)
    # Try meta tags
    for prop in ['og:title', 'twitter:title']:
        tag = soup.find('meta', property=prop) or soup.find('meta', attrs={'name': prop.split(':')[-1]})
        if tag and tag.get('content'):
            return tag['content'].strip()
    # Fallback to <title>
    if soup.title:
        return soup.title.get_text(strip=True)
    return None

def _extract_title_regex(html: str) -> Optional[str]:
    """Regex fallback for title extraction."""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if match:
        return re.sub(r'\s+', ' ', match.group(1)).strip()
    return None

def _extract_article_text(soup) -> str:
    """Extract main article text using common article selectors."""
    selectors = [
        'article', '[role="main"]',
        '.article-body', '.article-content', '.post-content',
        '.entry-content', '.story-body', '.content-body',
        '#article-body', '#content', 'main'
    ]

    for selector in selectors:
        container = soup.select_one(selector)
        if container:
            paragraphs = container.find_all('p')
            if paragraphs:
                text = '\n\n'.join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 30)
                if len(text) > 300:
                    return text

    # Fallback: all paragraphs
    paragraphs = soup.find_all('p')
    text = '\n\n'.join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)
    return text

def _extract_fallback_text(soup) -> str:
    """Fallback text extraction."""
    # Try meta description
    desc = None
    for prop in ['og:description', 'description', 'twitter:description']:
        tag = soup.find('meta', property=prop) or soup.find('meta', attrs={'name': prop.split(':')[-1]})
        if tag and tag.get('content'):
            desc = tag['content'].strip()
            break

    paragraphs = soup.find_all('p')
    text = '\n\n'.join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20)

    if desc and len(text) < 300:
        return f"{desc}\n\n{text}"
    return text

def _extract_text_regex(html: str) -> str:
    """Regex fallback for text extraction."""
    # Remove script/style
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Extract paragraphs
    paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    texts = []
    for p in paragraphs:
        # Strip tags
        txt = re.sub(r'<[^>]+>', ' ', p)
        txt = re.sub(r'\s+', ' ', txt).strip()
        if len(txt) > 30:
            texts.append(txt)
    return '\n\n'.join(texts)

def estimate_reading_time(text: str) -> int:
    """Estimate reading time in minutes."""
    words = len(text.split())
    return max(1, round(words / 200))  # 200 WPM average

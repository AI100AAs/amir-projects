from newspaper import Article
from app.models import ArticleInfo


def fetch_article(url: str) -> ArticleInfo:
    article = Article(url)
    article.download()
    article.parse()
    text = article.text
    preview = text[:2000] if len(text) > 2000 else text
    return ArticleInfo(
        title=article.title or "Untitled",
        source=url,
        text_preview=preview,
    )


def extract_text_from_url(url: str) -> str:
    article = Article(url)
    article.download()
    article.parse()
    return article.text or ""

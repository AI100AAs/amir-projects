import json
import asyncio
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import uvicorn

from app.models import AnalyzeRequest, ArticleInfo
from app.article_fetcher import fetch_article, extract_text_from_url
from app.pipeline import analyze_article, analyze_article_stream
from app.rag_engine import _get_embedder, _get_collection
from app.history import save_result, list_history, get_result, search_history, delete_result, clear_history

BASE_DIR = Path(__file__).resolve().parent.parent
MAX_TEXT_LENGTH = 200_000

app = FastAPI(title="Truth Lens — Fake News Detection", version="2.0.0")

templates = Jinja2Templates(directory=str(BASE_DIR / "app" / "templates"))

static_dir = BASE_DIR / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.on_event("startup")
async def warmup():
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _get_embedder)
    await loop.run_in_executor(None, _get_collection)


def _prepare_article(body) -> tuple[str, ArticleInfo]:
    max_len = MAX_TEXT_LENGTH
    if body.expert and body.expert.max_text_length:
        max_len = min(body.expert.max_text_length, MAX_TEXT_LENGTH)
    if body.url and not body.text:
        try:
            full_text = extract_text_from_url(body.url)
        except Exception as e:
            raise HTTPException(422, f"Failed to fetch article from URL: {e}")
        article = fetch_article(body.url)
    else:
        full_text = (body.text or "").strip()
        if not full_text:
            raise HTTPException(422, "No text or URL provided")
        if len(full_text) > max_len:
            full_text = full_text[:max_len]
        article = ArticleInfo(
            title="Pasted Article",
            source="manual input",
            text_preview=full_text[:2000],
        )
    return full_text, article


def _compute_and_save(full_text: str, article: ArticleInfo, api_key: str, text_input: str, url_input: str,
                      expert=None) -> dict:
    result = analyze_article(article, full_text, api_key=api_key, expert=expert)
    result_dict = result.model_dump()
    save_result(text_input, url_input, bool(api_key), result_dict)
    return result_dict


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    history = list_history(limit=10)
    return templates.TemplateResponse("index.html", {"request": request, "history": history})


@app.post("/analyze", response_class=HTMLResponse)
def analyze(request: Request, text: str = Form(""), url: str = Form(""), api_key: str = Form(""),
            expert_max_text_length: int = Form(50000), expert_max_claims: int = Form(7),
            expert_similarity_threshold: float = Form(0.7),
            expert_model_name: str = Form(""), expert_temperature: float = Form(0.3)):
    if not text and not url:
        history = list_history(limit=10)
        return templates.TemplateResponse(
            "index.html", {"request": request, "error": "Please provide article text or a URL.", "history": history}
        )
    from app.models import ExpertSettings
    expert = ExpertSettings(
        max_text_length=expert_max_text_length,
        max_claims=expert_max_claims,
        similarity_threshold=expert_similarity_threshold,
        model_name=expert_model_name or None,
        temperature=expert_temperature,
    )
    try:
        body = AnalyzeRequest(text=text or None, url=url or None, expert=expert)
        full_text, article = _prepare_article(body)
        result_dict = _compute_and_save(full_text, article, api_key, body.text or "", body.url or "", expert=expert)
        return templates.TemplateResponse("results.html", {"request": request, "result": result_dict})
    except HTTPException:
        raise
    except Exception as e:
        history = list_history(limit=10)
        return templates.TemplateResponse(
            "index.html", {"request": request, "error": f"Analysis failed: {e}", "history": history}
        )


@app.get("/about", response_class=HTMLResponse)
def about(request: Request):
    return templates.TemplateResponse("about.html", {"request": request})


@app.get("/ethics", response_class=HTMLResponse)
def ethics(request: Request):
    return templates.TemplateResponse("ethics.html", {"request": request})


@app.get("/flappy", response_class=HTMLResponse)
def flappy():
    flappy_path = BASE_DIR / "static" / "flappy.html"
    return HTMLResponse(content=flappy_path.read_text())


@app.get("/history/{entry_id}", response_class=HTMLResponse)
def view_history(request: Request, entry_id: str):
    data = get_result(entry_id)
    if data is None:
        return templates.TemplateResponse("index.html", {"request": request, "error": "Result not found."})
    result_dict = data["result"]
    return templates.TemplateResponse("results.html", {"request": request, "result": result_dict})


@app.get("/api/history")
def history_api(limit: int = 10, search: str = ""):
    if search:
        return JSONResponse(content=search_history(search, limit))
    return JSONResponse(content=list_history(limit))


@app.get("/api/history/{entry_id}")
def history_detail_api(entry_id: str):
    data = get_result(entry_id)
    if data is None:
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return JSONResponse(content=data["result"])


@app.delete("/api/history/{entry_id}")
def history_delete_api(entry_id: str):
    deleted = delete_result(entry_id)
    if not deleted:
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return JSONResponse(content={"status": "deleted"})


@app.delete("/api/history")
def history_clear_api():
    clear_history()
    return JSONResponse(content={"status": "cleared"})


@app.post("/api/analyze")
def analyze_api(body: AnalyzeRequest):
    try:
        full_text, article = _prepare_article(body)
        result_dict = _compute_and_save(
            full_text, article, body.api_key or "", body.text or "", body.url or "",
            expert=body.expert,
        )
        return JSONResponse(content=result_dict)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/analyze/stream")
async def analyze_stream_api(body: AnalyzeRequest):
    try:
        full_text, article = _prepare_article(body)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    api_key = body.api_key or ""
    text_input = body.text or ""
    url_input = body.url or ""
    expert = body.expert

    async def event_stream():
        saved = False
        try:
            gen = analyze_article_stream(article, full_text, api_key=api_key, expert=expert)
            for event in gen:
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)
                if event["type"] == "done" and not saved:
                    save_result(text_input, url_input, bool(api_key), event["result"])
                    saved = True
        except asyncio.CancelledError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Analysis cancelled'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

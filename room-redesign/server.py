import os
import sys
from pathlib import Path


if __name__ == "__main__":
    project_dir = Path(__file__).resolve().parent
    venv_python = project_dir / ".venv" / "bin" / "python"
    if venv_python.exists() and Path(sys.executable) != venv_python:
        os.execv(str(venv_python), [str(venv_python), str(Path(__file__).resolve())])

    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000)

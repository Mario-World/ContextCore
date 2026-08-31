import os
import sys
from typing import Dict, Any

# Ensure both backend and workspace root are available on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)
for p in (project_root, backend_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from backend.tools import github_tools, code_parser
    from backend.agents import memory_agent, coordinator
    from backend.services import firestore_service
except ImportError:
    from tools import github_tools, code_parser
    from agents import memory_agent, coordinator
    from services import firestore_service

app = FastAPI(
    title="ContextCore API",
    description="Persistent-memory coding agent with Vector Search and Firestore",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngestRequest(BaseModel):
    github_url: str = Field(..., description="GitHub repository URL to clone and ingest")
    repo_id: str = Field(..., description="Unique repository identifier")


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    repo_id: str = Field(..., description="Repository identifier")
    message: str = Field(..., description="User prompt or instruction")


@app.get("/health")
def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    try:
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest")
def ingest_repo(req: IngestRequest) -> Dict[str, Any]:
    """
    Clones GitHub repository, chunks code files, embeds, and stores into Vector Search and Firestore.
    """
    try:
        repo_path = github_tools.clone_repo(req.github_url)
        try:
            code_files = github_tools.list_code_files(repo_path)
            chunks_stored = 0

            for file_path in code_files:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except Exception:
                    continue

                rel_path = os.path.relpath(file_path, repo_path).replace("\\", "/")
                chunks = code_parser.chunk_file(content, rel_path)

                for chunk in chunks:
                    memory_agent.store_code_chunk(
                        text=chunk["text"],
                        file_path=chunk["file_path"],
                        repo_id=req.repo_id,
                    )
                    chunks_stored += 1

            return {
                "status": "ok",
                "files_processed": len(code_files),
                "chunks_stored": chunks_stored,
            }
        finally:
            github_tools.cleanup_repo(repo_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    """
    Processes chat messages with ContextCore coordinator, checking for prior checkpoints and handling memory retrieval.
    """
    try:
        prior_checkpoint = coordinator.resume_if_crashed(req.session_id)
        resumed_from_checkpoint = prior_checkpoint is not None

        response = coordinator.handle_message(
            session_id=req.session_id,
            repo_id=req.repo_id,
            user_message=req.message,
        )
        response["resumed_from_checkpoint"] = resumed_from_checkpoint
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/{repo_id}")
def get_memory(repo_id: str) -> Dict[str, Any]:
    """
    Retrieves stored conventions and corrections for a specific repository.
    """
    try:
        corrections = firestore_service.list_corrections(repo_id)
        return {"corrections": corrections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/costs")
def get_costs() -> Dict[str, Any]:
    """
    Retrieves token and cost breakdown across Flash and Pro models.
    """
    try:
        return firestore_service.get_cost_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

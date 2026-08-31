import os
import sys
from typing import Dict, Any, Optional

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
    github_url: Optional[str] = Field(None, description="GitHub repository URL to clone and ingest")
    repo_url: Optional[str] = Field(None, description="Repository URL or path to clone and ingest (alternative name)")
    repo_id: str = Field(..., description="Unique repository identifier")


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    repo_id: str = Field(..., description="Repository identifier")
    message: str = Field(..., description="User prompt or instruction")


class QueryRequest(BaseModel):
    query: str
    repo_id: str
    top_k: int = 5


class AddConventionRequest(BaseModel):
    repo_id: str = Field(..., description="Repository identifier")
    text: str = Field(..., description="Convention or correction rule text")
    topic: Optional[str] = Field(None, description="Topic domain (e.g. auth, database, state, naming, etc.)")


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
        url_to_clone = req.github_url or req.repo_url
        if not url_to_clone:
            raise HTTPException(status_code=400, detail="Either github_url or repo_url must be provided.")
        repo_path = github_tools.clone_repo(url_to_clone)
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
                "status": "success",
                "repo_id": req.repo_id,
                "files_processed": len(code_files),
                "chunks_stored": chunks_stored,
                "chunks_indexed": chunks_stored,
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


@app.post("/query")
def query_index(req: QueryRequest) -> Dict[str, Any]:
    """
    Query endpoint for finding semantically similar code chunks using local/fallback storage.
    """
    try:
        from backend.services import embedding_service
        from backend.storage import storage

        query_vector = embedding_service.embed_text(req.query, task_type="retrieval_query")
        results = storage.search_vectors(
            query_vector=query_vector,
            repo_id=req.repo_id,
            top_k=req.top_k
        )

        formatted_results = []
        for r in results:
            formatted_results.append({
                "chunk_id": r.chunk_id,
                "repo_id": r.repo_id,
                "file_path": r.file_path,
                "symbol_name": r.symbol_name,
                "chunk_type": r.chunk_type,
                "start_line": r.start_line,
                "end_line": r.end_line,
                "content": r.content,
                "docstring": r.docstring,
                "language": r.language,
                "score": r.score
            })

        return {
            "total_results": len(formatted_results),
            "results": formatted_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/graph/{repo_id:path}")
@app.get("/memory-graph/{repo_id:path}")
@app.get("/memory/{repo_id:path}/graph")
def get_memory_graph_endpoint(repo_id: str) -> Dict[str, Any]:
    """
    Retrieves the full relational memory graph for a repository (nodes, links, metrics).
    """
    try:
        # Strip trailing /graph if captured by path converter
        clean_repo_id = repo_id
        if clean_repo_id.endswith("/graph"):
            clean_repo_id = clean_repo_id[:-6]
        return firestore_service.get_memory_graph(clean_repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/{repo_id:path}")
def get_memory(repo_id: str) -> Dict[str, Any]:
    """
    Retrieves stored conventions and corrections for a specific repository.
    """
    try:
        # Handle trailing /graph in case of route overlap
        if repo_id.endswith("/graph"):
            return firestore_service.get_memory_graph(repo_id[:-6])
        corrections = firestore_service.list_corrections(repo_id)
        return {"corrections": corrections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/add")
def add_memory_convention(req: AddConventionRequest) -> Dict[str, Any]:
    """
    Directly adds a new convention or correction to repository memory.
    """
    try:
        topic = req.topic or coordinator._guess_topic(req.text)
        correction_id = memory_agent.store_correction(
            text=req.text,
            topic=topic,
            repo_id=req.repo_id,
        )
        return {
            "status": "success",
            "correction_id": correction_id,
            "repo_id": req.repo_id,
            "topic": topic,
            "text": req.text,
        }
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

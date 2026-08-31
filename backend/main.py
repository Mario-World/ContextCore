import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query as QueryParam
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.cloner import clone_repository
from backend.chunker import chunk_file, CodeChunk
from backend.embedder import embedder
from backend.storage import storage, QueryResult

app = FastAPI(
    title="ContextCore Ingestion & Vector Search API",
    description="Clones repos, chunks AST/regex symbols, embeds via Gemini, and indexes into Vector Search & Firestore",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    repo_url: str = Field(..., description="Git clone URL (HTTPS/SSH) or local directory path")
    repo_id: Optional[str] = Field(None, description="Unique identifier for repository (used as restrict tag)")
    branch: Optional[str] = Field(None, description="Optional branch or tag to clone")

class IngestFileSummary(BaseModel):
    file_path: str
    chunks_count: int

class IngestResponse(BaseModel):
    status: str
    repo_id: str
    files_processed: int
    chunks_indexed: int
    duration_seconds: float
    files: List[IngestFileSummary]

class QueryRequest(BaseModel):
    query: str = Field(..., description="Search query string, e.g. 'how do we handle auth'")
    repo_id: Optional[str] = Field(None, description="Filter restrict to search only within a specific repo")
    top_k: int = Field(5, ge=1, le=50, description="Number of results to return")

class QueryResponse(BaseModel):
    query: str
    repo_id: Optional[str]
    total_results: int
    results: List[QueryResult]

def derive_repo_id(repo_url: str) -> str:
    cleaned = repo_url.rstrip("/").removesuffix(".git")
    parts = cleaned.replace("\\", "/").split("/")
    if len(parts) >= 2:
        return f"{parts[-2]}/{parts[-1]}".lower()
    return parts[-1].lower() if parts else "default-repo"

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "gemini_api_configured": bool(settings.gemini_api_key),
        "embedding_model": settings.embedding_model,
        "indexed_chunks": len(storage._chunks),
        "indexed_repos": list(set(storage._repo_map.values()))
    }

@app.post("/ingest", response_model=IngestResponse)
def ingest_repository(req: IngestRequest):
    """
    Ingest pipeline:
    1. Clone repo (GitPython)
    2. Chunk code by function/class (AST for Python, regex for JS/TS)
    3. Embed each chunk via Gemini embedding model
    4. Upsert to Vector Search with repo_id restrict and store metadata + text in Firestore
    """
    start_time = time.time()
    repo_id = req.repo_id or derive_repo_id(req.repo_url)

    try:
        with clone_repository(req.repo_url, branch=req.branch) as cloned:
            code_files = cloned.get_code_files()
            if not code_files:
                raise HTTPException(status_code=400, detail="No valid code files found in repository")

            all_chunks: List[CodeChunk] = []
            files_summary: List[IngestFileSummary] = []

            for file_path, content in code_files.items():
                chunks = chunk_file(file_path, content)
                if chunks:
                    all_chunks.extend(chunks)
                    files_summary.append(IngestFileSummary(
                        file_path=file_path,
                        chunks_count=len(chunks)
                    ))

            if not all_chunks:
                raise HTTPException(status_code=400, detail="No code chunks could be extracted from repository")

            # Generate Gemini embeddings for all chunks
            embeddings = embedder.embed_chunks(all_chunks)

            # Upsert into Vector Search & Firestore
            indexed_count = storage.upsert_chunks_and_vectors(
                repo_id=repo_id,
                chunks=all_chunks,
                embeddings=embeddings
            )

            duration = round(time.time() - start_time, 3)

            return IngestResponse(
                status="success",
                repo_id=repo_id,
                files_processed=len(code_files),
                chunks_indexed=indexed_count,
                duration_seconds=duration,
                files=files_summary
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/query", response_model=QueryResponse)
def query_index(req: QueryRequest):
    """
    Raw query against the Vector Search index with repo_id restrict filtering.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")

    # Embed search query via Gemini embedding model
    query_vector = embedder.embed_query(req.query)

    # Perform vector similarity search and retrieve Firestore chunks
    results = storage.search_vectors(
        query_vector=query_vector,
        repo_id=req.repo_id,
        top_k=req.top_k
    )

    return QueryResponse(
        query=req.query,
        repo_id=req.repo_id,
        total_results=len(results),
        results=results
    )

@app.get("/query", response_model=QueryResponse)
def query_index_get(
    query: str = QueryParam(..., description="Search query string"),
    repo_id: Optional[str] = QueryParam(None, description="Optional repo_id restrict filter"),
    top_k: int = QueryParam(5, ge=1, le=50, description="Top K results")
):
    """GET query endpoint for convenient testing in browser or curl."""
    req = QueryRequest(query=query, repo_id=repo_id, top_k=top_k)
    return query_index(req)

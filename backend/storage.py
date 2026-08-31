import os
import json
import time
import numpy as np
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.config import settings
from backend.chunker import CodeChunk

class ChunkRecord(BaseModel):
    chunk_id: str
    repo_id: str
    file_path: str
    symbol_name: str
    chunk_type: str
    start_line: int
    end_line: int
    content: str
    docstring: Optional[str] = None
    language: str
    created_at: float

class QueryResult(BaseModel):
    chunk_id: str
    repo_id: str
    file_path: str
    symbol_name: str
    chunk_type: str
    start_line: int
    end_line: int
    content: str
    docstring: Optional[str] = None
    language: str
    score: float

class StorageService:
    def __init__(self):
        self.data_dir = settings.local_storage_path
        os.makedirs(self.data_dir, exist_ok=True)
        self.firestore_client = None
        
        # Try initializing google-cloud-firestore if credentials/project are set
        if not settings.use_local_storage and os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                from google.cloud import firestore
                self.firestore_client = firestore.Client(
                    project=settings.google_cloud_project,
                    database=settings.firestore_database
                )
            except Exception as e:
                print(f"Firestore initialization notice: {e}. Using local storage engine.")
                self.firestore_client = None

        # In-memory indices for ultra-fast vector search & fallback persistence
        self._vectors: Dict[str, np.ndarray] = {}  # chunk_id -> vector
        self._repo_map: Dict[str, str] = {}         # chunk_id -> repo_id
        self._chunks: Dict[str, ChunkRecord] = {}   # chunk_id -> ChunkRecord
        
        self._load_local_state()

    def _load_local_state(self):
        state_file = os.path.join(self.data_dir, "storage_state.json")
        if os.path.exists(state_file):
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data.get("chunks", []):
                    record = ChunkRecord(**item)
                    self._chunks[record.chunk_id] = record
                    self._repo_map[record.chunk_id] = record.repo_id
                for cid, vec in data.get("vectors", {}).items():
                    self._vectors[cid] = np.array(vec, dtype=np.float32)
            except Exception as e:
                print(f"Notice: Failed to load existing local storage state: {e}")

    def _save_local_state(self):
        state_file = os.path.join(self.data_dir, "storage_state.json")
        try:
            data = {
                "chunks": [c.model_dump() for c in self._chunks.values()],
                "vectors": {cid: vec.tolist() for cid, vec in self._vectors.items()}
            }
            with open(state_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Notice: Failed to save local storage state: {e}")

    def upsert_chunks_and_vectors(
        self,
        repo_id: str,
        chunks: List[CodeChunk],
        embeddings: List[List[float]]
    ) -> int:
        """
        Upserts chunk metadata and text to Firestore, and vectors to Vector Search
        with repo_id as a filterable restrict.
        """
        now = time.time()
        count = 0

        for chunk, emb in zip(chunks, embeddings):
            record = ChunkRecord(
                chunk_id=chunk.chunk_id,
                repo_id=repo_id,
                file_path=chunk.file_path,
                symbol_name=chunk.symbol_name,
                chunk_type=chunk.chunk_type,
                start_line=chunk.start_line,
                end_line=chunk.end_line,
                content=chunk.content,
                docstring=chunk.docstring,
                language=chunk.language,
                created_at=now
            )

            # Store in Firestore if available
            if self.firestore_client:
                try:
                    doc_ref = self.firestore_client.collection("repositories").document(repo_id).collection("chunks").document(chunk.chunk_id)
                    doc_ref.set(record.model_dump())
                except Exception as e:
                    print(f"Firestore upsert error for chunk {chunk.chunk_id}: {e}")

            # Store in in-memory vector search index
            vec = np.array(emb, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 1e-6:
                vec = vec / norm

            self._vectors[chunk.chunk_id] = vec
            self._repo_map[chunk.chunk_id] = repo_id
            self._chunks[chunk.chunk_id] = record
            count += 1

        self._save_local_state()
        return count

    def search_vectors(
        self,
        query_vector: List[float],
        repo_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[QueryResult]:
        """
        Performs vector similarity search against the Vector Search index,
        filtering by repo_id (restrict), then retrieves chunk metadata + text
        from Firestore / storage.
        """
        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 1e-6:
            q_vec = q_vec / q_norm

        candidates = []
        for chunk_id, vec in self._vectors.items():
            # Apply repo_id restrict filter
            if repo_id and self._repo_map.get(chunk_id) != repo_id:
                continue

            # Cosine similarity (both vectors are unit normalized)
            score = float(np.dot(q_vec, vec))
            candidates.append((chunk_id, score))

        # Sort descending by score
        candidates.sort(key=lambda x: x[1], reverse=True)
        top_candidates = candidates[:top_k]

        results: List[QueryResult] = []
        for chunk_id, score in top_candidates:
            # Fetch full chunk text and metadata (from Firestore or local store)
            record = None
            if self.firestore_client and repo_id:
                try:
                    doc = self.firestore_client.collection("repositories").document(repo_id).collection("chunks").document(chunk_id).get()
                    if doc.exists:
                        record = ChunkRecord(**doc.to_dict())
                except Exception:
                    record = None

            if not record:
                record = self._chunks.get(chunk_id)

            if record:
                results.append(QueryResult(
                    chunk_id=record.chunk_id,
                    repo_id=record.repo_id,
                    file_path=record.file_path,
                    symbol_name=record.symbol_name,
                    chunk_type=record.chunk_type,
                    start_line=record.start_line,
                    end_line=record.end_line,
                    content=record.content,
                    docstring=record.docstring,
                    language=record.language,
                    score=round(score, 4)
                ))

        return results

storage = StorageService()

import os
import hashlib
import numpy as np
from typing import List
from backend.config import settings
from backend.chunker import CodeChunk

try:
    from google import genai
    from google.genai import types
    GENAI_V2_AVAILABLE = True
except ImportError:
    GENAI_V2_AVAILABLE = False

try:
    import google.generativeai as legacy_genai
    LEGACY_GENAI_AVAILABLE = True
except ImportError:
    LEGACY_GENAI_AVAILABLE = False

def build_chunk_embedding_text(chunk: CodeChunk) -> str:
    """Builds a rich semantic representation of the code chunk for embedding."""
    parts = [
        f"File: {chunk.file_path}",
        f"Symbol: {chunk.symbol_name} (type: {chunk.chunk_type}, lang: {chunk.language})",
        f"Lines: {chunk.start_line}-{chunk.end_line}",
    ]
    if chunk.docstring:
        parts.append(f"Docstring: {chunk.docstring}")
    parts.append(f"Code:\n{chunk.content}")
    return "\n".join(parts)

def fallback_deterministic_embedding(text: str, dimension: int = 768) -> List[float]:
    """
    Deterministic semantic hash/bag-of-words embedding vector used when
    running offline or without GEMINI_API_KEY.
    Ensures semantically relevant terms produce high cosine similarity.
    """
    vec = np.zeros(dimension, dtype=np.float32)
    words = text.lower().replace("_", " ").replace(".", " ").replace("/", " ").split()
    
    # Semantic token boosts for code concepts
    keywords_weights = {
        "auth": 5.0, "authentication": 5.0, "authorize": 5.0, "authorization": 5.0,
        "token": 4.0, "jwt": 5.0, "bearer": 4.0, "login": 4.0, "password": 4.0,
        "session": 4.0, "oauth": 5.0, "user": 2.0, "verify": 3.0, "middleware": 3.0,
        "database": 3.0, "db": 3.0, "query": 3.0, "model": 2.0, "schema": 2.0,
        "api": 2.0, "route": 2.0, "endpoint": 2.0, "handler": 2.0, "controller": 2.0,
        "chunk": 2.0, "embed": 3.0, "vector": 3.0, "search": 3.0, "ingest": 3.0,
    }

    for w in words:
        w_clean = "".join(c for c in w if c.isalnum())
        if not w_clean:
            continue
        weight = keywords_weights.get(w_clean, 1.0)
        
        # Distribute hash across dimensions
        h = int(hashlib.sha256(w_clean.encode('utf-8')).hexdigest(), 16)
        idx1 = h % dimension
        idx2 = (h >> 16) % dimension
        idx3 = (h >> 32) % dimension
        
        vec[idx1] += 1.0 * weight
        vec[idx2] += 0.5 * weight
        vec[idx3] += 0.25 * weight

    # Normalize vector to unit length
    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec = vec / norm
    else:
        vec[0] = 1.0

    return vec.tolist()

class Embedder:
    def __init__(self):
        self.api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
        self.model_name = settings.embedding_model
        self.dimension = settings.embedding_dimension
        self.client = None

        if self.api_key:
            if GENAI_V2_AVAILABLE:
                try:
                    self.client = genai.Client(api_key=self.api_key)
                except Exception:
                    self.client = None
            elif LEGACY_GENAI_AVAILABLE:
                try:
                    legacy_genai.configure(api_key=self.api_key)
                except Exception:
                    pass

    def embed_texts(self, texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
        if not texts:
            return []

        # If API key is available, call Gemini Embedding API
        if self.api_key:
            try:
                if self.client and GENAI_V2_AVAILABLE:
                    results = []
                    # Process in batches of 50
                    for i in range(0, len(texts), 50):
                        batch = texts[i : i + 50]
                        response = self.client.models.embed_content(
                            model=self.model_name,
                            contents=batch,
                            config=types.EmbedContentConfig(
                                task_type=task_type,
                                output_dimensionality=self.dimension
                            ) if hasattr(types, "EmbedContentConfig") else None
                        )
                        if hasattr(response, "embeddings"):
                            for emb in response.embeddings:
                                results.append(emb.values)
                    if len(results) == len(texts):
                        return results
                elif LEGACY_GENAI_AVAILABLE:
                    results = []
                    for i in range(0, len(texts), 50):
                        batch = texts[i : i + 50]
                        response = legacy_genai.embed_content(
                            model=f"models/{self.model_name}",
                            content=batch,
                            task_type=task_type
                        )
                        if "embedding" in response:
                            results.extend(response["embedding"])
                    if len(results) == len(texts):
                        return results
            except Exception as e:
                print(f"Warning: Gemini API embedding failed ({e}), falling back to deterministic local embedding.")

        # Fallback to deterministic embedding
        return [fallback_deterministic_embedding(t, self.dimension) for t in texts]

    def embed_chunks(self, chunks: List[CodeChunk]) -> List[List[float]]:
        texts = [build_chunk_embedding_text(c) for c in chunks]
        return self.embed_texts(texts, task_type="RETRIEVAL_DOCUMENT")

    def embed_query(self, query: str) -> List[float]:
        embeddings = self.embed_texts([query], task_type="RETRIEVAL_QUERY")
        return embeddings[0] if embeddings else [0.0] * self.dimension

embedder = Embedder()

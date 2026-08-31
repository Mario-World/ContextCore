import os
from typing import List

try:
    from backend.config import settings
except ImportError:
    from config import settings

from google import genai
from google.genai import types


def get_genai_client() -> genai.Client:
    """Initialize and return the Google GenAI client based on configuration."""
    if settings.GOOGLE_GENAI_USE_VERTEXAI:
        return genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT or None,
            location=settings.GOOGLE_CLOUD_LOCATION or "us-central1",
        )
    api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    if api_key:
        return genai.Client(api_key=api_key)
    return genai.Client()


def embed_text(text: str, task_type: str = "retrieval_document") -> List[float]:
    """
    Generate a 768-dimensional embedding for text using Google GenAI text-embedding-004.
    
    Args:
        text: The input text to embed.
        task_type: Embedding task type (e.g., 'retrieval_document', 'retrieval_query', 'semantic_similarity').
        
    Returns:
        A list of 768 float values representing the embedding vector.
    """
    if not text or not text.strip():
        return [0.0] * 768

    api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    use_vertex = settings.GOOGLE_GENAI_USE_VERTEXAI

    try:
        if not api_key and not use_vertex and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            raise ValueError("No API key or Vertex credentials available")

        client = get_genai_client()
        
        # Map common task types to uppercase if needed
        task_type_mapped = task_type.upper() if task_type else "RETRIEVAL_DOCUMENT"

        config = types.EmbedContentConfig(
            task_type=task_type_mapped,
            output_dimensionality=768,
        )

        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=config,
        )

        if response.embeddings and len(response.embeddings) > 0:
            return list(response.embeddings[0].values)
    except Exception as e:
        print(f"Embedding service fallback: generating deterministic mock embedding due to: {e}")

    # Deterministic fallback vector generation based on text hash
    import hashlib
    h = hashlib.sha256(text.encode('utf-8')).digest()
    vec = []
    for i in range(96):
        h_chunk = hashlib.sha256(h + bytes([i])).digest()
        for j in range(0, 32, 4):
            val = int.from_bytes(h_chunk[j:j+4], byteorder='little', signed=True)
            vec.append(val / (2**31 - 1))
    return vec[:768]

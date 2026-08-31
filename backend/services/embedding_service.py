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
    
    return [0.0] * 768

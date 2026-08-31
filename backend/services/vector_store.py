import uuid
from typing import List, Dict, Any, Optional

try:
    from backend.config import settings
except ImportError:
    from config import settings

from google.cloud import aiplatform
from google.cloud.aiplatform_v1.types import IndexDatapoint
from google.cloud.aiplatform.matching_engine.matching_engine_index_endpoint import Namespace


# Initialize Vertex AI Platform SDK
aiplatform.init(
    project=settings.GOOGLE_CLOUD_PROJECT or None,
    location=settings.GOOGLE_CLOUD_LOCATION or "us-central1",
)


def get_index() -> aiplatform.MatchingEngineIndex:
    """Get the MatchingEngineIndex instance."""
    if not settings.VECTOR_SEARCH_INDEX:
        raise ValueError("VECTOR_SEARCH_INDEX is not configured in settings.")
    return aiplatform.MatchingEngineIndex(index_name=settings.VECTOR_SEARCH_INDEX)


def get_index_endpoint() -> aiplatform.MatchingEngineIndexEndpoint:
    """Get the MatchingEngineIndexEndpoint instance."""
    if not settings.VECTOR_SEARCH_ENDPOINT:
        raise ValueError("VECTOR_SEARCH_ENDPOINT is not configured in settings.")
    return aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=settings.VECTOR_SEARCH_ENDPOINT)


def upsert_vector(
    embedding: List[float],
    repo_id: str,
    doc_type: str,
    datapoint_id: Optional[str] = None,
) -> str:
    """
    Upserts a vector embedding to the Vertex AI Vector Search index with namespaces.
    
    Args:
        embedding: List of 768 float values.
        repo_id: Identifier of the repository.
        doc_type: Type of document/chunk (e.g., 'code_chunk', 'correction').
        datapoint_id: Optional unique identifier for the datapoint. If omitted, a UUID is generated.
        
    Returns:
        The datapoint_id that was upserted.
    """
    if not datapoint_id:
        datapoint_id = str(uuid.uuid4())

    restricts = [
        IndexDatapoint.Restriction(namespace="repo_id", allow_list=[repo_id]),
        IndexDatapoint.Restriction(namespace="doc_type", allow_list=[doc_type]),
    ]

    datapoint = IndexDatapoint(
        datapoint_id=datapoint_id,
        feature_vector=embedding,
        restricts=restricts,
    )

    index = get_index()
    index.upsert_datapoints(datapoints=[datapoint])

    return datapoint_id


def query_vectors(
    embedding: List[float],
    repo_id: str,
    num_neighbors: int = 8,
    doc_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Queries Vertex AI Vector Search endpoint for the nearest neighbors.
    
    Args:
        embedding: Query vector embedding.
        repo_id: Repository ID filter.
        num_neighbors: Number of nearest neighbors to retrieve.
        doc_type: Optional doc_type filter.
        
    Returns:
        List of dicts with 'id' and 'distance', e.g. [{"id": "...", "distance": 0.12}, ...]
    """
    if not settings.VECTOR_SEARCH_DEPLOYED_INDEX:
        raise ValueError("VECTOR_SEARCH_DEPLOYED_INDEX is not configured in settings.")

    endpoint = get_index_endpoint()

    filter_namespaces = [
        Namespace(name="repo_id", allow_tokens=[repo_id])
    ]
    if doc_type:
        filter_namespaces.append(Namespace(name="doc_type", allow_tokens=[doc_type]))

    response = endpoint.find_neighbors(
        deployed_index_id=settings.VECTOR_SEARCH_DEPLOYED_INDEX,
        queries=[embedding],
        num_neighbors=num_neighbors,
        filter=filter_namespaces,
    )

    results: List[Dict[str, Any]] = []
    if response and len(response) > 0:
        for neighbor in response[0]:
            results.append({
                "id": neighbor.id,
                "distance": neighbor.distance,
            })

    return results

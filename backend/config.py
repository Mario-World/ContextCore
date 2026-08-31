import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    google_cloud_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "context-core-dev")
    firestore_database: str = os.getenv("FIRESTORE_DATABASE", "(default)")
    vector_search_index_id: str = os.getenv("VECTOR_SEARCH_INDEX_ID", "code_chunks_index")
    vector_search_index_endpoint_id: str = os.getenv("VECTOR_SEARCH_INDEX_ENDPOINT_ID", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "768"))
    local_storage_path: str = os.getenv("LOCAL_STORAGE_PATH", os.path.join(os.path.dirname(__file__), "data"))
    use_local_storage: bool = os.getenv("USE_LOCAL_STORAGE", "auto").lower() in ("1", "true", "yes", "auto")

settings = Settings()

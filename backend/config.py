import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_GENAI_USE_VERTEXAI: bool = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() in ("true", "1", "yes")
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    GOOGLE_CLOUD_LOCATION: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    VECTOR_SEARCH_INDEX: str = os.getenv("VECTOR_SEARCH_INDEX", "")
    VECTOR_SEARCH_ENDPOINT: str = os.getenv("VECTOR_SEARCH_ENDPOINT", "")
    VECTOR_SEARCH_DEPLOYED_INDEX: str = os.getenv("VECTOR_SEARCH_DEPLOYED_INDEX", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    local_storage_path: str = os.getenv("LOCAL_STORAGE_PATH", os.path.join(os.path.dirname(__file__), "data"))
    use_local_storage: bool = os.getenv("USE_LOCAL_STORAGE", "auto").lower() in ("1", "true", "yes", "auto")
    firestore_database: str = os.getenv("FIRESTORE_DATABASE", "(default)")
    google_cloud_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")


settings = Settings()

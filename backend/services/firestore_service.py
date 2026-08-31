from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

try:
    from backend.config import settings
except ImportError:
    from config import settings

from google.cloud import firestore


def get_db() -> firestore.Client:
    """Initialize and return a Firestore Client."""
    if settings.GOOGLE_CLOUD_PROJECT:
        return firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)
    return firestore.Client()


def save_chunk_text(
    chunk_id: str,
    repo_id: str,
    text: str,
    file_path: str,
    doc_type: str,
) -> None:
    """Save code chunk text and metadata to Firestore."""
    db = get_db()
    doc_ref = db.collection("chunks").document(chunk_id)
    doc_ref.set({
        "chunk_id": chunk_id,
        "repo_id": repo_id,
        "text": text,
        "file_path": file_path,
        "doc_type": doc_type,
        "created_at": firestore.SERVER_TIMESTAMP,
    })


def get_chunk_texts(chunk_ids: List[str]) -> List[Dict[str, Any]]:
    """Retrieve chunk texts and metadata for a list of chunk IDs."""
    if not chunk_ids:
        return []

    db = get_db()
    doc_refs = [db.collection("chunks").document(cid) for cid in chunk_ids]
    snapshots = db.get_all(doc_refs)

    chunks: List[Dict[str, Any]] = []
    for snap in snapshots:
        if snap.exists:
            data = snap.to_dict() or {}
            data["id"] = snap.id
            chunks.append(data)

    return chunks


def save_correction(
    correction_id: str,
    repo_id: str,
    topic: str,
    text: str,
) -> None:
    """Save a user correction/convention to Firestore."""
    db = get_db()
    doc_ref = db.collection("corrections").document(correction_id)
    doc_ref.set({
        "correction_id": correction_id,
        "repo_id": repo_id,
        "topic": topic,
        "text": text,
        "timestamp": firestore.SERVER_TIMESTAMP,
    })


def list_corrections(repo_id: str) -> List[Dict[str, Any]]:
    """List all corrections for a given repository ordered by timestamp descending."""
    db = get_db()
    query = (
        db.collection("corrections")
        .where("repo_id", "==", repo_id)
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
    )
    docs = query.stream()

    corrections: List[Dict[str, Any]] = []
    for doc in docs:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        corrections.append(data)

    return corrections


def save_checkpoint(
    session_id: str,
    step: int,
    state: Dict[str, Any],
) -> None:
    """Save an agent execution checkpoint to Firestore."""
    db = get_db()
    checkpoint_id = f"{session_id}_{step}"
    doc_ref = db.collection("checkpoints").document(checkpoint_id)
    doc_ref.set({
        "session_id": session_id,
        "step": step,
        "state": state,
        "timestamp": firestore.SERVER_TIMESTAMP,
    })


def get_latest_checkpoint(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the latest checkpoint for a session by step descending."""
    db = get_db()
    query = (
        db.collection("checkpoints")
        .where("session_id", "==", session_id)
        .order_by("step", direction=firestore.Query.DESCENDING)
        .limit(1)
    )
    docs = list(query.stream())
    if docs:
        data = docs[0].to_dict() or {}
        data["id"] = docs[0].id
        return data

    return None


def log_cost(
    session_id: str,
    model: str,
    tokens_est: int,
    cost_est: float,
) -> None:
    """Log an LLM call cost record to Firestore."""
    db = get_db()
    db.collection("costs").add({
        "session_id": session_id,
        "model": model,
        "tokens_est": tokens_est,
        "cost_est": cost_est,
        "timestamp": firestore.SERVER_TIMESTAMP,
    })


def get_cost_summary() -> Dict[str, Any]:
    """
    Get aggregated cost and call summary grouped by model type (flash vs pro).
    """
    db = get_db()
    docs = db.collection("costs").stream()

    summary = {
        "flash": {"call_count": 0, "tokens_est": 0, "cost_est": 0.0},
        "pro": {"call_count": 0, "tokens_est": 0, "cost_est": 0.0},
        "other": {"call_count": 0, "tokens_est": 0, "cost_est": 0.0},
        "total_calls": 0,
        "total_cost": 0.0,
    }

    for doc in docs:
        data = doc.to_dict() or {}
        model = str(data.get("model", "")).lower()
        tokens = int(data.get("tokens_est", 0))
        cost = float(data.get("cost_est", 0.0))

        if "flash" in model:
            category = "flash"
        elif "pro" in model:
            category = "pro"
        else:
            category = "other"

        summary[category]["call_count"] += 1
        summary[category]["tokens_est"] += tokens
        summary[category]["cost_est"] += cost

        summary["total_calls"] += 1
        summary["total_cost"] += cost

    return summary

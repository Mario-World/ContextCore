from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

try:
    from backend.config import settings
except ImportError:
    from config import settings

from google.cloud import firestore


_db_client = None
_db_failed = False
_mock_checkpoints = {}
_mock_corrections = {}
_mock_costs = []


def get_db() -> Optional[firestore.Client]:
    """Initialize and return a Firestore Client with offline support."""
    global _db_client, _db_failed
    if _db_failed:
        return None
    if _db_client is not None:
        return _db_client
    try:
        if settings.GOOGLE_CLOUD_PROJECT:
            _db_client = firestore.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        else:
            _db_client = firestore.Client()
        return _db_client
    except Exception as e:
        print(f"Warning: Firestore initialization failed ({e}). Mock/fallback mode enabled.")
        _db_failed = True
        return None


def save_chunk_text(
    chunk_id: str,
    repo_id: str,
    text: str,
    file_path: str,
    doc_type: str,
) -> None:
    """Save code chunk text and metadata to Firestore."""
    db = get_db()
    if not db:
        return
    try:
        doc_ref = db.collection("chunks").document(chunk_id)
        doc_ref.set({
            "chunk_id": chunk_id,
            "repo_id": repo_id,
            "text": text,
            "file_path": file_path,
            "doc_type": doc_type,
            "created_at": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        print(f"Warning: Firestore save_chunk_text failed ({e})")


def get_chunk_texts(chunk_ids: List[str]) -> List[Dict[str, Any]]:
    """Retrieve chunk texts and metadata for a list of chunk IDs."""
    if not chunk_ids:
        return []

    db = get_db()
    if not db:
        return []
    try:
        doc_refs = [db.collection("chunks").document(cid) for cid in chunk_ids]
        snapshots = db.get_all(doc_refs)

        chunks: List[Dict[str, Any]] = []
        for snap in snapshots:
            if snap.exists:
                data = snap.to_dict() or {}
                data["id"] = snap.id
                chunks.append(data)

        return chunks
    except Exception as e:
        print(f"Warning: Firestore get_chunk_texts failed ({e})")
        return []


def save_correction(
    correction_id: str,
    repo_id: str,
    topic: str,
    text: str,
) -> None:
    """Save a user correction/convention to Firestore."""
    db = get_db()
    if not db:
        _mock_corrections[correction_id] = {
            "correction_id": correction_id,
            "repo_id": repo_id,
            "topic": topic,
            "text": text,
            "timestamp": datetime.now(timezone.utc)
        }
        return
    try:
        doc_ref = db.collection("corrections").document(correction_id)
        doc_ref.set({
            "correction_id": correction_id,
            "repo_id": repo_id,
            "topic": topic,
            "text": text,
            "timestamp": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        print(f"Warning: Firestore save_correction failed ({e})")


def list_corrections(repo_id: str) -> List[Dict[str, Any]]:
    """List all corrections for a given repository ordered by timestamp descending."""
    db = get_db()
    if not db:
        corrections = [c for c in _mock_corrections.values() if c["repo_id"] == repo_id]
        corrections.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)
        return corrections
    try:
        # Stream docs and sort locally to avoid missing composite index errors
        docs = db.collection("corrections").where("repo_id", "==", repo_id).stream()
        corrections: List[Dict[str, Any]] = []
        for doc in docs:
            data = doc.to_dict() or {}
            data["id"] = doc.id
            corrections.append(data)
        
        # Helper to sort by timestamp
        corrections.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)
        return corrections
    except Exception as e:
        print(f"Warning: Firestore list_corrections failed ({e})")
        return []


def save_checkpoint(
    session_id: str,
    step: int,
    state: Dict[str, Any],
) -> None:
    """Save an agent execution checkpoint to Firestore."""
    db = get_db()
    if not db:
        _mock_checkpoints[f"{session_id}_{step}"] = {
            "session_id": session_id,
            "step": step,
            "state": state,
            "timestamp": datetime.now(timezone.utc)
        }
        return
    try:
        checkpoint_id = f"{session_id}_{step}"
        doc_ref = db.collection("checkpoints").document(checkpoint_id)
        doc_ref.set({
            "session_id": session_id,
            "step": step,
            "state": state,
            "timestamp": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        print(f"Warning: Firestore save_checkpoint failed ({e})")


def get_latest_checkpoint(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the latest checkpoint for a session by step descending."""
    db = get_db()
    if not db:
        cps = [cp for cp in _mock_checkpoints.values() if cp["session_id"] == session_id]
        if cps:
            cps.sort(key=lambda x: x.get("step") or 0, reverse=True)
            return cps[0]
        return None
    try:
        # Stream docs and sort locally to avoid missing composite index errors
        docs = db.collection("checkpoints").where("session_id", "==", session_id).stream()
        checkpoints: List[Dict[str, Any]] = []
        for doc in docs:
            data = doc.to_dict() or {}
            data["id"] = doc.id
            checkpoints.append(data)
        
        if checkpoints:
            checkpoints.sort(key=lambda x: x.get("step") or 0, reverse=True)
            return checkpoints[0]
        return None
    except Exception as e:
        print(f"Warning: Firestore get_latest_checkpoint failed ({e})")
        return None


def log_cost(
    session_id: str,
    model: str,
    tokens_est: int,
    cost_est: float,
) -> None:
    """Log an LLM call cost record to Firestore."""
    db = get_db()
    if not db:
        _mock_costs.append({
            "session_id": session_id,
            "model": model,
            "tokens_est": tokens_est,
            "cost_est": cost_est,
            "timestamp": datetime.now(timezone.utc)
        })
        return
    try:
        db.collection("costs").add({
            "session_id": session_id,
            "model": model,
            "tokens_est": tokens_est,
            "cost_est": cost_est,
            "timestamp": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        print(f"Warning: Firestore log_cost failed ({e})")


def get_cost_summary() -> Dict[str, Any]:
    """
    Get aggregated cost and call summary grouped by model type (flash vs pro).
    """
    db = get_db()
    summary = {
        "flash": {"call_count": 0, "tokens_est": 0, "cost_est": 0.0},
        "pro": {"call_count": 0, "tokens_est": 0, "cost_est": 0.0},
        "other": {"call_count": 0, "tokens_est": 0, "cost_est": 0.0},
        "total_calls": 0,
        "total_cost": 0.0,
    }
    
    costs_to_process = []
    if not db:
        costs_to_process = _mock_costs
    else:
        try:
            docs = db.collection("costs").stream()
            costs_to_process = [d.to_dict() for d in docs]
        except Exception as e:
            print(f"Warning: Firestore get_cost_summary failed ({e})")
            costs_to_process = _mock_costs

    for data in costs_to_process:
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

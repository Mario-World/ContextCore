import pytest
from backend.agents import coordinator, memory_agent
from backend.services import firestore_service, cost_tracker

def test_correction_flow():
    session_id = "test_session_correction"
    repo_id = "test-org/test-repo"
    user_message = "Actually we use CamelCase instead of snake_case for class methods."

    # Process message
    res = coordinator.handle_message(session_id, repo_id, user_message)

    assert res["type"] == "correction_ack"
    assert "Noted!" in res["reply"]
    assert res["topic"] == "naming"
    assert "correction_id" in res

    # Verify checkpoint was saved
    latest_checkpoint = coordinator.resume_if_crashed(session_id)
    assert latest_checkpoint is not None
    assert latest_checkpoint["state"]["stage"] == "complete"
    assert latest_checkpoint["state"]["type"] == "correction_ack"


def test_normal_chat_flow():
    session_id = "test_session_chat"
    repo_id = "test-org/test-repo"
    
    # Store a code chunk first
    memory_agent.store_code_chunk(
        text="def calculate_total(price, tax): return price * (1 + tax)",
        file_path="src/utils/calc.py",
        repo_id=repo_id
    )

    # 1. Normal query triggering Flash model
    user_message = "explain how we calculate totals"
    res = coordinator.handle_message(session_id, repo_id, user_message)

    assert res["type"] == "answer"
    assert "gemini-2.0-flash" in res["model_used"]
    assert "reply" in res
    assert "corrections_applied" in res

    # Check checkpoints
    latest_checkpoint = coordinator.resume_if_crashed(session_id)
    assert latest_checkpoint is not None
    assert latest_checkpoint["state"]["stage"] == "complete"
    assert latest_checkpoint["state"]["model_used"] == "gemini-2.0-flash"

    # 2. Complex query triggering Pro model
    user_message = "generate a refactored calculation module"
    res_pro = coordinator.handle_message(session_id, repo_id, user_message)
    assert res_pro["model_used"] == "gemini-2.5-pro"


def test_memory_graph_generation():
    repo_id = "test-org/graph-repo"
    
    # Store some conventions and chunks
    memory_agent.store_correction(
        text="Always use JWT Bearer tokens for auth",
        topic="auth",
        repo_id=repo_id
    )
    
    graph_data = firestore_service.get_memory_graph(repo_id)
    assert "nodes" in graph_data
    assert "links" in graph_data
    assert "stats" in graph_data
    
    nodes = graph_data["nodes"]
    node_types = set(n["type"] for n in nodes)
    assert "repo" in node_types
    assert "topic" in node_types
    assert "convention" in node_types
    
    stats = graph_data["stats"]
    assert stats["repo_id"] == repo_id
    assert stats["total_nodes"] > 0
    assert stats["conventions_count"] >= 1
    assert stats["enforcement_mode"] == "STRICT"


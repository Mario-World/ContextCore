"""Agents package for ContextCore."""

try:
    from backend.agents.architect_agent import architect_agent
    from backend.agents.memory_agent import retrieve, store_code_chunk, store_correction, build_context_block
    from backend.agents.coordinator import handle_message, resume_if_crashed
except ImportError:
    from agents.architect_agent import architect_agent
    from agents.memory_agent import retrieve, store_code_chunk, store_correction, build_context_block
    from agents.coordinator import handle_message, resume_if_crashed

__all__ = [
    "architect_agent",
    "retrieve",
    "store_code_chunk",
    "store_correction",
    "build_context_block",
    "handle_message",
    "resume_if_crashed",
]

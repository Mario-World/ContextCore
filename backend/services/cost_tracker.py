import re
from typing import Dict, Any

try:
    from backend.services import firestore_service
except ImportError:
    from services import firestore_service


PRO_KEYWORDS = {
    "generate",
    "refactor",
    "architect",
    "implement",
    "build",
    "design",
    "create",
}

RATE_FLASH_PER_1K = 0.00015
RATE_PRO_PER_1K = 0.00125


def choose_model(message: str) -> str:
    """
    Selects the optimal model based on message complexity.
    
    Routes to Pro for complex tasks (e.g. generate, refactor, architect, implement,
    build, design, create) and Flash for lightweight queries/explanations.
    
    Args:
        message: The user query string.
        
    Returns:
        Model name string ('gemini-2.5-pro' or 'gemini-2.0-flash').
    """
    message_lower = message.lower()
    words = set(re.findall(r"\b[a-zA-Z]+\b", message_lower))

    if words.intersection(PRO_KEYWORDS):
        return "gemini-2.5-pro"
    
    return "gemini-2.0-flash"


def record_call(
    session_id: str,
    model: str,
    prompt: str,
    response: str,
) -> Dict[str, Any]:
    """
    Estimates token count and cost, then logs the LLM call to Firestore.
    
    Rough estimation: 1 token ≈ 4 characters.
    Rates per 1k tokens: flash = $0.00015, pro = $0.00125.
    
    Args:
        session_id: The session/conversation identifier.
        model: The model used.
        prompt: Full prompt sent to the model.
        response: Output response text from the model.
        
    Returns:
        Dictionary containing tokens_est and cost_est.
    """
    total_chars = len(prompt) + len(response)
    tokens_est = max(1, total_chars // 4)

    is_pro = "pro" in model.lower()
    rate_per_1k = RATE_PRO_PER_1K if is_pro else RATE_FLASH_PER_1K
    cost_est = (tokens_est / 1000.0) * rate_per_1k

    firestore_service.log_cost(
        session_id=session_id,
        model=model,
        tokens_est=tokens_est,
        cost_est=cost_est,
    )

    return {
        "session_id": session_id,
        "model": model,
        "tokens_est": tokens_est,
        "cost_est": cost_est,
    }

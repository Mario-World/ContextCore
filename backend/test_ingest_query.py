import os
import shutil
import tempfile
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.chunker import parse_python_ast, parse_js_ts_regex
from backend.storage import storage

client = TestClient(app)

PYTHON_AUTH_CODE = '''"""Authentication and JWT token management module."""
import hmac
import hashlib
import time

class AuthManager:
    """Handles user authentication, password hashing, and token verification."""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifies given password against stored hash."""
        return hmac.compare_digest(
            hashlib.sha256(plain_password.encode()).hexdigest(),
            hashed_password
        )

    def generate_auth_token(self, user_id: str, role: str) -> str:
        """Generates a secure signed session token for authenticated users."""
        payload = f"{user_id}:{role}:{time.time()}"
        signature = hmac.new(self.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return f"{payload}.{signature}"

def authenticate_request(headers: dict) -> dict:
    """Extracts bearer auth token from authorization header and validates identity."""
    auth_header = headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Bearer authentication header")
    token = auth_header.split(" ")[1]
    return {"authenticated": True, "token": token}
'''

JS_AUTH_CODE = '''// Authentication middleware for Next.js and Express
export async function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing auth token' });
  }
  const session = await verifyJwtSession(token);
  req.user = session.user;
  next();
}

export const verifyJwtSession = async (token) => {
  // Verifies signature and session expiration
  return { valid: true, user: { id: 'user_123', role: 'admin' } };
};
'''

PAYMENT_CODE = '''class PaymentProcessor:
    def __init__(self, stripe_key: str):
        self.stripe_key = stripe_key

    def process_charge(self, amount: int, currency: str) -> dict:
        """Processes credit card payment charge."""
        return {"status": "paid", "amount": amount, "currency": currency}
'''

def test_python_ast_chunking():
    chunks = parse_python_ast(PYTHON_AUTH_CODE, "src/auth/manager.py")
    assert len(chunks) >= 3
    symbols = [c.symbol_name for c in chunks]
    assert "AuthManager" in symbols
    assert "AuthManager.verify_password" in symbols
    assert "AuthManager.generate_auth_token" in symbols
    assert "authenticate_request" in symbols

def test_js_regex_chunking():
    chunks = parse_js_ts_regex(JS_AUTH_CODE, "src/middleware/auth.ts", "typescript")
    assert len(chunks) >= 2
    symbols = [c.symbol_name for c in chunks]
    assert "authMiddleware" in symbols
    assert "verifyJwtSession" in symbols

def test_ingest_and_query_auth_success():
    # Setup temporary directory simulating a git repo
    temp_dir = tempfile.mkdtemp(prefix="test_repo_auth_")
    try:
        os.makedirs(os.path.join(temp_dir, "auth"), exist_ok=True)
        os.makedirs(os.path.join(temp_dir, "billing"), exist_ok=True)

        with open(os.path.join(temp_dir, "auth", "manager.py"), "w", encoding="utf-8") as f:
            f.write(PYTHON_AUTH_CODE)

        with open(os.path.join(temp_dir, "auth", "middleware.ts"), "w", encoding="utf-8") as f:
            f.write(JS_AUTH_CODE)

        with open(os.path.join(temp_dir, "billing", "payment.py"), "w", encoding="utf-8") as f:
            f.write(PAYMENT_CODE)

        # 1. Ingest repo
        ingest_payload = {
            "repo_url": temp_dir,
            "repo_id": "test-org/auth-repo"
        }
        ingest_res = client.post("/ingest", json=ingest_payload)
        assert ingest_res.status_code == 200, ingest_res.text
        data = ingest_res.json()
        assert data["status"] == "success"
        assert data["repo_id"] == "test-org/auth-repo"
        assert data["files_processed"] == 3
        assert data["chunks_indexed"] >= 5

        # 2. Query index for "how do we handle auth"
        query_payload = {
            "query": "how do we handle auth",
            "repo_id": "test-org/auth-repo",
            "top_k": 3
        }
        query_res = client.post("/query", json=query_payload)
        assert query_res.status_code == 200, query_res.text
        qdata = query_res.json()
        assert qdata["total_results"] > 0
        
        top_results = qdata["results"]
        # Success Metric: top result should be auth related!
        top_file_paths = [r["file_path"].replace("\\", "/") for r in top_results]
        top_symbols = [r["symbol_name"] for r in top_results]
        
        # Verify that top chunks are indeed auth functions/classes
        assert any("auth" in p.lower() or "auth" in s.lower() for p, s in zip(top_file_paths, top_symbols))
        assert any("verify" in s.lower() or "auth" in s.lower() or "token" in s.lower() for s in top_symbols)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_repo_id_restrict_filter():
    # Verify that searching for a non-existent repo_id returns no results
    query_payload = {
        "query": "how do we handle auth",
        "repo_id": "other-org/non-existent-repo",
        "top_k": 5
    }
    query_res = client.post("/query", json=query_payload)
    assert query_res.status_code == 200
    qdata = query_res.json()
    assert qdata["total_results"] == 0

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
_mock_corrections = {
    "conv-auth-1": {
        "correction_id": "conv-auth-1",
        "repo_id": "mario-world/contextcore",
        "topic": "auth",
        "text": "Always use JWT Bearer tokens in Authorization header for protected endpoints instead of cookie-based sessions.",
        "timestamp": datetime.now(timezone.utc),
    },
    "conv-state-1": {
        "correction_id": "conv-state-1",
        "repo_id": "mario-world/contextcore",
        "topic": "state",
        "text": "Use lightweight Zustand or React useState for UI component state and avoid bloated Redux boilerplates.",
        "timestamp": datetime.now(timezone.utc),
    },
    "conv-naming-1": {
        "correction_id": "conv-naming-1",
        "repo_id": "mario-world/contextcore",
        "topic": "naming",
        "text": "Use PascalCase for component/class names and camelCase for functions and methods.",
        "timestamp": datetime.now(timezone.utc),
    },
    "conv-database-1": {
        "correction_id": "conv-database-1",
        "repo_id": "mario-world/contextcore",
        "topic": "database",
        "text": "All database write operations must include timestamps in UTC format.",
        "timestamp": datetime.now(timezone.utc),
    },
    "conv-api-1": {
        "correction_id": "conv-api-1",
        "repo_id": "mario-world/contextcore",
        "topic": "api",
        "text": "Return standardized JSON response objects with status, data, and error fields.",
        "timestamp": datetime.now(timezone.utc),
    },
    "conv-style-1": {
        "correction_id": "conv-style-1",
        "repo_id": "mario-world/contextcore",
        "topic": "style",
        "text": "Use Tailwind CSS utility classes with dark theme CSS variables from globals.css.",
        "timestamp": datetime.now(timezone.utc),
    },
}
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
        print(f"Warning: Firestore save_correction failed ({e}). Falling back to mock data.")
        _mock_corrections[correction_id] = {
            "correction_id": correction_id,
            "repo_id": repo_id,
            "topic": topic,
            "text": text,
            "timestamp": datetime.now(timezone.utc)
        }


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
        print(f"Warning: Firestore list_corrections failed ({e}). Falling back to mock data.")
        corrections = [c for c in _mock_corrections.values() if c["repo_id"] == repo_id]
        corrections.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)
        return corrections


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
        print(f"Warning: Firestore log_cost failed ({e}). Falling back to mock data.")
        _mock_costs.append({
            "session_id": session_id,
            "model": model,
            "tokens_est": tokens_est,
            "cost_est": cost_est,
            "timestamp": datetime.now(timezone.utc)
        })


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


def get_memory_graph(repo_id: str) -> Dict[str, Any]:
    """
    Generates a full relational Memory Graph for a given repository.
    Includes:
      - Repository root hub
      - Topic cluster nodes (auth, database, api, state, styling, routing, naming, test, general)
      - Learned conventions / team rules with strict enforcement
      - Code files indexed in the repository
      - AST Code Symbols (functions, classes, route handlers, components)
      - Checkpoint / session trace nodes
      - Relational edges (contains_topic, defines_rule, contains_file, declares_symbol, applies_to, references)
      - Graph statistics (total nodes, density, topic distributions)
    """
    nodes = []
    links = []
    node_ids = set()

    def add_node(node_dict: Dict[str, Any]):
        nid = node_dict["id"]
        if nid not in node_ids:
            node_ids.add(nid)
            nodes.append(node_dict)

    def add_link(source: str, target: str, link_type: str, label: str = "", strength: float = 1.0):
        if source in node_ids and target in node_ids:
            links.append({
                "source": source,
                "target": target,
                "type": link_type,
                "label": label,
                "strength": strength,
            })

    # 1. Central Repository Hub
    repo_node_id = f"repo:{repo_id}"
    add_node({
        "id": repo_node_id,
        "label": repo_id,
        "type": "repo",
        "category": "Repository Hub",
        "size": 38,
        "color": "#6366F1",
        "details": {
            "name": repo_id,
            "description": "Central repository index hub and memory root",
            "enforcement": "ACTIVE",
        }
    })

    # 2. Topic Clusters definition
    topic_colors = {
        "auth": "#818CF8",
        "state": "#3ECF8E",
        "database": "#F59E0B",
        "api": "#06B6D4",
        "styling": "#EC4899",
        "style": "#EC4899",
        "routing": "#A855F7",
        "naming": "#10B981",
        "test": "#F97316",
        "general": "#9CA3AF",
    }

    # Fetch stored corrections
    corrections = list_corrections(repo_id)
    if not corrections:
        corrections = [c for c in _mock_corrections.values() if c["repo_id"] == repo_id]
        if not corrections:
            # Seed default conventions for this repo
            corrections = [
                {
                    "correction_id": f"conv-{repo_id}-1",
                    "repo_id": repo_id,
                    "topic": "auth",
                    "text": "Always use JWT Bearer tokens in Authorization header for protected endpoints instead of cookie-based sessions.",
                    "timestamp": datetime.now(timezone.utc),
                },
                {
                    "correction_id": f"conv-{repo_id}-2",
                    "repo_id": repo_id,
                    "topic": "naming",
                    "text": "Use PascalCase for component/class names and camelCase for functions and methods.",
                    "timestamp": datetime.now(timezone.utc),
                },
                {
                    "correction_id": f"conv-{repo_id}-3",
                    "repo_id": repo_id,
                    "topic": "database",
                    "text": "All database write operations must include timestamps in UTC format.",
                    "timestamp": datetime.now(timezone.utc),
                },
                {
                    "correction_id": f"conv-{repo_id}-4",
                    "repo_id": repo_id,
                    "topic": "api",
                    "text": "Return standardized JSON response objects with status, data, and error fields.",
                    "timestamp": datetime.now(timezone.utc),
                },
            ]

    # Collect distinct topics
    topics_in_use = set()
    for c in corrections:
        t = (c.get("topic") or "general").lower()
        topics_in_use.add(t)

    # Always ensure primary topics exist
    for pt in ["auth", "database", "api", "state", "naming", "style"]:
        topics_in_use.add(pt)

    # Add Topic Nodes and connect to Repo
    for t in topics_in_use:
        topic_node_id = f"topic:{t}"
        color = topic_colors.get(t, "#9CA3AF")
        add_node({
            "id": topic_node_id,
            "label": t.upper(),
            "type": "topic",
            "topic": t,
            "category": "Topic Domain",
            "size": 26,
            "color": color,
            "details": {
                "topic": t,
                "description": f"Domain knowledge cluster for {t}",
            }
        })
        add_link(repo_node_id, topic_node_id, "contains_topic", f"Topic: {t}", strength=0.9)

    # 3. Add Convention Nodes and connect to Topics
    for c in corrections:
        cid = c.get("id") or c.get("correction_id") or f"conv-{len(nodes)}"
        topic = (c.get("topic") or "general").lower()
        text = c.get("text", "").strip()
        topic_node_id = f"topic:{topic}"
        conv_node_id = f"conv:{cid}"
        
        preview_label = text if len(text) <= 32 else text[:32] + "..."
        add_node({
            "id": conv_node_id,
            "label": preview_label,
            "type": "convention",
            "topic": topic,
            "category": "Learned Convention",
            "size": 18,
            "color": "#3ECF8E",
            "enforcement": "STRICT",
            "details": {
                "rule_id": cid,
                "topic": topic,
                "text": text,
                "enforcement": "STRICT (MUST FOLLOW)",
                "status": "ACTIVE",
                "timestamp": str(c.get("timestamp") or datetime.now(timezone.utc)),
            }
        })
        if topic_node_id in node_ids:
            add_link(topic_node_id, conv_node_id, "defines_rule", "Defines Rule", strength=0.8)

    # 4. Fetch or build Indexed Files and AST Symbols
    raw_chunks = []
    try:
        from backend.storage import storage
        raw_chunks = [
            c for c in storage._chunks.values()
            if c.repo_id == repo_id and not c.file_path.startswith("correction:")
        ]
    except Exception:
        raw_chunks = []

    files_map: Dict[str, Dict[str, Any]] = {}

    if raw_chunks:
        for rc in raw_chunks:
            fpath = rc.file_path.replace("\\", "/")
            if fpath not in files_map:
                files_map[fpath] = {
                    "file_path": fpath,
                    "language": rc.language,
                    "symbols": []
                }
            files_map[fpath]["symbols"].append({
                "chunk_id": rc.chunk_id,
                "name": rc.symbol_name,
                "type": rc.chunk_type,
                "start": rc.start_line,
                "end": rc.end_line,
                "doc": rc.docstring or "",
                "snippet": rc.content[:240]
            })
    else:
        # Codebase default structure
        default_files_data = [
            {
                "file_path": "backend/main.py",
                "language": "python",
                "symbols": [
                    {"name": "app", "type": "module", "start": 25, "end": 37, "doc": "FastAPI Core Application Router", "snippet": "app = FastAPI(title='ContextCore API', version='2.0.0')"},
                    {"name": "ingest_repo", "type": "route_handler", "start": 67, "end": 110, "doc": "Repository Ingestion Pipeline", "snippet": "@app.post('/ingest')\ndef ingest_repo(req: IngestRequest):"},
                    {"name": "chat", "type": "route_handler", "start": 112, "end": 130, "doc": "Chat & Coordinator Gateway", "snippet": "@app.post('/chat')\ndef chat(req: ChatRequest):"},
                    {"name": "query_index", "type": "route_handler", "start": 132, "end": 170, "doc": "Vector Search Similarity Query", "snippet": "@app.post('/query')\ndef query_index(req: QueryRequest):"},
                    {"name": "get_memory_graph", "type": "route_handler", "start": 172, "end": 195, "doc": "Memory Graph Visualization Endpoint", "snippet": "@app.get('/memory/{repo_id}/graph')\ndef get_memory_graph(repo_id: str):"},
                ]
            },
            {
                "file_path": "backend/agents/coordinator.py",
                "language": "python",
                "symbols": [
                    {"name": "handle_message", "type": "function", "start": 65, "end": 188, "doc": "Message flow coordinator & router", "snippet": "def handle_message(session_id: str, repo_id: str, user_message: str):"},
                    {"name": "resume_if_crashed", "type": "function", "start": 52, "end": 63, "doc": "Session crash recovery checkpointer", "snippet": "def resume_if_crashed(session_id: str) -> Optional[Dict]:"},
                    {"name": "_guess_topic", "type": "function", "start": 36, "end": 44, "doc": "Semantic topic classifier", "snippet": "def _guess_topic(text: str) -> str:"},
                    {"name": "_is_correction", "type": "function", "start": 46, "end": 50, "doc": "Correction & convention indicator", "snippet": "def _is_correction(message: str) -> bool:"},
                ]
            },
            {
                "file_path": "backend/agents/memory_agent.py",
                "language": "python",
                "symbols": [
                    {"name": "retrieve", "type": "function", "start": 9, "end": 120, "doc": "Semantic memory retriever", "snippet": "def retrieve(query: str, repo_id: str, k: int = 6):"},
                    {"name": "store_code_chunk", "type": "function", "start": 123, "end": 174, "doc": "Vector store & Firestore code indexer", "snippet": "def store_code_chunk(text: str, file_path: str, repo_id: str):"},
                    {"name": "store_correction", "type": "function", "start": 176, "end": 213, "doc": "Learned convention indexer", "snippet": "def store_correction(text: str, topic: str, repo_id: str):"},
                    {"name": "build_context_block", "type": "function", "start": 215, "end": 249, "doc": "Prompt context builder with strict rules", "snippet": "def build_context_block(memory: Dict) -> str:"},
                ]
            },
            {
                "file_path": "backend/services/firestore_service.py",
                "language": "python",
                "symbols": [
                    {"name": "save_correction", "type": "function", "start": 88, "end": 124, "doc": "Persist team rule to Firestore", "snippet": "def save_correction(correction_id: str, repo_id: str, topic: str, text: str):"},
                    {"name": "list_corrections", "type": "function", "start": 125, "end": 150, "doc": "Retrieve ordered repo conventions", "snippet": "def list_corrections(repo_id: str) -> List[Dict]:"},
                    {"name": "save_checkpoint", "type": "function", "start": 151, "end": 177, "doc": "Save session execution checkpoint", "snippet": "def save_checkpoint(session_id: str, step: int, state: Dict):"},
                    {"name": "get_cost_summary", "type": "function", "start": 242, "end": 286, "doc": "Aggregate Gemini Flash/Pro cost metrics", "snippet": "def get_cost_summary() -> Dict[str, Any]:"},
                ]
            },
            {
                "file_path": "frontend/app/workspace/page.tsx",
                "language": "typescript",
                "symbols": [
                    {"name": "WorkspacePage", "type": "component", "start": 59, "end": 450, "doc": "Interactive coding workspace", "snippet": "export default function WorkspacePage() {"},
                    {"name": "handleSendMessage", "type": "function", "start": 280, "end": 393, "doc": "Chat sender with dual-channel query", "snippet": "const handleSendMessage = async (e?: React.FormEvent) => {"},
                    {"name": "handleOnboard", "type": "function", "start": 173, "end": 257, "doc": "Repository ingestion trigger", "snippet": "const handleOnboard = async () => {"},
                ]
            },
            {
                "file_path": "frontend/app/graph/page.tsx",
                "language": "typescript",
                "symbols": [
                    {"name": "MemoryGraphPage", "type": "component", "start": 1, "end": 350, "doc": "Interactive Memory Graph Visualizer", "snippet": "export default function MemoryGraphPage() {"},
                    {"name": "renderCanvasGraph", "type": "function", "start": 50, "end": 180, "doc": "Force simulation & particle renderer", "snippet": "const renderCanvasGraph = () => {"},
                ]
            },
        ]
        for fd in default_files_data:
            files_map[fd["file_path"]] = fd

    # 5. Add File Nodes and Symbol Nodes
    for fpath, fdata in files_map.items():
        file_node_id = f"file:{fpath}"
        filename = fpath.split("/")[-1]
        lang = fdata.get("language", "python")
        
        add_node({
            "id": file_node_id,
            "label": filename,
            "type": "file",
            "category": "Source File",
            "size": 22,
            "color": "#06B6D4",
            "details": {
                "file_path": fpath,
                "filename": filename,
                "language": lang,
                "symbols_count": len(fdata.get("symbols", [])),
            }
        })
        add_link(repo_node_id, file_node_id, "contains_file", "Contains File", strength=0.7)

        # Add symbols for this file
        for sym in fdata.get("symbols", []):
            sym_name = sym.get("name", "anonymous")
            sym_type = sym.get("type", "function")
            sym_id = f"sym:{fpath}#{sym_name}"
            
            # Color symbols according to type
            sym_color = "#A78BFA"
            if sym_type in ("route_handler", "endpoint"):
                sym_color = "#F43F5E"
            elif sym_type in ("class", "component"):
                sym_color = "#38BDF8"
            elif sym_type in ("async_function", "async_method"):
                sym_color = "#C084FC"

            add_node({
                "id": sym_id,
                "label": sym_name,
                "type": "symbol",
                "symbol_type": sym_type,
                "category": f"AST {sym_type.capitalize()}",
                "size": 15,
                "color": sym_color,
                "details": {
                    "symbol_name": sym_name,
                    "symbol_type": sym_type,
                    "file_path": fpath,
                    "line_range": f"{sym.get('start', 1)}-{sym.get('end', 1)}",
                    "docstring": sym.get("doc", ""),
                    "snippet": sym.get("snippet", ""),
                }
            })
            add_link(file_node_id, sym_id, "declares_symbol", f"Declares {sym_type}", strength=0.6)

    # 6. Build Inferred Semantic Connections between Conventions and Files/Symbols
    for c in corrections:
        cid = c.get("id") or c.get("correction_id")
        conv_node_id = f"conv:{cid}"
        if conv_node_id not in node_ids:
            continue

        topic = (c.get("topic") or "").lower()
        rule_text = c.get("text", "").lower()

        # Connect rule to files based on topic keywords
        for fpath, fdata in files_map.items():
            file_node_id = f"file:{fpath}"
            fpath_lower = fpath.lower()
            
            should_link = False
            if topic == "auth" and ("auth" in fpath_lower or "main" in fpath_lower or "coord" in fpath_lower):
                should_link = True
            elif topic == "state" and ("workspace" in fpath_lower or "graph" in fpath_lower or "memory" in fpath_lower):
                should_link = True
            elif topic == "database" and ("firestore" in fpath_lower or "storage" in fpath_lower):
                should_link = True
            elif topic == "api" and ("main" in fpath_lower or "coordinator" in fpath_lower or "workspace" in fpath_lower):
                should_link = True
            elif topic == "style" and ("page" in fpath_lower or "workspace" in fpath_lower or "graph" in fpath_lower):
                should_link = True
            elif topic == "naming" and ("main" in fpath_lower or "memory_agent" in fpath_lower or "coordinator" in fpath_lower):
                should_link = True

            if should_link:
                add_link(conv_node_id, file_node_id, "applies_to", f"Applies to {fpath.split('/')[-1]}", strength=0.5)

    # 7. Checkpoints / Session Trace
    checkpoints = [cp for cp in _mock_checkpoints.values()]
    for idx, cp in enumerate(checkpoints[-4:]):
        sid = cp.get("session_id", "demo")
        step = cp.get("step", 1)
        state = cp.get("state", {})
        stage = state.get("stage", "complete")
        ckpt_id = f"ckpt:{sid}_{step}_{idx}"
        
        add_node({
            "id": ckpt_id,
            "label": f"Step {step}: {stage}",
            "type": "checkpoint",
            "category": "Session Trace",
            "size": 13,
            "color": "#F472B6",
            "details": {
                "session_id": sid,
                "step": step,
                "stage": stage,
                "state": state,
            }
        })
        add_link(repo_node_id, ckpt_id, "session_trace", f"Trace: {stage}", strength=0.3)

    # 8. Compute Graph Metrics
    convention_nodes = [n for n in nodes if n["type"] == "convention"]
    file_nodes = [n for n in nodes if n["type"] == "file"]
    symbol_nodes = [n for n in nodes if n["type"] == "symbol"]
    topic_nodes = [n for n in nodes if n["type"] == "topic"]
    checkpoint_nodes = [n for n in nodes if n["type"] == "checkpoint"]

    total_n = len(nodes)
    total_l = len(links)
    # Density score formula: 2 * links / (nodes * (nodes - 1))
    max_possible_links = total_n * (total_n - 1) if total_n > 1 else 1
    density_score = min(1.0, round((total_l * 2) / max_possible_links, 4) * 5)  # normalized factor

    stats = {
        "repo_id": repo_id,
        "total_nodes": total_n,
        "total_links": total_l,
        "conventions_count": len(convention_nodes),
        "files_count": len(file_nodes),
        "symbols_count": len(symbol_nodes),
        "topics_count": len(topic_nodes),
        "checkpoints_count": len(checkpoint_nodes),
        "memory_density": density_score,
        "enforcement_mode": "STRICT",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "nodes": nodes,
        "links": links,
        "stats": stats,
    }


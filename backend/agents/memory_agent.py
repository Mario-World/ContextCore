from typing import Dict, List, Any

try:
    from backend.services import embedding_service, vector_store, firestore_service
except ImportError:
    from services import embedding_service, vector_store, firestore_service


def retrieve(query: str, repo_id: str, k: int = 6) -> Dict[str, List[Dict[str, Any]]]:
    """
    Retrieves semantically relevant corrections and code chunks for a given query and repo.
    
    Args:
        query: User input or code query string.
        repo_id: The repository identifier.
        k: Number of code chunk neighbors to retrieve (default: 6).
        
    Returns:
        Dictionary containing 'corrections' and 'code_chunks' lists.
    """
    # Generate query embedding
    query_embedding = embedding_service.embed_text(query, task_type="retrieval_query")

    # Query vector store for corrections and code chunks
    correction_matches = []
    code_matches = []

    try:
        correction_matches = vector_store.query_vectors(
            embedding=query_embedding,
            repo_id=repo_id,
            num_neighbors=3,
            doc_type="correction",
        )
    except Exception as e:
        print(f"Warning: vector search for corrections failed ({e})")

    try:
        code_matches = vector_store.query_vectors(
            embedding=query_embedding,
            repo_id=repo_id,
            num_neighbors=k,
            doc_type="code_chunk",
        )
    except Exception as e:
        print(f"Warning: vector search for code_chunks failed ({e})")

    # Extract IDs
    correction_ids = [m["id"] for m in correction_matches if "id" in m]
    code_ids = [m["id"] for m in code_matches if "id" in m]

    # Fetch texts from Firestore
    corrections = firestore_service.get_chunk_texts(correction_ids) if correction_ids else []
    code_chunks = firestore_service.get_chunk_texts(code_ids) if code_ids else []

    # Fallback to local storage search if code_chunks is empty
    if not code_chunks:
        try:
            from backend.storage import storage
            local_results = storage.search_vectors(
                query_vector=query_embedding,
                repo_id=repo_id,
                top_k=k
            )
            for lr in local_results:
                if not lr.file_path.startswith("correction:"):
                    code_chunks.append({
                        "id": lr.chunk_id,
                        "chunk_id": lr.chunk_id,
                        "repo_id": lr.repo_id,
                        "text": lr.content,
                        "file_path": lr.file_path,
                        "symbol_name": lr.symbol_name,
                        "chunk_type": lr.chunk_type,
                        "start_line": lr.start_line,
                        "end_line": lr.end_line,
                        "language": lr.language,
                        "doc_type": "code_chunk"
                    })
        except Exception as e:
            print(f"Warning: local storage fallback query failed ({e})")

    # If vector search yielded no corrections, fall back to listing recent corrections for the repo
    if not corrections:
        try:
            recent_corrections = firestore_service.list_corrections(repo_id)
            corrections = recent_corrections[:3]
        except Exception:
            pass

    # If still no corrections, search local storage for correction records
    if not corrections:
        try:
            from backend.storage import storage
            local_results = storage.search_vectors(
                query_vector=query_embedding,
                repo_id=repo_id,
                top_k=15
            )
            for lr in local_results:
                if lr.file_path.startswith("correction:"):
                    topic = lr.file_path.split(":", 1)[1] if ":" in lr.file_path else "General"
                    corrections.append({
                        "id": lr.chunk_id,
                        "correction_id": lr.chunk_id,
                        "repo_id": lr.repo_id,
                        "text": lr.content,
                        "file_path": lr.file_path,
                        "topic": topic,
                        "doc_type": "correction"
                    })
                    if len(corrections) >= 3:
                        break
        except Exception as e:
            print(f"Warning: local storage fallback corrections query failed ({e})")

    return {
        "corrections": corrections,
        "code_chunks": code_chunks,
    }


def store_code_chunk(text: str, file_path: str, repo_id: str) -> str:
    """
    Embeds and stores a code chunk in Vector Search and Firestore.
    
    Args:
        text: Source code chunk content.
        file_path: Relative or absolute file path.
        repo_id: Repository identifier.
        
    Returns:
        The generated chunk_id / datapoint_id.
    """
    embedding = embedding_service.embed_text(text, task_type="retrieval_document")
    chunk_id = vector_store.upsert_vector(
        embedding=embedding,
        repo_id=repo_id,
        doc_type="code_chunk",
    )

    firestore_service.save_chunk_text(
        chunk_id=chunk_id,
        repo_id=repo_id,
        text=text,
        file_path=file_path,
        doc_type="code_chunk",
    )

    # Local fallback storage bridge
    try:
        from backend.storage import storage
        from backend.chunker import CodeChunk
        mock_chunk = CodeChunk(
            chunk_id=chunk_id,
            file_path=file_path,
            symbol_name=file_path.split("/")[-1].split(".")[0],
            chunk_type="block",
            start_line=1,
            end_line=max(1, len(text.splitlines())),
            content=text,
            docstring="",
            language="python" if file_path.endswith(".py") else "typescript"
        )
        storage.upsert_chunks_and_vectors(
            repo_id=repo_id,
            chunks=[mock_chunk],
            embeddings=[embedding]
        )
    except Exception as e:
        print(f"Warning: Failed to save to local storage fallback ({e})")

    return chunk_id


def store_correction(text: str, topic: str, repo_id: str) -> str:
    """
    Embeds and stores a team correction / convention in Vector Search and Firestore.
    
    Args:
        text: Correction rule or instruction text.
        topic: Topic or domain (e.g. auth, state, test, database, api).
        repo_id: Repository identifier.
        
    Returns:
        The generated correction_id / datapoint_id.
    """
    embedding = embedding_service.embed_text(text, task_type="retrieval_document")
    correction_id = vector_store.upsert_vector(
        embedding=embedding,
        repo_id=repo_id,
        doc_type="correction",
    )

    # Save to corrections collection
    firestore_service.save_correction(
        correction_id=correction_id,
        repo_id=repo_id,
        topic=topic,
        text=text,
    )

    # Also save as chunk text so get_chunk_texts can retrieve it
    firestore_service.save_chunk_text(
        chunk_id=correction_id,
        repo_id=repo_id,
        text=text,
        file_path=f"correction:{topic}",
        doc_type="correction",
    )

    return correction_id


def build_context_block(memory: Dict[str, List[Dict[str, Any]]]) -> str:
    """
    Formats retrieved corrections and code chunks into a structured prompt context block.
    
    Corrections are explicitly highlighted with 'MUST follow' instructions.
    
    Args:
        memory: Dictionary with 'corrections' and 'code_chunks' lists.
        
    Returns:
        A formatted markdown string ready for injection into the agent's prompt.
    """
    parts: List[str] = []

    corrections = memory.get("corrections", [])
    if corrections:
        parts.append("=== TEAM CONVENTIONS & CORRECTIONS (MUST follow over generic best practice) ===")
        for c in corrections:
            topic = c.get("topic") or "General"
            text = c.get("text", "").strip()
            parts.append(f"- [{topic.upper()}]: {text}")
        parts.append("")

    code_chunks = memory.get("code_chunks", [])
    if code_chunks:
        parts.append("=== RELEVANT CODEBASE CONTEXT ===")
        for idx, chunk in enumerate(code_chunks, 1):
            fpath = chunk.get("file_path", "unknown")
            text = chunk.get("text", "").strip()
            parts.append(f"--- Chunk {idx} | File: {fpath} ---")
            parts.append(text)
            parts.append("")

    return "\n".join(parts).strip()

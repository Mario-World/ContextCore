import re
from typing import List, Dict, Any


# Regex pattern to match function and class boundary declarations
BOUNDARY_REGEX = re.compile(
    r"^(?:(?:export\s+(?:default\s+)?)?(?:async\s+)?function\b|"
    r"(?:export\s+(?:default\s+)?)?class\b|"
    r"def\b|"
    r"(?:export\s+)?(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)?\s*=>|"
    r"(?:export\s+)?(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*(?:async\s+)?function\b|"
    r"(?:export\s+)?(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*\()",
    re.MULTILINE,
)


def _split_into_capped_chunks(segment: str, max_chars: int = 3000) -> List[str]:
    """Splits a text segment so that no sub-chunk exceeds max_chars."""
    if len(segment) <= max_chars:
        return [segment]

    subchunks = []
    lines = segment.splitlines(keepends=True)
    current_chunk = []
    current_length = 0

    for line in lines:
        if current_length + len(line) > max_chars and current_chunk:
            subchunks.append("".join(current_chunk))
            current_chunk = [line]
            current_length = len(line)
        else:
            current_chunk.append(line)
            current_length += len(line)

    if current_chunk:
        remaining = "".join(current_chunk)
        # If single line is larger than max_chars, hard-slice it
        while len(remaining) > max_chars:
            subchunks.append(remaining[:max_chars])
            remaining = remaining[max_chars:]
        if remaining:
            subchunks.append(remaining)

    return subchunks


def chunk_file(text: str, file_path: str) -> List[Dict[str, str]]:
    """
    Parses and chunks code text into semantic units based on function and class definitions.
    
    Splits text on boundaries such as `def`, `class`, `function`, `const X = (`, `async function`,
    and `export function`. If no structural boundaries are detected, falls back to fixed 1500-character
    chunks. Guarantees that no single chunk exceeds 3000 characters.
    
    Args:
        text: Source code content as a string.
        file_path: The file path associated with this code (used for metadata).
        
    Returns:
        A list of dictionaries where each item has 'text' (the chunk string) and 'file_path'.
        Example: [{'text': 'def hello():...', 'file_path': 'src/app.py'}]
    """
    if not text or not text.strip():
        return []

    # Find boundary indices
    matches = list(BOUNDARY_REGEX.finditer(text))

    raw_segments: List[str] = []

    if not matches:
        # Fallback to fixed 1500-character chunks
        chunk_size = 1500
        for i in range(0, len(text), chunk_size):
            segment = text[i : i + chunk_size]
            if segment.strip():
                raw_segments.append(segment)
    else:
        # Include preamble if there is code before first match
        if matches[0].start() > 0:
            preamble = text[: matches[0].start()]
            if preamble.strip():
                raw_segments.append(preamble)

        # Slice between consecutive matches
        for i in range(len(matches)):
            start_pos = matches[i].start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            segment = text[start_pos:end_pos]
            if segment.strip():
                raw_segments.append(segment)

    # Enforce maximum chunk size cap of 3000 chars
    final_chunks: List[Dict[str, str]] = []
    for seg in raw_segments:
        for chunk_text in _split_into_capped_chunks(seg, max_chars=3000):
            trimmed = chunk_text.strip()
            if trimmed:
                final_chunks.append({
                    "text": trimmed,
                    "file_path": file_path,
                })

    return final_chunks

import ast
import re
from typing import List, Optional
from pydantic import BaseModel, Field

class CodeChunk(BaseModel):
    chunk_id: str
    file_path: str
    symbol_name: str
    chunk_type: str  # 'function', 'async_function', 'class', 'method', 'module', 'block', 'text'
    start_line: int
    end_line: int
    content: str
    docstring: Optional[str] = None
    language: str

def parse_python_ast(content: str, file_path: str) -> List[CodeChunk]:
    chunks: List[CodeChunk] = []
    lines = content.splitlines()
    total_lines = len(lines)
    
    try:
        tree = ast.parse(content)
    except SyntaxError:
        # Fallback to block chunking if python syntax fails
        return parse_fallback_text(content, file_path, "python")

    covered_line_ranges = []

    def get_source_segment(node: ast.AST) -> tuple[int, int, str]:
        start = getattr(node, "lineno", 1)
        end = getattr(node, "end_lineno", start)
        segment = "\n".join(lines[start - 1 : end])
        return start, end, segment

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            start, end, segment = get_source_segment(node)
            docstring = ast.get_docstring(node)
            chunk_type = "async_function" if isinstance(node, ast.AsyncFunctionDef) else "function"
            chunk_id = f"{file_path}#{node.name}:{start}-{end}"
            chunks.append(CodeChunk(
                chunk_id=chunk_id,
                file_path=file_path,
                symbol_name=node.name,
                chunk_type=chunk_type,
                start_line=start,
                end_line=end,
                content=segment,
                docstring=docstring,
                language="python"
            ))
            covered_line_ranges.append((start, end))

        elif isinstance(node, ast.ClassDef):
            start, end, segment = get_source_segment(node)
            docstring = ast.get_docstring(node)
            chunk_id = f"{file_path}#{node.name}:{start}-{end}"
            
            # Add the class chunk
            chunks.append(CodeChunk(
                chunk_id=chunk_id,
                file_path=file_path,
                symbol_name=node.name,
                chunk_type="class",
                start_line=start,
                end_line=end,
                content=segment,
                docstring=docstring,
                language="python"
            ))
            covered_line_ranges.append((start, end))

            # Also index individual methods if class is large
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    m_start, m_end, m_segment = get_source_segment(item)
                    m_doc = ast.get_docstring(item)
                    m_type = "async_method" if isinstance(item, ast.AsyncFunctionDef) else "method"
                    m_id = f"{file_path}#{node.name}.{item.name}:{m_start}-{m_end}"
                    chunks.append(CodeChunk(
                        chunk_id=m_id,
                        file_path=file_path,
                        symbol_name=f"{node.name}.{item.name}",
                        chunk_type=m_type,
                        start_line=m_start,
                        end_line=m_end,
                        content=m_segment,
                        docstring=m_doc,
                        language="python"
                    ))

    # If file had no functions or classes, or has significant module level code
    if not chunks and content.strip():
        return parse_fallback_text(content, file_path, "python")

    return chunks

def parse_js_ts_regex(content: str, file_path: str, language: str = "javascript") -> List[CodeChunk]:
    chunks: List[CodeChunk] = []
    lines = content.splitlines()
    if not lines:
        return chunks

    # Regex patterns for functions, arrow functions, classes
    patterns = [
        # export default function name(...) or function name(...) or async function
        (r'^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\([^{]*\)\s*\{', "function"),
        # const/let/var name = (async)? (...) =>
        (r'^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{?', "function"),
        # const/let/var name = function(...)
        (r'^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\([^{]*\)\s*\{', "function"),
        # class Name
        (r'^(?:export\s+(?:default\s+)?)?class\s+([a-zA-Z0-9_$]+)', "class"),
        # Next.js / Express style route handlers: export async function GET / POST / etc
        (r'^export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(', "route_handler"),
    ]

    matched_indices = []
    for idx, line in enumerate(lines):
        line_strip = line.strip()
        for pat, ctype in patterns:
            match = re.search(pat, line_strip)
            if match:
                symbol = match.group(1) if match.groups() else "anonymous"
                matched_indices.append((idx, symbol, ctype))
                break

    if not matched_indices:
        return parse_fallback_text(content, file_path, language)

    # For each matched symbol, estimate block boundaries via bracket counting or till next symbol
    for i, (line_idx, symbol, ctype) in enumerate(matched_indices):
        start_line = line_idx + 1
        
        # Scan forward to find closing brace or next symbol
        brace_count = 0
        found_open = False
        end_idx = line_idx
        
        for j in range(line_idx, len(lines)):
            curr_line = lines[j]
            for ch in curr_line:
                if ch == '{':
                    brace_count += 1
                    found_open = True
                elif ch == '}':
                    brace_count -= 1
                    if found_open and brace_count == 0:
                        end_idx = j
                        break
            if found_open and brace_count == 0:
                end_idx = j
                break
        
        # If bracket parsing didn't find end, bound by next symbol or max 80 lines
        if not found_open or brace_count != 0:
            if i + 1 < len(matched_indices):
                end_idx = max(line_idx, matched_indices[i + 1][0] - 1)
            else:
                end_idx = min(len(lines) - 1, line_idx + 60)

        end_line = end_idx + 1
        segment = "\n".join(lines[line_idx : end_idx + 1])
        chunk_id = f"{file_path}#{symbol}:{start_line}-{end_line}"
        
        chunks.append(CodeChunk(
            chunk_id=chunk_id,
            file_path=file_path,
            symbol_name=symbol,
            chunk_type=ctype,
            start_line=start_line,
            end_line=end_line,
            content=segment,
            language=language
        ))

    return chunks

def parse_fallback_text(content: str, file_path: str, language: str = "text", window_size: int = 50, overlap: int = 10) -> List[CodeChunk]:
    chunks: List[CodeChunk] = []
    lines = content.splitlines()
    if not lines:
        return chunks

    total_lines = len(lines)
    step = max(1, window_size - overlap)
    
    for i in range(0, total_lines, step):
        start = i + 1
        end = min(total_lines, i + window_size)
        segment = "\n".join(lines[i:end])
        if not segment.strip():
            continue
        chunk_id = f"{file_path}#block:{start}-{end}"
        chunks.append(CodeChunk(
            chunk_id=chunk_id,
            file_path=file_path,
            symbol_name=f"block_{start}_{end}",
            chunk_type="block",
            start_line=start,
            end_line=end,
            content=segment,
            language=language
        ))
        if end >= total_lines:
            break

    return chunks

def chunk_file(file_path: str, content: str) -> List[CodeChunk]:
    norm_path = file_path.replace("\\", "/").lower()
    
    if norm_path.endswith(".py"):
        return parse_python_ast(content, file_path)
    elif norm_path.endswith((".js", ".jsx", ".mjs", ".cjs")):
        return parse_js_ts_regex(content, file_path, "javascript")
    elif norm_path.endswith((".ts", ".tsx", ".mts", ".cts")):
        return parse_js_ts_regex(content, file_path, "typescript")
    elif norm_path.endswith((".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".sql", ".sh", ".bash", ".html", ".css")):
        lang = norm_path.split(".")[-1]
        return parse_fallback_text(content, file_path, lang)
    else:
        return []

import os
import shutil
import stat
import tempfile
from typing import List
from urllib.parse import urlparse, urlunparse

try:
    from backend.config import settings
except ImportError:
    from config import settings

import git


def _remove_readonly(func, path, _):
    """Clear the readonly bit and reattempt file removal (handles Windows git files)."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


def clone_repo(github_url: str) -> str:
    """
    Clones a GitHub repository to a temporary local directory.
    
    Uses GITHUB_TOKEN from configuration for authenticating private repositories if available.
    
    Args:
        github_url: The URL of the GitHub repository (e.g., 'https://github.com/owner/repo').
        
    Returns:
        The local filesystem path to the cloned repository.
    """
    temp_dir = tempfile.mkdtemp(prefix="contextcore_clone_")
    auth_url = github_url.strip()
    
    token = getattr(settings, "GITHUB_TOKEN", "") or os.getenv("GITHUB_TOKEN", "")
    if token and ("github.com" in auth_url) and ("@" not in auth_url):
        parsed = urlparse(auth_url)
        if parsed.scheme in ("http", "https"):
            netloc = f"{token}@{parsed.netloc}"
            auth_url = urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))

    try:
        git.Repo.clone_from(auth_url, temp_dir, depth=1)
        return temp_dir
    except Exception as e:
        cleanup_repo(temp_dir)
        raise RuntimeError(f"Failed to clone repository '{github_url}': {str(e)}") from e


def list_code_files(repo_path: str) -> List[str]:
    """
    Walks a repository directory and returns a list of source code files.
    
    Filters for relevant code extensions (.py, .js, .ts, .tsx, .jsx, .java, .go)
    and ignores non-source / build directories (node_modules, .git, venv, __pycache__, dist, build, .next).
    
    Args:
        repo_path: The local filesystem path to the repository.
        
    Returns:
        List of absolute file paths for matching source code files.
    """
    target_extensions = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go"}
    skip_dirs = {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", ".next", "env"}

    code_files: List[str] = []

    for root, dirs, files in os.walk(repo_path):
        # Prune unwanted directories in-place
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in target_extensions and not file.startswith("."):
                full_path = os.path.join(root, file)
                code_files.append(os.path.normpath(full_path))

    return code_files


def cleanup_repo(repo_path: str) -> None:
    """
    Removes a local repository temporary directory and its contents.
    
    Args:
        repo_path: The local filesystem path of the repository to delete.
    """
    if repo_path and os.path.exists(repo_path):
        shutil.rmtree(repo_path, onerror=_remove_readonly)

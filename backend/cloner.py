import os
import shutil
import tempfile
from typing import Dict, List, Optional
import git

IGNORED_DIRS = {
    ".git", ".next", "node_modules", "dist", "build", "__pycache__",
    ".pytest_cache", ".venv", "venv", "env", ".idea", ".vscode", "coverage", ".turbo", "data"
}

IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
    ".pyc", ".pyo", ".pyd", ".so", ".dll", ".dylib", ".exe",
    ".woff", ".woff2", ".eot", ".ttf", ".otf",
    ".lock", ".log", ".mp4", ".mp3", ".wav"
}

class ClonedRepo:
    def __init__(self, temp_dir: Optional[str], repo_path: str, is_temp: bool = True):
        self.temp_dir = temp_dir
        self.repo_path = repo_path
        self.is_temp = is_temp

    def get_code_files(self) -> Dict[str, str]:
        """Walks repository and returns a map of {relative_path: content} for valid code files."""
        files_map: Dict[str, str] = {}
        for root, dirs, files in os.walk(self.repo_path):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in IGNORED_EXTENSIONS or file.startswith("."):
                    continue

                abs_file_path = os.path.join(root, file)
                rel_file_path = os.path.relpath(abs_file_path, self.repo_path).replace("\\", "/")

                # Read text safely
                try:
                    with open(abs_file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    # Skip empty or excessively huge generated files (> 1MB)
                    if content.strip() and len(content) < 1_000_000:
                        files_map[rel_file_path] = content
                except Exception:
                    continue

        return files_map

    def cleanup(self):
        if self.is_temp and self.temp_dir and os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            except Exception:
                pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

def clone_repository(repo_url_or_path: str, branch: Optional[str] = None) -> ClonedRepo:
    """Clones a remote git repo or references a local directory."""
    # Check if input is an existing local directory
    if os.path.isdir(repo_url_or_path):
        return ClonedRepo(temp_dir=None, repo_path=os.path.abspath(repo_url_or_path), is_temp=False)

    temp_dir = tempfile.mkdtemp(prefix="contextcore_clone_")
    clone_kwargs = {"depth": 1}
    if branch:
        clone_kwargs["branch"] = branch

    try:
        git.Repo.clone_from(repo_url_or_path, temp_dir, **clone_kwargs)
        return ClonedRepo(temp_dir=temp_dir, repo_path=temp_dir, is_temp=True)
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"Failed to clone repository '{repo_url_or_path}': {str(e)}") from e

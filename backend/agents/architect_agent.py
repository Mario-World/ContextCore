from google.adk.agents import LlmAgent

try:
    from backend.tools.github_tools import clone_repo, list_code_files, cleanup_repo
    from backend.tools.code_parser import chunk_file
except ImportError:
    from tools.github_tools import clone_repo, list_code_files, cleanup_repo
    from tools.code_parser import chunk_file

ARCHITECT_INSTRUCTION = """
You are ContextCore, an expert collaborative coding partner that remembers the entire codebase and learns from every correction.

Your core operational principles:
1. ALWAYS apply any provided team conventions, corrections, or custom rules—even when they differ from or contradict generic industry standard best practices. Team conventions are absolute.
2. Ground all answers and code modifications strictly in the provided codebase context and chunk references.
3. Be concise, precise, production-ready, and maintainable in all code solutions.
4. When writing code, preserve surrounding patterns, styles, imports, and frameworks used by the team.
"""

# Base architect LlmAgent configured with Google ADK 2.0
architect_agent = LlmAgent(
    name="architect_agent",
    model="gemini-2.0-flash",
    instruction=ARCHITECT_INSTRUCTION,
    tools=[
        clone_repo,
        list_code_files,
        cleanup_repo,
        chunk_file,
    ],
)

# ContextCore | Persistent Memory AI Coding Partner

ContextCore is a persistent-memory AI coding partner that learns your codebase and remembers your team’s coding conventions—so you don’t have to repeat them.
 

## The Problem

Every LLM coding assistant today has the same failure mode: it's brilliant and
then it forgets.

- **Context window amnesia** — you explain your auth pattern, naming
  conventions, and architectural decisions in every single session. The model
  never carries it forward.
- **Codebase scale exceeds context** — a real repo is 50k–500k lines. You
  can't paste it all into a prompt every time.
- **Enterprise trust = reliability, not cleverness** — enterprises don't adopt
  agents because they're smart once; they adopt them when they don't lose
  work, don't repeat mistakes, and don't silently die mid-task.

ContextCore is a proof-of-concept that a memory layer — not a smarter model —
is what turns a coding assistant into a coding *partner*.

## Who this is for

- Engineering teams onboarding AI pair-programmers into large legacy codebases
- Consultancies juggling many client repos, each with different conventions
- Platform teams evaluating whether to build an in-house coding agent or buy one

---

## Core Loop

1. **Onboard** a GitHub repo → chunked by function/class → embedded → indexed
2. **Chat** with the agent about the codebase → it retrieves relevant context
   from long-term memory before answering
3. **Correct** the agent → the correction is persisted permanently, not just
   for this session
4. **Ask again** → the agent applies the correction automatically, with no
   reminder
5. **If the process crashes mid-task** → it resumes from the last checkpoint,
   no lost work
6. **Cost dashboard** → shows Flash vs. Pro model usage and real-time
   estimated spend

---

![ContextCore Architecture Diagram](./file:///D:/ChatGPT%20Image%20Aug%2031,%202026,%2007_55_23%20PM.svg)

---

## 🏗 Tech Stack 
| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 + shadcn/ui + Tailwind | Developer workspace |
| **Backend** | FastAPI + Google ADK 2.0 | Agent orchestration |
| **LLM** | Gemini 3.5 Flash / Pro | Code generation & reasoning |
| **Embeddings** | Gemini Embedding-001 | Code embeddings |
| **Vector DB** | Vertex AI Vector Search | Semantic code retrieval |
| **State** | Firestore | Persistent memory & checkpoints |
| **Hosting** | Cloud Run | Google Cloud deployment |
| **Auth** | GitHub Personal Access Token | Repository access |
| **Visualization** | Recharts | Memory & cost visualization |




### Orchestration (Agents)
The backend acts as the brain, orchestrating three specialized agents:
*   **Coordinator Agent:** The central "router." It understands intent, chooses between Gemini 3.5 Pro (complex tasks) and Flash (simple tasks) to optimize costs, and manages execution checkpoints.
*   **Memory Agent:** Responsible for retrieving relevant code via vector search and detecting verbal corrections (e.g., *"We use functional components here"*) to update the permanent memory pool.
*   **Architect Agent:** Focused on the heavy lifting—generating, refactoring, and structured code output that adheres to retrieved repository conventions.

### Services & Infrastructure
*   **Vector Search Service:** Uses Vertex AI to index code repositories semantically.
*   **Firestore Service:** Persists "Memory Nodes" (team rules/corrections), session history, and metadata.
*   **Cost Tracking Service:** Provides real-time visibility into token usage and model spend.
*   **GitHub Service:** Handles repository cloning, file metadata, and webhook integration.

---

## 🚀 Key Features

*   **Persistent Team Memory:** Automatically detects corrections in chat, classifies them (auth, styling, naming, etc.), and stores them in Cloud Firestore. These rules are injected into every future prompt.
*   **Smart Model Routing:** Dynamically routes queries to **Gemini 3.5 Pro** for architectural changes or **Gemini 3.5 Flash** for lookups, significantly reducing API costs.
*   **AST-Based Code Ingestion:** Uses an Abstract Syntax Tree (AST) parser and text chunker to ensure code is indexed with semantic meaning rather than just raw text.
*   **Real-time Context Visibility:** The UI shows you exactly which "Memory Nodes" are being used to generate a response, providing transparency into the AI's "thought process."

---

## 📂 Directory Structure

```text
ContextCore/
├── backend/                  # FastAPI Backend Service
│   ├── agents/               # Memory, Coordinator, and Architect Agents
│   ├── services/             # API connections (Gemini, Firestore, Vertex)
│   ├── tools/                # Git Cloner, AST Parsers, and Chunkers
│   ├── main.py               # API Endpoints (/chat, /ingest, /memory, /costs)
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Next.js Frontend Client (App Router)
│   ├── app/                  # Workspace and Memory Inspector views
│   ├── components/           # Recharts dashboards and Chat UI
│   ├── tailwind.config.ts    # Design system and theme
│   └── package.json          # Node dependencies
```

---

## 🛠 Installation & Setup


```

---

## 🔄 Data Flow (High Level)

1.  **Developer:** Sends a message or triggers a repository ingestion via the UI.
2.  **Backend APIs:** Receive the request and trigger the **Coordinator Agent**.
3.  **Agents:** The **Memory Agent** retrieves relevant code and rules; the **Architect Agent** decides the generation path.
4.  **Services:** The system calls Gemini, Vertex Search, and Firestore to gather context and generate the code.
5.  **Response:** The final output is streamed back to the Workspace UI via SSE/WebSockets for a real-time experience.

---

## 📊 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/chat` | Core interaction endpoint. Coordinates memory and generation. |
| `POST` | `/ingest` | Clones, parses, and indexes a GitHub repo into Vector Search. |
| `GET` | `/memory` | Retrieve the list of permanent team conventions and rules. |
| `GET` | `/costs` | Fetch real-time token usage and spend statistics. |

---

## Future scope (v1)

- GitHub PR creation
- Slack integration
- Real-time multi-user collaboration

These are natural v2 extensions once the core memory/reliability/cost loop is proven.

# ContextCore | Persistent Memory AI Coding Partner

ContextCore is a persistent-memory coding partner built on the Google Antigravity SDK. It learns your codebase conventions through natural language corrections, embeds them into Vertex AI Vector Search, and retrieves them automatically — ensuring you never have to repeat your architectural preferences or style guides to an AI twice.

![ContextCore Architecture Diagram](https://api.screenshot.sh/v1/screenshot/your-image-url-here) 
*(Note: Replace the link above with the actual hosted path of your architecture diagram image)*

---

## 🏗 System Architecture

ContextCore utilizes a sophisticated multi-agent orchestration layer powered by **FastAPI** and **Google Gemini**, designed to bridge the gap between static code analysis and dynamic team conventions.

### 1. Frontend (Next.js)
A three-panel developer workspace designed for high-context engineering:
*   **Navigation Sidebar:** Manage workspaces, GitHub integrations, and deployment pipelines.
*   **Chat Workspace:** Real-time interaction featuring "Thinking Pulses," syntax-highlighted code cards, and repository ingestion controls.
*   **Inspector Panel:** A live view of active Memory Nodes (the rules currently influencing the AI), real-time cost breakdowns (via Recharts), and active context files.

### 2. Backend Orchestration (FastAPI & Agents)
The backend acts as the brain, orchestrating three specialized agents:
*   **Coordinator Agent:** The central "router." It understands intent, chooses between Gemini 3.5 Pro (complex tasks) and Flash (simple tasks) to optimize costs, and manages execution checkpoints.
*   **Memory Agent:** Responsible for retrieving relevant code via vector search and detecting verbal corrections (e.g., *"We use functional components here"*) to update the permanent memory pool.
*   **Architect Agent:** Focused on the heavy lifting—generating, refactoring, and structured code output that adheres to retrieved repository conventions.

### 3. Services & Infrastructure
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

### Prerequisites
* Python 3.10+ | Node.js 18+
* Google Cloud Project with Firestore & Vertex AI enabled.
* Gemini API Credentials.

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Configure your .env with GEMINI_API_KEY and GOOGLE_CLOUD_PROJECT
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local
npm run dev
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

## ✨ What ContextCore Achieves
*   ✅ **Consistency:** AI responses always follow your specific codebase rules.
*   ✅ **Efficiency:** Learns from team corrections permanently—no more repeating yourself.
*   ✅ **Optimization:** Smarter model routing equals lower costs.
*   ✅ **Transparency:** Real-time visibility into cost and active context.

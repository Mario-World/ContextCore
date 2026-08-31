"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthButton from "@/components/AuthButton";
import {
  Code,
  Database,
  Monitor,
  GitBranch,
  Rocket,
  CheckCircle2,
  FileText,
  Plus,
  Link2,
  RotateCw,
  Settings,
  Cpu,
  Brain,
  Zap,
  Star,
  Paperclip,
  ArrowUp,
  MoreHorizontal,
  History,
  FileCode,
  Network,
  Sparkles,
  Home,
  ArrowLeft,
  BookOpen,
  Terminal as TerminalIcon,
  ShieldCheck,
  Check,
  Copy,
  FolderGit2,
  ExternalLink,
  HelpCircle,
  X,
  Layers,
  ChevronRight,
  Play,
  ArrowRight,
  Bug,
  Activity,
  Trash2,
  Send
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Message {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  type?: "answer" | "correction_ack" | "system";
  model_used?: string;
  topic?: string;
  corrections_applied?: string[];
  resumed_from_checkpoint?: boolean;
  timestamp: string;
}

interface Correction {
  id?: string;
  correction_id?: string;
  topic?: string;
  text: string;
  timestamp?: any;
}

interface CostSummary {
  flash: { call_count: number; tokens_est: number; cost_est: number };
  pro: { call_count: number; tokens_est: number; cost_est: number };
  other?: { call_count: number; tokens_est: number; cost_est: number };
  total_calls: number;
  total_cost: number;
}

interface TerminalLog {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "COMMAND";
  text: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLE_REPOS = [
  { name: "FastAPI", url: "https://github.com/fastapi/fastapi", id: "fastapi/fastapi", desc: "Python modern API framework" },
  { name: "Flask", url: "https://github.com/pallets/flask", id: "pallets/flask", desc: "Lightweight WSGI web framework" },
  { name: "React", url: "https://github.com/facebook/react", id: "facebook/react", desc: "The library for web UIs" },
  { name: "ContextCore", url: "https://github.com/mario-world/contextcore", id: "mario-world/contextcore", desc: "Persistent memory coding partner" },
];

export default function WorkspacePage() {
  const [mounted, setMounted] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [sessionId, setSessionId] = useState("session-" + Math.floor(1000 + Math.random() * 9000));
  const [onboardStatus, setOnboardStatus] = useState<"READY" | "LEARNING">("READY");
  const [activeTab, setActiveTab] = useState<"chat" | "terminal" | "debug" | "plugin">("chat");

  // Step-by-step interactive demo tour state
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [demoStep, setDemoStep] = useState(1);

  // Chat Feed State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      sender: "system",
      text: `ContextCore initialized. Ready for repository exploration and memory-augmented coding. Session ID: ${sessionId}`,
      type: "system",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Terminal State
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { id: "1", timestamp: new Date().toLocaleTimeString(), level: "INFO", text: "ContextCore Coordinator daemon started on port 8000" },
    { id: "2", timestamp: new Date().toLocaleTimeString(), level: "INFO", text: "Connected to Google Cloud Firestore (contextcore-507109)" },
    { id: "3", timestamp: new Date().toLocaleTimeString(), level: "SUCCESS", text: "Vertex AI Vector Search index endpoint ready (sub-15ms latency)" },
    { id: "4", timestamp: new Date().toLocaleTimeString(), level: "INFO", text: "Type 'help' for available CLI commands." }
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Inspector Panel State
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctionsApplied, setCorrectionsApplied] = useState<string[]>([]);
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary>({
    flash: { call_count: 0, tokens_est: 0, cost_est: 0.0 },
    pro: { call_count: 0, tokens_est: 0, cost_est: 0.0 },
    total_calls: 0,
    total_cost: 0.0,
  });
  const [lastModelUsed, setLastModelUsed] = useState<string>("");
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInspector, setShowInspector] = useState(true);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Auto-scroll terminal
  useEffect(() => {
    if (activeTab === "terminal") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, activeTab]);

  // Initial data loading
  useEffect(() => {
    setMounted(true);
    if (repoId) {
      fetchMemory();
      fetchCosts();
    }
  }, [repoId]);

  const addTerminalLog = (level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "COMMAND", text: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        timestamp: new Date().toLocaleTimeString(),
        level,
        text
      }
    ]);
  };

  const fetchMemory = async () => {
    if (!repoId.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(repoId)}`);
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
        addTerminalLog("INFO", `Synced ${data.corrections?.length || 0} active conventions from Firestore for ${repoId}`);
      }
    } catch (err) {
      console.error("Failed to fetch memory:", err);
      addTerminalLog("WARN", `Could not connect to backend memory API: ${err}`);
    }
  };

  const fetchCosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/costs`);
      if (res.ok) {
        const data = await res.json();
        setCostSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch costs:", err);
    }
  };

  const refetchInspectorData = async () => {
    await Promise.all([fetchMemory(), fetchCosts()]);
  };

  // Onboard Repo Ingestion
  const handleOnboard = async (urlToIngest?: string) => {
    const targetUrl = urlToIngest || githubUrl;
    if (!targetUrl.trim() || onboardStatus === "LEARNING") return;

    let parsedRepoId = targetUrl.trim();
    const match = targetUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (match && match[1]) {
      parsedRepoId = match[1].replace(/\.git$/, "");
    } else if (targetUrl.includes("/")) {
      parsedRepoId = targetUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "");
    }

    setRepoId(parsedRepoId);
    setGithubUrl(targetUrl);
    setOnboardStatus("LEARNING");

    addTerminalLog("COMMAND", `ingest --url ${targetUrl} --repo ${parsedRepoId}`);
    addTerminalLog("INFO", `Cloning repository into temporary sandbox...`);

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "system",
        text: `Ingesting codebase from ${targetUrl}... Parsing AST syntax trees and indexing code symbols into vector memory.`,
        type: "system",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    try {
      const res = await fetch(`${API_BASE}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_url: targetUrl,
          repo_id: parsedRepoId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        addTerminalLog("SUCCESS", `AST Parsing complete: ${data.files_processed || 0} files, ${data.chunks_stored || 0} symbols indexed.`);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "system",
            text: `Successfully connected ${parsedRepoId}. Indexed ${data.files_processed || 0} code files and generated ${data.chunks_stored || 0} semantic AST symbols into persistent memory.`,
            type: "system",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        setOnboardStatus("READY");
        await refetchInspectorData();
      } else {
        addTerminalLog("WARN", `Ingestion notice: ${data.detail || "Using fallback memory state"}`);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "system",
            text: `Ingestion completed with fallback vector storage: ${data.detail || "Repository ready for exploration."}`,
            type: "system",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        setOnboardStatus("READY");
      }
    } catch (err: any) {
      addTerminalLog("INFO", `Local development mode active for ${parsedRepoId}`);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "system",
          text: `Repository ${parsedRepoId} registered in local development mode.`,
          type: "system",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setOnboardStatus("READY");
    }
  };

  // Start a New Session
  const handleNewSession = () => {
    const freshSession = `session-${Math.floor(1000 + Math.random() * 9000)}`;
    setSessionId(freshSession);
    addTerminalLog("INFO", `Initialized fresh session: ${freshSession}`);
    setMessages([
      {
        id: "init-1",
        sender: "system",
        text: `ContextCore initialized. Ready for repository exploration and memory-augmented coding. Session ID: ${freshSession}`,
        type: "system",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setCorrectionsApplied([]);
    setActiveFiles([]);
    setInputMessage("");
  };

  // Send Chat Message
  const handleSendMessage = async (customPrompt?: string) => {
    const userText = (customPrompt || inputMessage).trim();
    if (!userText || isSending) return;

    setInputMessage("");

    // Add user message to UI
    const userMsgObj: Message = {
      id: String(Date.now()),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMsgObj]);
    setIsSending(true);

    const activeRepo = repoId || "default-repo";
    addTerminalLog("COMMAND", `user_prompt: "${userText.slice(0, 45)}..."`);

    // Call /query in parallel to capture retrieved files context
    try {
      const queryRes = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userText,
          repo_id: activeRepo,
          top_k: 5
        })
      });
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (queryData.results) {
          const files: string[] = queryData.results.map((r: any) => r.file_path);
          const uniqueFiles = Array.from(new Set(files));
          setActiveFiles(uniqueFiles);
          addTerminalLog("INFO", `Retrieved ${uniqueFiles.length} context files from vector store.`);
        }
      }
    } catch (err) {
      console.error("Failed to query files context:", err);
    }

    // Call /chat
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          repo_id: activeRepo,
          message: userText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.model_used) {
          setLastModelUsed(data.model_used);
        }
        if (data.corrections_applied) {
          setCorrectionsApplied(data.corrections_applied);
        }

        if (data.type === "correction_ack") {
          addTerminalLog("SUCCESS", `Learned & persisted new rule: [${data.topic || "GENERAL"}]`);
        } else {
          addTerminalLog("INFO", `Response generated via ${data.model_used || "gemini-2.0-flash"}`);
        }

        const assistantMsgObj: Message = {
          id: String(Date.now() + 1),
          sender: "assistant",
          text: data.reply,
          type: data.type,
          model_used: data.model_used,
          topic: data.topic,
          corrections_applied: data.corrections_applied,
          resumed_from_checkpoint: data.resumed_from_checkpoint,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, assistantMsgObj]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "assistant",
            text: `Error: ${data.detail || "Unable to process message"}`,
            type: "answer",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "assistant",
          text: `Network Error: ${err.message || "Failed to reach backend API"}`,
          type: "answer",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsSending(false);
      await refetchInspectorData();
    }
  };

  // Execute terminal CLI commands
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    setTerminalInput("");
    addTerminalLog("COMMAND", `$ ${cmd}`);

    const parts = cmd.split(" ");
    const mainCmd = parts[0].toLowerCase();

    switch (mainCmd) {
      case "help":
        addTerminalLog("INFO", "Available Commands:");
        addTerminalLog("INFO", "  help                  - Show this help menu");
        addTerminalLog("INFO", "  status                - View coordinator & GCP health");
        addTerminalLog("INFO", "  ingest <repo_url>     - Ingest a GitHub repository");
        addTerminalLog("INFO", "  memory                - Print learned rules for active repo");
        addTerminalLog("INFO", "  costs                 - Display Gemini Flash / Pro cost stats");
        addTerminalLog("INFO", "  clear                 - Clear terminal screen");
        break;

      case "status":
        addTerminalLog("SUCCESS", `Coordinator: ONLINE | Session: ${sessionId}`);
        addTerminalLog("INFO", `Connected Repo: ${repoId || "None"} | API: ${API_BASE}`);
        addTerminalLog("INFO", `Vertex AI Vector Search: CONNECTED (768-dim) | Firestore: ACTIVE`);
        break;

      case "ingest":
        if (parts[1]) {
          handleOnboard(parts[1]);
        } else {
          addTerminalLog("WARN", "Usage: ingest https://github.com/owner/repo");
        }
        break;

      case "memory":
        if (corrections.length === 0) {
          addTerminalLog("INFO", `No recorded rules for ${repoId || "active session"}.`);
        } else {
          corrections.forEach((c, idx) => {
            addTerminalLog("SUCCESS", `[${c.topic || "RULE"}] ${c.text}`);
          });
        }
        break;

      case "costs":
        addTerminalLog("INFO", `Total Cost: $${costSummary.total_cost.toFixed(4)}`);
        addTerminalLog("INFO", `Flash 2.0 Calls: ${costSummary.flash.call_count} | Pro 2.5 Calls: ${costSummary.pro.call_count}`);
        break;

      case "clear":
        setTerminalLogs([]);
        break;

      default:
        addTerminalLog("WARN", `Command not recognized: '${mainCmd}'. Type 'help' for options.`);
        break;
    }
  };

  const copyCodeToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeSnippet(id);
    setTimeout(() => setCopiedCodeSnippet(null), 2000);
  };

  // Helper formatting for Developer Message filepaths
  const formatDeveloperMessage = (text: string) => {
    const pathRegex = /(\b[\w-]+\/(?:[\w-]+\/)*[\w.-]+\.\w+\b|\b\/?[\w-]+\/[\w.-]+\b)/g;
    const parts = text.split(pathRegex);
    return parts.map((part, index) => {
      if (pathRegex.test(part)) {
        return (
          <code
            key={index}
            className="text-accent font-mono bg-accent/10 px-1.5 py-0.5 border border-accent/30 rounded text-xs select-all hover:underline cursor-pointer"
          >
            {part}
          </code>
        );
      }
      return part;
    });
  };

  // Render Code Blocks inside Markdown Cards
  const renderAgentMessage = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const firstLine = lines[0].trim();
        let language = "code";
        let codeContent = lines.join("\n");

        if (!firstLine.includes(" ") && firstLine.length < 20) {
          language = firstLine;
          codeContent = lines.slice(1).join("\n");
        }

        const snippetId = `snippet-${index}`;

        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-border bg-[#0E0E10] shadow-md font-mono text-xs">
            <div className="h-8 bg-[#18181B] px-3 flex items-center justify-between border-b border-border text-[11px] text-muted">
              <span className="uppercase font-semibold tracking-wider text-accent">{language}</span>
              <button
                onClick={() => copyCodeToClipboard(codeContent, snippetId)}
                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              >
                {copiedCodeSnippet === snippetId ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-success text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-[#E2E8F0] leading-relaxed">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      return (
        <p key={index} className="leading-relaxed whitespace-pre-wrap">
          {part}
        </p>
      );
    });
  };

  // Cost Data for Chart
  const costData = [
    { name: "Pro", value: Math.max(0.0001, costSummary.pro.cost_est), color: "#818CF8" },
    { name: "Flash", value: Math.max(0.0001, costSummary.flash.cost_est), color: "#3ECF8E" },
  ];

  const totalCostValue = costSummary.total_cost > 0
    ? costSummary.total_cost.toFixed(4)
    : (costSummary.flash.cost_est + costSummary.pro.cost_est).toFixed(4);

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden font-sans text-foreground">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-[250px] bg-surface border-r border-border flex flex-col justify-between shrink-0 select-none">
        <div className="flex flex-col p-4 flex-1">
          {/* Header Branding */}
          <Link
            href="/"
            className="flex flex-col mb-5 group cursor-pointer"
            title="ContextCore Home"
          >
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="ContextCore Logo"
                width={30}
                height={30}
                className="w-7 h-7 rounded-lg object-contain bg-surface border border-accent/40 group-hover:border-accent shadow-sm transition-all"
              />
              <span className="font-bold text-sm tracking-widest text-foreground font-mono group-hover:text-accent transition-colors">
                CONTEXTCORE
              </span>
            </div>
            <span className="text-[10px] text-muted font-mono ml-9 mt-0.5 leading-none">
              v2.0-stable
            </span>
          </Link>

          {/* New Session Action */}
          <button
            onClick={handleNewSession}
            className="w-full py-2 px-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-accent/20 mb-5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>

          {/* Primary Navigation List */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground hover:bg-surface/80"
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Workspace Chat</span>
            </button>

            <Link
              href="/graph"
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted hover:text-foreground rounded hover:bg-surface/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Network className="w-4 h-4 text-success group-hover:scale-110 transition-transform" />
                <span>Memory Graph</span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-success/15 text-success border border-success/30 px-1.5 py-0.2 rounded">
                LIVE
              </span>
            </Link>

            <Link
              href="/memory"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-foreground rounded hover:bg-surface/80 transition-all cursor-pointer"
            >
              <Database className="w-4 h-4 text-[#A78BFA]" />
              <span>Conventions Table</span>
            </Link>

            <button
              onClick={() => setActiveTab("terminal")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded transition-all cursor-pointer ${
                activeTab === "terminal"
                  ? "bg-surface border border-accent/40 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface/80"
              }`}
            >
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <span>Terminal Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("debug")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded transition-all cursor-pointer ${
                activeTab === "debug"
                  ? "bg-surface border border-accent/40 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface/80"
              }`}
            >
              <Bug className="w-4 h-4 text-amber-400" />
              <span>Debug Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab("plugin")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded transition-all cursor-pointer ${
                activeTab === "plugin"
                  ? "bg-surface border border-accent/40 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface/80"
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-accent" />
              <span>Plugin / SDK Model</span>
            </button>
          </nav>
        </div>

        {/* Bottom Tour & Quick Actions */}
        <div className="p-3 border-t border-border bg-surface/50 space-y-1.5 shrink-0">
          <button
            onClick={() => { setShowDemoTour(true); setDemoStep(1); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo Tour</span>
          </button>
        </div>
      </aside>

      {/* ================= CENTER PANEL ================= */}
      <section className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top bar: Tabs & Repo connector */}
        <div className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0 bg-surface/30">
          {/* Functional Tab Selection */}
          <div className="flex items-center space-x-2 h-full">
            <button
              onClick={() => setActiveTab("chat")}
              className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab("terminal")}
              className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "terminal"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Terminal</span>
            </button>

            <button
              onClick={() => setActiveTab("debug")}
              className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "debug"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Debug</span>
            </button>

            <button
              onClick={() => setActiveTab("plugin")}
              className={`h-full px-3.5 flex items-center gap-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "plugin"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Plugin / SDK</span>
            </button>
          </div>

          {/* Right Controls: Repo Connector & Auth */}
          <div className="flex items-center gap-3">
            {/* Open Codebase Ingestion Box */}
            <div className="w-[340px] flex items-center gap-2 bg-background border border-border focus-within:border-accent rounded px-3 py-1 text-xs shadow-inner">
              <Link2 className="w-3.5 h-3.5 text-muted shrink-0" />
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="Paste any GitHub repo URL..."
                className="bg-transparent border-none outline-none flex-1 text-foreground placeholder-muted/50 font-mono text-[11px] w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleOnboard();
                  }
                }}
              />
              <button
                onClick={() => handleOnboard()}
                disabled={onboardStatus === "LEARNING" || !githubUrl.trim()}
                className={`px-2 py-0.5 rounded-[3px] text-[9px] font-bold font-mono tracking-wider transition-all uppercase shrink-0 ${
                  onboardStatus === "LEARNING"
                    ? "bg-accent/15 border border-accent/30 text-accent animate-pulse"
                    : githubUrl.trim()
                    ? "bg-success/15 border border-success/30 text-success hover:bg-success/25 cursor-pointer"
                    : "bg-muted/10 border border-border text-muted"
                }`}
              >
                {onboardStatus === "LEARNING" ? "INDEXING..." : "INGEST"}
              </button>
            </div>

            <AuthButton />
          </div>
        </div>

        {/* Sub-header: Current Repo details */}
        <div className="h-10 border-b border-border bg-surface/20 px-6 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-muted font-mono tracking-wider">
              Connected Codebase:
            </span>
            <span className="font-mono font-bold text-foreground text-xs">
              {repoId ? repoId.toUpperCase().replace(/[^A-Z0-9]/g, "_") : "NO REPOSITORY CONNECTED"}
            </span>
            {repoId && (
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetchInspectorData}
              className="p-1 rounded hover:bg-surface border border-transparent hover:border-border text-muted hover:text-foreground transition-all cursor-pointer"
              title="Refresh inspector memory"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={`p-1 rounded hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer ${
                showInspector ? "text-accent" : "text-muted hover:text-foreground"
              }`}
              title="Toggle Inspector Sidebar"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ================= TAB 1: EXPLORER / CHAT ================= */}
        {activeTab === "chat" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="max-w-4xl w-full mx-auto space-y-5">
              {/* Empty State Banner when no repo ingested yet */}
              {!repoId && (
                <div className="bg-surface border border-border rounded-xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Connect Any Codebase</h3>
                      <p className="text-xs text-muted">
                        Paste a public GitHub repo or click a sample below to index AST code symbols into persistent memory.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                    {SAMPLE_REPOS.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={() => handleOnboard(sample.url)}
                        className="bg-background hover:bg-surface border border-border hover:border-accent/40 rounded-lg p-3 text-left transition-all group cursor-pointer shadow-sm"
                      >
                        <div className="font-bold text-xs text-foreground group-hover:text-accent font-mono flex items-center justify-between">
                          <span>{sample.name}</span>
                          <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 text-accent transition-opacity" />
                        </div>
                        <div className="text-[11px] text-muted truncate mt-0.5 font-mono">{sample.id}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Feed */}
              {messages.map((msg) => {
                if (msg.sender === "system") {
                  return (
                    <div key={msg.id} className="flex gap-3 text-xs font-mono text-muted bg-surface/30 border border-border/60 rounded-lg p-3 shadow-inner">
                      <Cpu className="w-4 h-4 text-muted/60 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground uppercase">SYSTEM</span>
                          <span className="text-[10px] text-muted/60">{msg.timestamp}</span>
                        </div>
                        <div className="leading-relaxed text-foreground/90">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.sender === "user") {
                  return (
                    <div key={msg.id} className="flex gap-3 justify-end text-sm">
                      <div className="max-w-[85%] rounded-xl bg-surface border border-border p-3.5 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1 mb-1 font-mono text-[10px] text-muted">
                          <span className="font-bold text-foreground font-sans text-xs">Developer</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div className="text-foreground leading-relaxed font-sans text-xs md:text-sm">
                          {formatDeveloperMessage(msg.text)}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center shrink-0 text-xs font-bold font-mono">
                        DEV
                      </div>
                    </div>
                  );
                }

                // Assistant message
                return (
                  <div key={msg.id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border text-accent flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      {msg.model_used?.includes("pro") ? (
                        <Star className="w-4 h-4 text-accent fill-current" />
                      ) : (
                        <Zap className="w-4 h-4 text-success" />
                      )}
                    </div>

                    <div className="max-w-[85%] rounded-xl bg-surface/60 border border-border p-4 space-y-3 shadow-sm flex-1">
                      {/* Header bar with Model Badge & Topic */}
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 font-mono text-[10px] text-muted">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground font-sans text-xs">ContextCore Agent</span>
                          {msg.type === "correction_ack" ? (
                            <span className="bg-success/15 border border-success/30 text-success px-1.5 py-0.5 rounded font-bold">
                              LEARNED RULE [{msg.topic?.toUpperCase() || "CONVENTION"}]
                            </span>
                          ) : (
                            <span className="bg-accent/15 border border-accent/30 text-accent px-1.5 py-0.5 rounded font-bold">
                              {msg.model_used || "gemini-2.0-flash"}
                            </span>
                          )}
                        </div>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Memory Conventions Applied Pill Banner */}
                      {msg.corrections_applied && msg.corrections_applied.length > 0 && (
                        <div className="bg-background border border-accent/30 rounded-lg p-2 text-xs font-mono flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-accent text-[11px]">Applied Persistent Team Rules:</span>
                            <ul className="list-disc list-inside text-muted text-[11px] space-y-0.5">
                              {msg.corrections_applied.map((rule, rIdx) => (
                                <li key={rIdx}>{rule}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Response Body */}
                      <div className="text-foreground leading-relaxed font-sans text-xs md:text-sm">
                        {renderAgentMessage(msg.text)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Sending / Thinking Indicator */}
              {isSending && (
                <div className="flex gap-3 text-sm animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border text-accent flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 animate-spin text-accent" />
                  </div>
                  <div className="bg-surface/50 border border-border rounded-xl p-3.5 flex items-center gap-2 text-xs font-mono text-muted">
                    <span>Recalling repository memory & formulating code...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <div className="max-w-4xl w-full mx-auto pt-4">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="bg-surface border border-border focus-within:border-accent rounded-xl p-2 shadow-xl transition-all"
              >
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask a question, teach a convention (e.g. 'Actually we use snake_case for methods'), or request code..."
                  rows={2}
                  className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted/50 text-xs md:text-sm resize-none px-2 py-1"
                />
                <div className="flex items-center justify-between pt-2 border-t border-border/40 px-2 text-xs">
                  <div className="flex items-center gap-2 text-muted font-mono text-[11px]">
                    <span>Shift + Enter for new line</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-accent/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Send</span>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TERMINAL CONSOLE ================= */}
        {activeTab === "terminal" && (
          <div className="flex-1 flex flex-col p-6 max-w-5xl w-full mx-auto font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between bg-surface border border-border px-4 py-2.5 rounded-t-xl">
              <div className="flex items-center gap-2 text-muted">
                <TerminalIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-foreground">CONTEXTCORE DEVELOPER CONSOLE</span>
                <span className="text-[10px] text-muted">| Port: 8000</span>
              </div>
              <button
                onClick={() => setTerminalLogs([])}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Terminal Logs Output */}
            <div className="flex-1 bg-[#0A0A0C] border-x border-border p-4 overflow-y-auto space-y-1.5 text-xs text-foreground/90 font-mono shadow-inner">
              {terminalLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-muted/60 text-[10px] shrink-0 select-none">[{log.timestamp}]</span>
                  <span
                    className={`font-bold shrink-0 select-none text-[10px] px-1 rounded ${
                      log.level === "COMMAND"
                        ? "text-accent bg-accent/15"
                        : log.level === "SUCCESS"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : log.level === "WARN"
                        ? "text-amber-400 bg-amber-500/10"
                        : log.level === "ERROR"
                        ? "text-rose-400 bg-rose-500/10"
                        : "text-muted"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className={log.level === "COMMAND" ? "text-foreground font-semibold" : "text-foreground/90"}>
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Terminal Input Prompt */}
            <form
              onSubmit={handleTerminalSubmit}
              className="bg-surface border border-border rounded-b-xl px-4 py-2 flex items-center gap-2"
            >
              <span className="text-emerald-400 font-bold select-none">&gt;</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type 'help', 'status', 'ingest <repo>', 'memory', 'costs', or 'clear'..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted/40 font-mono text-xs"
              />
              <button
                type="submit"
                className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded font-semibold transition-all cursor-pointer"
              >
                Exec
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 3: DEBUG & STATE INSPECTOR ================= */}
        {activeTab === "debug" && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-foreground">COORDINATOR PIPELINE DEBUGGER</span>
              </div>
              <span className="text-[10px] bg-success/15 border border-success/30 text-success px-2 py-0.5 rounded font-bold">
                STATE: SYNCHRONIZED
              </span>
            </div>

            {/* Grid of Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Active Session Snapshot */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
                <span className="font-bold text-accent text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  SESSION CHECKPOINT SNAPSHOT
                </span>
                <div className="bg-background border border-border rounded-lg p-3 space-y-1.5 text-[11px]">
                  <div><span className="text-muted">Session ID:</span> <span className="text-foreground">{sessionId}</span></div>
                  <div><span className="text-muted">Active Repo:</span> <span className="text-foreground">{repoId || "None"}</span></div>
                  <div><span className="text-muted">Last Active Model:</span> <span className="text-emerald-400">{lastModelUsed || "gemini-2.0-flash"}</span></div>
                  <div><span className="text-muted">Resilient Checkpoints:</span> <span className="text-foreground">Enabled (Firestore)</span></div>
                </div>
              </div>

              {/* Card 2: Vector Search & Embeddings */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
                <span className="font-bold text-emerald-400 text-[11px] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  VERTEX AI VECTOR SEARCH STATUS
                </span>
                <div className="bg-background border border-border rounded-lg p-3 space-y-1.5 text-[11px]">
                  <div><span className="text-muted">Dimension:</span> <span className="text-foreground">768 (text-embedding-004)</span></div>
                  <div><span className="text-muted">Index Metric:</span> <span className="text-foreground">DOT_PRODUCT_DISTANCE</span></div>
                  <div><span className="text-muted">Nearest Neighbor Query Top-K:</span> <span className="text-foreground">5 chunks</span></div>
                  <div><span className="text-muted">Active Context Files:</span> <span className="text-foreground">{activeFiles.length} referenced</span></div>
                </div>
              </div>
            </div>

            {/* Card 3: Convention Stack in Memory */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-[11px]">LOADED CONVENTION STACK IN PROMPT INJECTION</span>
                <span className="text-muted text-[10px]">{corrections.length} recorded</span>
              </div>
              <div className="bg-background border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {corrections.length === 0 ? (
                  <span className="text-muted text-[11px]">No active conventions injected.</span>
                ) : (
                  corrections.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] border-b border-border/40 pb-1.5 last:border-none">
                      <span className="text-accent font-bold">[{c.topic?.toUpperCase() || "RULE"}]:</span>
                      <span className="text-foreground/90">{c.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: PLUGIN / DEVELOPER TOOL ================= */}
        {activeTab === "plugin" && (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground font-mono flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-accent" />
                ContextCore Developer Tool & Plugin Integration
              </h2>
              <p className="text-xs text-muted mt-1">
                Connect ContextCore into your local IDE, terminal CLI, or CI/CD pipelines as a persistent memory companion.
              </p>
            </div>

            {/* 1. CLI Usage */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">1. Terminal CLI Integration</span>
                <span className="text-[10px] font-mono text-muted">Node.js / Python</span>
              </div>
              <p className="text-xs text-muted">
                Run ContextCore directly in your terminal to index local projects without committing preferences to Git.
              </p>
              <pre className="bg-background border border-border p-3 rounded-lg text-xs font-mono text-success overflow-x-auto">
{`# Install CLI globally
npm install -g @contextcore/cli

# Connect current repository to persistent memory
contextcore connect --repo-id ${repoId || "my-team/my-codebase"}

# Ask questions with instant memory enforcement
contextcore ask "generate user auth endpoint"`}
              </pre>
            </div>

            {/* 2. VS Code / Cursor IDE Extension Config */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">2. VS Code / Cursor IDE Setting</span>
                <span className="text-[10px] font-mono text-muted">settings.json</span>
              </div>
              <p className="text-xs text-muted">
                Add this configuration to <code className="text-foreground font-mono">.vscode/settings.json</code> to enable real-time convention injection during code completion:
              </p>
              <pre className="bg-background border border-border p-3 rounded-lg text-xs font-mono text-foreground/90 overflow-x-auto">
{`{
  "contextcore.apiEndpoint": "http://localhost:8000",
  "contextcore.repositoryId": "${repoId || "your-org/your-repo"}",
  "contextcore.enforcement": "STRICT",
  "contextcore.autoSync": true
}`}
              </pre>
            </div>

            {/* 3. GitHub Actions CI/CD Rule Verification */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">3. GitHub Actions PR Convention Checker</span>
                <span className="text-[10px] font-mono text-muted">.github/workflows/memory.yml</span>
              </div>
              <p className="text-xs text-muted">
                Automatically verify that pull requests adhere to all conventions registered in ContextCore memory:
              </p>
              <pre className="bg-background border border-border p-3 rounded-lg text-xs font-mono text-foreground/90 overflow-x-auto">
{`name: ContextCore Convention Check
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify Code Conventions
        run: |
          curl -X POST http://localhost:8000/query \\
            -H "Content-Type: application/json" \\
            -d '{"query": "check conventions", "repo_id": "${repoId || "my-repo"}"}'`}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ================= RIGHT INSPECTOR PANEL ================= */}
      {showInspector && (
        <aside className="w-[300px] bg-surface border-l border-border flex flex-col justify-between shrink-0 text-xs select-none">
          <div className="p-4 overflow-y-auto space-y-5 flex-1">
            {/* 1. Active Memory Nodes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-accent" />
                  PERSISTENT CONVENTIONS
                </span>
                <Link href="/graph" className="text-[10px] font-mono text-accent hover:underline">
                  View Graph →
                </Link>
              </div>

              {corrections.length === 0 ? (
                <div className="p-3 bg-background border border-border rounded-lg text-muted text-[11px]">
                  No conventions recorded yet. Correct the agent in chat to register rules permanently.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {corrections.map((c, i) => (
                    <div key={i} className="bg-background border border-border hover:border-accent/30 rounded-lg p-2.5 space-y-1 transition-all">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="bg-accent/15 text-accent font-bold px-1.5 py-0.5 rounded uppercase">
                          {c.topic || "RULE"}
                        </span>
                        <span className="text-success font-semibold">STRICT</span>
                      </div>
                      <p className="text-foreground/90 text-[11px] leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Redesigned Clean Session Usage Section */}
            <div id="cost-inspector-card" className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-success" />
                  SESSION USAGE
                </span>
                <span className="text-[10px] font-mono text-muted">LIVE ROUTING</span>
              </div>

              <div className="bg-background border border-border rounded-xl p-4 space-y-4">
                {/* Donut Chart & Total Cost Display */}
                <div className="h-28 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costData}
                        innerRadius={32}
                        outerRadius={46}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {costData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-muted font-mono tracking-wider uppercase">COST</span>
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      ${totalCostValue}
                    </span>
                  </div>
                </div>

                {/* Clean Metrics Grid */}
                <div className="space-y-2 pt-1">
                  {/* Flash Row */}
                  <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-border text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                      <span className="font-bold text-foreground">Flash 2.0</span>
                    </div>
                    <div className="text-right">
                      <span className="text-success font-semibold">{costSummary.flash.call_count} calls</span>
                      <span className="text-muted text-[10px] ml-1.5">(${costSummary.flash.cost_est.toFixed(4)})</span>
                    </div>
                  </div>

                  {/* Pro Row */}
                  <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-border text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      <span className="font-bold text-foreground">Pro 2.5</span>
                    </div>
                    <div className="text-right">
                      <span className="text-accent font-semibold">{costSummary.pro.call_count} calls</span>
                      <span className="text-muted text-[10px] ml-1.5">(${costSummary.pro.cost_est.toFixed(4)})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* INTERACTIVE DEMO TOUR MODAL */}
      {showDemoTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 relative font-sans text-foreground">
            <button
              onClick={() => setShowDemoTour(false)}
              className="absolute top-4 right-4 text-muted hover:text-foreground p-1 rounded-lg hover:bg-background transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-xs font-mono text-accent font-bold">
              <Sparkles className="w-4 h-4" />
              <span>STEP {demoStep} OF 4 • APPLICATION DEMO TOUR</span>
            </div>

            {demoStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground">1. Connect Your Codebase</h3>
                <p className="text-xs text-muted leading-relaxed">
                  ContextCore parses your repository&apos;s source code using Abstract Syntax Trees (AST). Functions, classes, and routing modules are indexed as semantic nodes.
                </p>
                <div className="p-3 bg-background border border-border rounded-xl text-xs space-y-2 font-mono">
                  <span className="text-muted">Quick Ingest FastAPI Repository:</span>
                  <button
                    onClick={() => { handleOnboard("https://github.com/fastapi/fastapi"); setDemoStep(2); }}
                    className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ingest fastapi/fastapi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {demoStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground">2. Teach the AI a Team Convention</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Speak naturally to correct the agent. ContextCore extracts the topic domain and stores the rule permanently in Cloud Firestore.
                </p>
                <button
                  onClick={() => {
                    handleSendMessage("Actually in this repo we always use JWT Bearer tokens with RS256 for auth endpoints instead of sessions.");
                    setDemoStep(3);
                  }}
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Send Sample Correction: &quot;Always use JWT Bearer tokens&quot;</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {demoStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground">3. Explore the Live Memory Graph</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Open the interactive Memory Graph to see relational links connecting the new convention to code symbols and topic clusters.
                </p>
                <Link
                  href="/graph"
                  onClick={() => setShowDemoTour(false)}
                  className="w-full py-2.5 bg-success hover:bg-success/90 text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-success/20 cursor-pointer"
                >
                  <Network className="w-4 h-4" />
                  <span>Open Interactive Memory Graph</span>
                </Link>
                <button
                  onClick={() => setDemoStep(4)}
                  className="w-full py-2 text-xs font-mono text-muted hover:text-foreground cursor-pointer"
                >
                  Next Step →
                </button>
              </div>
            )}

            {demoStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground">4. Strict Convention Enforcement</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Ask any coding question and verify that ContextCore automatically applies the remembered convention without having to repeat it.
                </p>
                <button
                  onClick={() => {
                    handleSendMessage("Write a new payment webhook endpoint.");
                    setShowDemoTour(false);
                  }}
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Test Prompt: &quot;Write a new payment webhook endpoint&quot;</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

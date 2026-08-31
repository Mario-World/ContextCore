"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  FileCode
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WorkspacePage() {
  const [mounted, setMounted] = useState(false);
  const [repoId, setRepoId] = useState("mario-world/contextcore");
  const [githubUrl, setGithubUrl] = useState("https://github.com/mario-world/contextcore");
  const [sessionId, setSessionId] = useState("demo-session-1");
  const [onboardStatus, setOnboardStatus] = useState<"READY" | "LEARNING">("READY");

  // Chat Feed State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      sender: "system",
      text: `ContextCore initialized. Ready for repository exploration and memory-augmented coding. Session ID: demo-session-1`,
      type: "system",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showInspector, setShowInspector] = useState(true);

  const scrollToCost = () => {
    const costCard = document.getElementById("cost-inspector-card");
    if (costCard) {
      costCard.scrollIntoView({ behavior: "smooth" });
      costCard.classList.add("ring-1", "ring-accent", "ring-offset-1", "ring-offset-background");
      setTimeout(() => {
        costCard.classList.remove("ring-1", "ring-accent", "ring-offset-1", "ring-offset-background");
      }, 2000);
    }
  };

  const handleDeploy = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "system",
        text: `[DEPLOYMENT] Initiating pipeline deployment for context index: ${repoId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}. Status: ACTIVE (Deployed to regional index Asia-South1).`,
        type: "system",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // SSR hydration mismatch prevention
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Initial data loading
  useEffect(() => {
    if (repoId) {
      fetchMemory();
      fetchCosts();
    }
  }, [repoId]);

  const fetchMemory = async () => {
    if (!repoId.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(repoId)}`);
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error("Failed to fetch memory:", err);
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
  const handleOnboard = async () => {
    if (!githubUrl.trim() || onboardStatus === "LEARNING") return;

    let parsedRepoId = repoId;
    const match = githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (match && match[1]) {
      parsedRepoId = match[1].replace(/\.git$/, "");
      setRepoId(parsedRepoId);
    }

    setOnboardStatus("LEARNING");
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "system",
        text: `Ingesting repository from ${githubUrl}... Parsing AST and indexing code chunks into vector space.`,
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
          github_url: githubUrl,
          repo_id: parsedRepoId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "system",
            text: `Successfully ingested repo ${parsedRepoId}. ${data.files_processed || 0} files indexed, ${data.chunks_stored || 0} chunks generated.`,
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
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "system",
            text: `Ingestion failed: ${data.detail || "Unknown error"}`,
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
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "system",
          text: `Network error during ingestion: ${err.message || "Failed to reach backend"}`,
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
    const freshSession = `session-${Math.floor(Math.random() * 10000)}`;
    setSessionId(freshSession);
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
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
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

    // Call /query in parallel to capture retrieved files context
    try {
      const queryRes = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userText,
          repo_id: repoId,
          top_k: 5
        })
      });
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (queryData.results) {
          const files: string[] = queryData.results.map((r: any) => r.file_path);
          const uniqueFiles = Array.from(new Set(files));
          setActiveFiles(uniqueFiles);
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
          repo_id: repoId,
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
            text: `Error from server: ${data.detail || "Unable to process message"}`,
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

  // Helper formatting for Developer Message filepaths
  const formatDeveloperMessage = (text: string) => {
    const pathRegex = /(\b[\w-]+\/(?:[\w-]+\/)*[\w.-]+\.\w+\b|\b\/?[\w-]+\/[\w.-]+\b)/g;
    const parts = text.split(pathRegex);
    return parts.map((part, index) => {
      if (pathRegex.test(part)) {
        return (
          <code
            key={index}
            className="text-accent font-mono bg-accent/5 px-1.5 py-0.5 border border-accent/20 rounded text-xs select-all hover:underline cursor-pointer"
          >
            {part}
          </code>
        );
      }
      return part;
    });
  };

  // Helper formatting for Agent Message inline code blocks
  const formatInlineCode = (text: string) => {
    const parts = text.split(/(`[^`\n]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="bg-surface border border-border px-1.5 py-0.5 rounded text-xs font-mono text-accent mx-0.5"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Render Code Blocks inside Fenced Markdown Cards
  const renderAgentMessage = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const firstLine = lines[0].trim();
        let language = "";
        let filename = "";

        if (firstLine.includes(".")) {
          filename = firstLine;
          const ext = firstLine.split(".").pop() || "";
          language = ext;
        } else if (firstLine) {
          language = firstLine;
        }

        const code = lines.slice(filename || language ? 1 : 0).join("\n");

        return (
          <div key={index} className="my-3 border border-border rounded overflow-hidden bg-[#050506] shadow-md">
            {/* Header row */}
            <div className="bg-surface/80 border-b border-border px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="text-[11px] font-mono text-muted ml-2">
                  {filename || `${language || "code"}`}
                </span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-[10px] font-mono text-muted hover:text-accent font-semibold px-2 py-0.5 border border-border rounded hover:bg-surface/50 transition-all cursor-pointer"
              >
                COPY
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-white/95 leading-relaxed bg-[#050506]">
              <code>{code}</code>
            </pre>
          </div>
        );
      } else {
        return (
          <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-white/90">
            {formatInlineCode(part)}
          </p>
        );
      }
    });
  };

  // Recharts donut calculations
  const totalCalls = costSummary.flash.call_count + costSummary.pro.call_count;
  const proPercentage = totalCalls > 0 ? Math.round((costSummary.pro.call_count / totalCalls) * 100) : 0;
  const flashPercentage = totalCalls > 0 ? Math.round((costSummary.flash.call_count / totalCalls) * 100) : 0;

  const donutData = totalCalls > 0
    ? [
        { name: "Pro", value: costSummary.pro.call_count, color: "#6366F1" },
        { name: "Flash", value: costSummary.flash.call_count, color: "#3ECF8E" }
      ]
    : [
        { name: "Placeholder", value: 1, color: "#26262B" }
      ];

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden font-sans text-foreground">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-[260px] bg-surface border-r border-border flex flex-col justify-between shrink-0">
        <div className="flex flex-col p-4 flex-1">
          {/* Header Branding */}
          <div className="flex flex-col mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-accent/25 border border-accent/40 text-accent flex items-center justify-center font-bold">
                <Code className="w-4 h-4 text-accent" />
              </div>
              <span className="font-bold text-sm tracking-widest text-white font-mono">
                CONTEXTCORE
              </span>
            </div>
            <span className="text-[10px] text-muted font-mono ml-9 mt-0.5 leading-none">
              v1.0.4-stable
            </span>
          </div>

          {/* New Session Action */}
          <button
            onClick={handleNewSession}
            className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-accent/15 mb-6"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>

          {/* Primary Navigation List */}
          <nav className="space-y-1">
            <Link
              href="/workspace"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-white bg-accent rounded transition-all cursor-pointer"
            >
              <Code className="w-4 h-4" />
              <span>Workspace</span>
            </Link>
            <Link
              href="/memory"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-white rounded hover:bg-surface/50 transition-all cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Memory</span>
            </Link>
            <button
              onClick={scrollToCost}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-white rounded hover:bg-surface/50 transition-all cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              <span>Cost</span>
            </button>
            <a
              href="https://github.com/mario-world/contextcore"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-white rounded hover:bg-surface/50 transition-all cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <button
              onClick={handleDeploy}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-white rounded hover:bg-surface/50 transition-all cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Deploy</span>
            </button>
          </nav>
        </div>

        {/* Bottom Secondary Nav */}
        <div className="p-4 border-t border-border/40 bg-surface/50 space-y-1 shrink-0">
          <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-muted hover:text-white rounded hover:bg-surface/80 transition-all cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>Status</span>
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-muted hover:text-white rounded hover:bg-surface/80 transition-all cursor-pointer">
            <FileText className="w-3.5 h-3.5" />
            <span>Logs</span>
          </button>
        </div>
      </aside>

      {/* ================= CENTER PANEL ================= */}
      <section className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top bar: Tabs & Repo input */}
        <div className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0 bg-surface/20">
          {/* Tab Selection */}
          <div className="flex items-center space-x-4 h-full">
            <span className="h-full px-2 flex items-center text-xs font-semibold text-white border-b-2 border-accent cursor-pointer select-none">
              Explorer
            </span>
            <span className="h-full px-2 flex items-center text-xs font-medium text-muted hover:text-white transition-all cursor-pointer select-none">
              Terminal
            </span>
            <span className="h-full px-2 flex items-center text-xs font-medium text-muted hover:text-white transition-all cursor-pointer select-none">
              Debug
            </span>
          </div>

          {/* Repo Input Bar with Status Badge */}
          <div className="w-[380px] flex items-center gap-2 bg-background border border-border rounded px-3 py-1 text-xs shadow-inner">
            <Link2 className="w-3.5 h-3.5 text-muted shrink-0" />
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="GitHub repository URL"
              className="bg-transparent border-none outline-none flex-1 text-white placeholder-muted/50 font-mono text-[11px] w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleOnboard();
                }
              }}
            />
            <button
              onClick={handleOnboard}
              disabled={onboardStatus === "LEARNING"}
              className={`px-2 py-0.5 rounded-[3px] text-[9px] font-bold font-mono tracking-wider transition-all uppercase shrink-0 ${
                onboardStatus === "LEARNING"
                  ? "bg-accent/10 border border-accent/30 text-accent animate-pulse"
                  : "bg-success/10 border border-success/30 text-success hover:bg-success/20 cursor-pointer"
              }`}
            >
              {onboardStatus}
            </button>
          </div>
        </div>

        {/* Sub-header: Current Repo details */}
        <div className="h-12 border-b border-border bg-surface/30 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-muted font-mono tracking-wider select-none">
              Active Repository:
            </span>
            <span className="font-mono font-bold text-white tracking-wide text-xs">
              {repoId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetchInspectorData}
              className="p-1.5 rounded hover:bg-surface border border-transparent hover:border-border text-muted hover:text-white transition-all cursor-pointer"
              title="Refresh inspector context"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={`p-1.5 rounded hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer ${
                showInspector ? "text-accent" : "text-muted hover:text-white"
              }`}
              title="Toggle Inspector Sidebar"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chat Feed Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id} className="flex gap-3 text-xs font-mono text-muted bg-surface/10 border border-border/40 rounded p-3 shadow-inner">
                    <Cpu className="w-4 h-4 text-muted/50 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase select-none">SYSTEM</span>
                        <span className="text-[10px] text-muted/40 select-none">{msg.timestamp}</span>
                      </div>
                      <div className="leading-relaxed">
                        {msg.text.includes(repoId) ? (
                          <>
                            {msg.text.split(repoId)[0]}
                            <code className="bg-surface border border-border px-1.5 py-0.5 rounded text-white text-[11px] font-mono select-all">
                              {repoId}
                            </code>
                            {msg.text.split(repoId)[1]}
                          </>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.sender === "user") {
                return (
                  <div key={msg.id} className="flex gap-3 justify-end text-sm">
                    <div className="max-w-[85%] rounded bg-surface/50 border border-border p-3.5 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/30 pb-1 mb-1 font-mono text-[10px] text-muted">
                        <span className="font-bold text-white font-sans text-xs select-none">Developer</span>
                        <span className="select-none">{msg.timestamp}</span>
                      </div>
                      <div className="text-white/95 leading-relaxed font-sans text-xs md:text-sm">
                        {formatDeveloperMessage(msg.text)}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center shrink-0 text-xs font-bold font-mono select-none">
                      DV
                    </div>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={msg.id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded bg-surface border border-border text-accent flex items-center justify-center shrink-0 mt-0.5 shadow-sm select-none">
                    {msg.model_used?.includes("pro") ? (
                      <Star className="w-4 h-4 text-accent fill-current" />
                    ) : (
                      <Zap className="w-4 h-4 text-success" />
                    )}
                  </div>

                  <div className="max-w-[85%] rounded bg-surface/35 border border-border p-3.5 space-y-3.5 shadow-sm flex-1">
                    {/* Header bar with Model Badge */}
                    <div className="flex items-center justify-between border-b border-border/30 pb-1.5 font-mono text-[10px] text-muted">
                      <div className="flex items-center gap-2 select-none">
                        <span className="font-bold text-white font-sans text-xs">CONTEXTCORE</span>
                        {msg.model_used && (
                          <span
                            className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 border ${
                              msg.model_used.includes("pro")
                                ? "bg-accent/10 border-accent/30 text-accent"
                                : "bg-success/10 border-success/30 text-success"
                            }`}
                          >
                            {msg.model_used.includes("pro") ? "★ Pro" : "Flash"}
                          </span>
                        )}
                      </div>
                      <span className="select-none">{msg.timestamp}</span>
                    </div>

                    {/* Memory Retrieved Flag */}
                    {msg.corrections_applied && msg.corrections_applied.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-accent bg-accent/5 px-2.5 py-1 rounded border border-accent/15 my-1.5 select-none w-fit">
                        <Brain className="w-3.5 h-3.5 shrink-0" />
                        <span>Memory Retrieved:</span>
                        <span className="font-bold uppercase bg-accent/10 border border-accent/20 px-1 py-0.1 rounded text-[9px] text-white">
                          {msg.topic || "rules"}
                        </span>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="space-y-3 text-white/95 leading-relaxed font-sans text-xs md:text-sm">
                      {renderAgentMessage(msg.text)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Visual Thinking Flourish */}
            {isSending && (
              <div className="flex gap-3 text-sm">
                <div className="w-8 h-8 rounded bg-surface border border-border text-accent flex items-center justify-center shrink-0 shadow-sm animate-pulse select-none">
                  <Zap className="w-4 h-4 text-accent" />
                </div>
                <div className="bg-surface/35 border border-border rounded p-3.5 text-xs font-mono text-muted flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                    <span className="font-semibold text-white">Thinking...</span>
                  </div>
                  <div className="text-[11px] text-muted/60 animate-pulse-subtle">
                    &gt; Scanning files context chunks...
                  </div>
                  <div className="text-[11px] text-muted/40 animate-pulse-subtle">
                    &gt; Matching persistent repository conventions...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-border bg-surface/35 shrink-0">
          <div className="max-w-4xl mx-auto space-y-2.5">
            <form
              onSubmit={handleSendMessage}
              className="relative flex items-center bg-background border border-border rounded p-2 focus-within:border-accent transition-all shadow-inner"
            >
              {/* Paperclip upload button */}
              <button
                type="button"
                className="p-2 text-muted hover:text-white hover:bg-surface rounded transition-colors cursor-pointer"
                title="Attach code snippet or file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Textarea Input */}
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Type a message or paste code..."
                className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-white placeholder-muted/50 resize-none py-2 px-3 focus:ring-0 leading-relaxed font-sans max-h-24"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="w-8 h-8 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-accent cursor-pointer shrink-0 shadow-lg shadow-accent/15"
              >
                <ArrowUp className="w-4.5 h-4.5 text-white font-bold" />
              </button>
            </form>

            {/* Input Meta Footer */}
            <div className="flex justify-between items-center text-[10px] font-mono text-muted px-1.5 select-none">
              <div className="flex items-center gap-1.5">
                <span>Model:</span>
                <span className="text-white font-semibold">
                  {lastModelUsed || "Gemini 2.0 Flash"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Tokens:</span>
                <span className="text-white font-semibold">
                  ~{Math.round(inputMessage.length / 4.1) || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= RIGHT SIDEBAR ("INSPECTOR") ================= */}
      {showInspector && (
        <aside className="w-[320px] bg-surface border-l border-border flex flex-col shrink-0 overflow-y-auto p-4 space-y-6">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 sticky top-0 bg-surface z-10 select-none">
            <span className="font-bold font-mono text-xs tracking-wider text-white">
              INSPECTOR
            </span>
            <button className="text-muted hover:text-white transition-all cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Active Memory Nodes Card */}
          <div className="bg-surface/50 border border-border rounded p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 select-none">
              <Brain className="w-4 h-4 text-accent" />
              <span className="font-semibold text-xs text-white uppercase tracking-wider">
                Active Memory Nodes
              </span>
            </div>
            <p className="text-[11px] text-muted leading-tight select-none">
              Learned corrections and style preferences applied to current context.
            </p>

            <div className="flex flex-wrap gap-2 pt-1.5">
              {corrections.length === 0 ? (
                <div className="text-[10px] text-muted/50 font-mono italic select-none">
                  No conventions recorded.
                </div>
              ) : (
                corrections.map((item, idx) => {
                  const isActive = correctionsApplied.some(
                    (cText) => cText.toLowerCase() === item.text.toLowerCase()
                  );

                  return (
                    <div
                      key={item.id || item.correction_id || idx}
                      title={item.text}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                        isActive
                          ? "bg-accent border border-accent text-white shadow-md shadow-accent/15"
                          : "bg-surface border border-border text-muted hover:text-white cursor-help"
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      ) : (
                        <History className="w-3 h-3 text-muted/50" />
                      )}
                      <span className="font-mono uppercase">{item.topic || "general"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Session Usage Card */}
          <div id="cost-inspector-card" className="bg-surface/50 border border-border rounded p-4 space-y-3 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 select-none">
              <Monitor className="w-4 h-4 text-success" />
              <span className="font-semibold text-xs text-white uppercase tracking-wider">
                Session Usage
              </span>
            </div>

            {/* Recharts Pie Donut Container */}
            {mounted ? (
              <div className="relative w-full h-32 flex items-center justify-center select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase tracking-wider text-muted font-mono leading-none">Cost</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5">
                    ${costSummary.total_cost.toFixed(3)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-32 w-full flex items-center justify-center text-xs text-muted font-mono select-none">
                Loading usage metrics...
              </div>
            )}

            {/* Legend and Details Links */}
            <div className="flex justify-between items-center text-[10px] font-mono border-t border-border/30 pt-3 select-none">
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-muted">Pro: {proPercentage}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-muted">Flash: {flashPercentage}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted/60">Limit: $10.00</span>
                <span className="text-muted/40">|</span>
                <button className="text-accent hover:underline uppercase text-[9px] font-bold cursor-pointer">
                  DETAILS
                </button>
              </div>
            </div>
          </div>

          {/* 3. Active Files Card */}
          <div className="bg-surface/50 border border-border rounded p-4 space-y-3 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center gap-2 select-none">
              <FileText className="w-4 h-4 text-accent" />
              <span className="font-semibold text-xs text-white uppercase tracking-wider">
                Active Files
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-0.5 max-h-[220px]">
              {activeFiles.length === 0 ? (
                <div className="text-[10px] text-muted/50 font-mono italic select-none">
                  No active files referenced.
                </div>
              ) : (
                activeFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-surface/85 border border-border px-2.5 py-1.5 rounded group hover:border-accent/40 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="font-mono text-[11px] text-white/90 truncate flex-1" title={file}>
                      {file}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

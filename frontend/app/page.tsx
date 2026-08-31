"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Database,
  Cpu,
  Zap,
  Star,
  Send,
  RotateCw,
  GitBranch,
  Copy,
  Check,
  AlertCircle,
  Code2,
  FolderGit2,
  Brain,
  ShieldCheck,
  DollarSign,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

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

const PRO_KEYWORDS = [
  "generate",
  "refactor",
  "architect",
  "implement",
  "build",
  "design",
  "create",
];

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SESSION_ID = "demo-session-1";

export default function ContextCorePage() {
  // State: Onboarding
  const [repoId, setRepoId] = useState("mario-world/contextcore");
  const [githubUrl, setGithubUrl] = useState(
    "https://github.com/mario-world/contextcore"
  );
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardStatus, setOnboardStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
    files?: number;
    chunks?: number;
  }>({ type: null, message: "" });

  // State: Chat
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      sender: "system",
      text: `ContextCore initialized. Ready for repository exploration and memory-augmented coding. Session ID: ${SESSION_ID}`,
      type: "system",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State: Memory & Costs
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [costSummary, setCostSummary] = useState<CostSummary>({
    flash: { call_count: 0, tokens_est: 0, cost_est: 0.0 },
    pro: { call_count: 0, tokens_est: 0, cost_est: 0.0 },
    total_calls: 0,
    total_cost: 0.0,
  });
  const [isLoadingCosts, setIsLoadingCosts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Initial fetch for Memory and Costs
  useEffect(() => {
    if (repoId) {
      fetchMemory();
    }
    fetchCosts();
  }, [repoId]);

  // Real-time model prediction based on prompt keywords
  const predictedModel = React.useMemo(() => {
    const lower = inputMessage.toLowerCase();
    const isPro = PRO_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`).test(lower));
    return isPro ? "gemini-2.5-pro" : "gemini-2.0-flash";
  }, [inputMessage]);

  // API Call: Fetch Memory
  const fetchMemory = async () => {
    if (!repoId.trim()) return;
    setIsLoadingMemory(true);
    try {
      const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(repoId)}`);
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error("Failed to fetch memory:", err);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  // API Call: Fetch Costs
  const fetchCosts = async () => {
    setIsLoadingCosts(true);
    try {
      const res = await fetch(`${API_BASE}/costs`);
      if (res.ok) {
        const data = await res.json();
        setCostSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch costs:", err);
    } finally {
      setIsLoadingCosts(false);
    }
  };

  // API Call: Onboard Repo (POST /ingest)
  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoId.trim() || !githubUrl.trim()) return;

    setIsOnboarding(true);
    setOnboardStatus({
      type: "info",
      message: "Cloning repository, analyzing AST/regex chunks, and generating embeddings...",
    });

    try {
      const res = await fetch(`${API_BASE}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_url: githubUrl,
          repo_id: repoId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setOnboardStatus({
          type: "success",
          message: `Onboarded ${repoId} successfully!`,
          files: data.files_processed,
          chunks: data.chunks_stored || data.chunks_indexed,
        });

        // Add system message in chat
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: "system",
            text: `Repository ${repoId} indexed: ${data.files_processed || 0} files processed, ${
              data.chunks_stored || data.chunks_indexed || 0
            } code chunks embedded into Vector Search.`,
            type: "system",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        fetchMemory();
        fetchCosts();
      } else {
        setOnboardStatus({
          type: "error",
          message: data.detail || "Failed to onboard repository.",
        });
      }
    } catch (err: any) {
      setOnboardStatus({
        type: "error",
        message: err.message || "Network error while connecting to backend.",
      });
    } finally {
      setIsOnboarding(false);
    }
  };

  // API Call: Send Chat Message (POST /chat)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    // Add user message to UI immediately
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

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: SESSION_ID,
          repo_id: repoId,
          message: userText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
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
      // Auto-refresh Memory panel and Cost Dashboard
      fetchMemory();
      fetchCosts();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for topic tag colors
  const getTopicBadgeStyle = (topic: string = "general") => {
    const t = topic.toLowerCase();
    if (t === "auth")
      return "border-[#4f6bff]/40 bg-[#4f6bff]/10 text-[#bac3ff]";
    if (t === "naming" || t === "style")
      return "border-[#3ecf8e]/40 bg-[#3ecf8e]/10 text-[#51df9c]";
    if (t === "database" || t === "api")
      return "border-[#e66f1e]/40 bg-[#e66f1e]/10 text-[#ffb68f]";
    return "border-[#27272a] bg-[#1c1b1c] text-[#c5c5d8]";
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0a0b] text-[#e5e2e3]">
      {/* Top Header */}
      <header className="h-14 border-b border-[#27272a] bg-[#131314]/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#4f6bff]/20 border border-[#4f6bff]/40 text-[#4f6bff] flex items-center justify-center font-bold">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">
                ContextCore
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#27272a] text-[#8e8fa1] border border-[#3a393a]">
                Agent ADK 2.0
              </span>
            </div>
            <span className="text-[11px] text-[#8e8fa1] font-mono leading-none block">
              Persistent Codebase & Convention Memory
            </span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 bg-[#1c1b1c] px-3 py-1 rounded border border-[#27272a]">
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse"></span>
            <span className="text-[#8e8fa1]">SESSION:</span>
            <span className="text-[#e5e2e3] font-semibold">{SESSION_ID}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1c1b1c] px-3 py-1 rounded border border-[#27272a]">
            <span className="text-[#8e8fa1]">ACTIVE REPO:</span>
            <span className="text-[#4f6bff] font-semibold truncate max-w-[140px]">
              {repoId}
            </span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= LEFT COLUMN: ONBOARDING & CHAT ================= */}
        <div className="flex-1 flex flex-col border-r border-[#27272a] bg-[#0a0a0b] overflow-hidden">
          {/* Repo Onboarding Section */}
          <div className="p-4 border-b border-[#27272a] bg-[#131314]/50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#8e8fa1]">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#4f6bff]" />
                  <span>Repository Onboarding (Vector & Graph Memory)</span>
                </div>
                {onboardStatus.type && (
                  <div
                    className={`text-xs px-2 py-0.5 rounded flex items-center gap-1.5 ${
                      onboardStatus.type === "success"
                        ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30"
                        : onboardStatus.type === "error"
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : "bg-[#4f6bff]/10 text-[#4f6bff] border border-[#4f6bff]/30"
                    }`}
                  >
                    {onboardStatus.type === "success" ? (
                      <Check className="w-3 h-3" />
                    ) : onboardStatus.type === "error" ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <RotateCw className="w-3 h-3 animate-spin" />
                    )}
                    <span className="truncate max-w-[320px]">
                      {onboardStatus.message}
                    </span>
                    {onboardStatus.chunks !== undefined && (
                      <span className="font-mono font-semibold ml-1">
                        ({onboardStatus.chunks} chunks)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleOnboard}
                className="grid grid-cols-1 md:grid-cols-12 gap-2"
              >
                <div className="md:col-span-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#8e8fa1]">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={repoId}
                    onChange={(e) => setRepoId(e.target.value)}
                    placeholder="repo_id (e.g. owner/repo)"
                    className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-1.5 pl-8 text-xs font-mono text-[#e5e2e3] placeholder-[#8e8fa1]/50 focus:border-[#4f6bff] focus:outline-none transition-colors"
                  />
                </div>

                <div className="md:col-span-6 relative">
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="GitHub Repo URL (e.g. https://github.com/org/repo)"
                    className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-3 py-1.5 text-xs font-mono text-[#e5e2e3] placeholder-[#8e8fa1]/50 focus:border-[#4f6bff] focus:outline-none transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isOnboarding}
                    className="w-full bg-[#4f6bff] hover:bg-[#3b54d6] disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isOnboarding ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Indexing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Onboard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-sm ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender !== "user" && (
                    <div className="w-7 h-7 rounded bg-[#1c1b1c] border border-[#27272a] text-[#4f6bff] flex items-center justify-center shrink-0 mt-0.5">
                      {msg.sender === "system" ? (
                        <Terminal className="w-3.5 h-3.5 text-[#8e8fa1]" />
                      ) : msg.type === "correction_ack" ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#3ecf8e]" />
                      ) : (
                        <Cpu className="w-3.5 h-3.5 text-[#4f6bff]" />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-md p-3 space-y-2 ${
                      msg.sender === "user"
                        ? "bg-[#1c1b1c] border border-[#27272a] text-white"
                        : msg.sender === "system"
                        ? "bg-[#131314]/80 border border-[#27272a] text-[#8e8fa1] text-xs font-mono"
                        : "bg-[#131314] border border-[#27272a] text-[#e5e2e3]"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-[#8e8fa1] border-b border-[#27272a]/50 pb-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#c5c5d8]">
                          {msg.sender === "user"
                            ? "You"
                            : msg.sender === "system"
                            ? "System"
                            : "ContextCore"}
                        </span>

                        {msg.model_used && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1 border ${
                              msg.model_used.includes("pro")
                                ? "bg-[#4f6bff]/10 border-[#4f6bff]/30 text-[#bac3ff]"
                                : "bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-[#51df9c]"
                            }`}
                          >
                            {msg.model_used.includes("pro") ? (
                              <Star className="w-2.5 h-2.5 fill-[#bac3ff]" />
                            ) : (
                              <Zap className="w-2.5 h-2.5" />
                            )}
                            {msg.model_used}
                          </span>
                        )}

                        {msg.type === "correction_ack" && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] font-semibold">
                            Convention Saved [{msg.topic?.toUpperCase() || "RULE"}]
                          </span>
                        )}

                        {msg.resumed_from_checkpoint && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            Resumed Checkpoint
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] opacity-60">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Applied Corrections Thought Bubble */}
                    {msg.corrections_applied &&
                      msg.corrections_applied.length > 0 && (
                        <div className="border-l-2 border-[#4f6bff] bg-[#1c1b1c]/50 pl-3 py-1.5 my-1.5 text-xs font-mono text-[#bac3ff] space-y-1">
                          <div className="flex items-center gap-1.5 text-[#4f6bff] font-semibold text-[11px]">
                            <Brain className="w-3 h-3" />
                            <span>
                              Applied Learned Conventions ({msg.corrections_applied.length}):
                            </span>
                          </div>
                          {msg.corrections_applied.map((cText, idx) => (
                            <div key={idx} className="text-[#8e8fa1] pl-2">
                              • {cText}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Message Body */}
                    <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>

                    {/* Quick action bar */}
                    {msg.sender === "assistant" && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="text-[10px] font-mono text-[#8e8fa1] hover:text-[#4f6bff] flex items-center gap-1 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#3ecf8e]" />
                              <span className="text-[#3ecf8e]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3 text-sm">
                  <div className="w-7 h-7 rounded bg-[#1c1b1c] border border-[#27272a] text-[#4f6bff] flex items-center justify-center shrink-0">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-[#131314] border border-[#27272a] rounded-md p-3 text-xs font-mono text-[#8e8fa1] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#4f6bff] animate-ping" />
                    <span>
                      Retrieving memory chunks & invoking {predictedModel}...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="p-4 border-t border-[#27272a] bg-[#131314]/80">
            <div className="max-w-4xl mx-auto space-y-2">
              <form onSubmit={handleSendMessage} className="relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Ask about the codebase, or teach a convention (e.g. 'Actually we use CamelCase instead of snake_case')..."
                  className="w-full bg-[#050505] border border-[#27272a] rounded-md p-3 pr-24 text-xs md:text-sm text-[#e5e2e3] placeholder-[#8e8fa1]/50 focus:border-[#4f6bff] focus:outline-none resize-none transition-colors"
                />

                <div className="absolute right-2.5 bottom-3 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSending}
                    className="h-8 px-3 rounded bg-[#4f6bff] hover:bg-[#3b54d6] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </form>

              {/* Input Meta Footer */}
              <div className="flex justify-between items-center text-[11px] font-mono text-[#8e8fa1] px-1">
                <div className="flex items-center gap-2">
                  <span>Routing:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      predictedModel.includes("pro")
                        ? "text-[#bac3ff]"
                        : "text-[#51df9c]"
                    }`}
                  >
                    {predictedModel.includes("pro") ? (
                      <Star className="w-3 h-3 fill-current" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    {predictedModel}
                  </span>
                  <span className="text-[#8e8fa1]/40">|</span>
                  <span className="text-[#8e8fa1]/60">Press Enter to send</span>
                </div>

                <div className="hidden sm:block text-[#8e8fa1]/60">
                  Memory checks: ON
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: MEMORY & COST DASHBOARD ================= */}
        <aside className="w-80 md:w-96 bg-[#131314] flex flex-col overflow-y-auto shrink-0 border-l border-[#27272a]">
          {/* Header */}
          <div className="p-3.5 border-b border-[#27272a] bg-[#1c1b1c] flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2 font-mono text-xs text-white font-semibold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-[#4f6bff]" />
              <span>Inspector & Memory</span>
            </div>
            <button
              onClick={() => {
                fetchMemory();
                fetchCosts();
              }}
              title="Refresh panels"
              className="text-[#8e8fa1] hover:text-[#4f6bff] transition-colors p-1 rounded hover:bg-[#27272a]"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${
                  isLoadingMemory || isLoadingCosts ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Panel 1: Learned Memory Panel */}
            <div className="bg-[#1c1b1c] border border-[#27272a] rounded-md overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Database className="w-4 h-4 text-[#4f6bff]" />
                  <span>Team Conventions ({corrections.length})</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#4f6bff]/10 text-[#4f6bff] border border-[#4f6bff]/30 px-1.5 py-0.5 rounded">
                  MUST Follow
                </span>
              </div>

              <div className="p-3 space-y-2.5">
                <p className="text-[11px] text-[#8e8fa1] leading-tight">
                  Persistent team rules learned from chat corrections and strictly enforced over generic standards.
                </p>

                {corrections.length === 0 ? (
                  <div className="border border-dashed border-[#27272a] rounded p-4 text-center text-xs text-[#8e8fa1] space-y-1">
                    <p className="font-mono text-[11px]">No conventions saved yet.</p>
                    <p className="text-[10px] text-[#8e8fa1]/60">
                      Try: &quot;Actually, we use JWT tokens with Bearer auth.&quot;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {corrections.map((c, idx) => (
                      <div
                        key={c.id || c.correction_id || idx}
                        className="bg-[#131314] border border-[#27272a] rounded p-2.5 text-xs space-y-1.5 hover:border-[#4f6bff]/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${getTopicBadgeStyle(
                              c.topic
                            )}`}
                          >
                            {c.topic || "General"}
                          </span>
                          <span className="text-[10px] font-mono text-[#8e8fa1]">
                            #{idx + 1}
                          </span>
                        </div>
                        <p className="text-xs text-[#e5e2e3] font-sans leading-relaxed">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Cost Dashboard Panel */}
            <div className="bg-[#1c1b1c] border border-[#27272a] rounded-md overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <DollarSign className="w-4 h-4 text-[#3ecf8e]" />
                  <span>Cost Dashboard</span>
                </div>
                <span className="text-[10px] font-mono text-[#3ecf8e] font-semibold">
                  ${costSummary.total_cost.toFixed(5)}
                </span>
              </div>

              <div className="p-3.5 space-y-4">
                {/* Total Stats Summary Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#131314] border border-[#27272a] rounded p-2.5">
                    <div className="text-[10px] font-mono text-[#8e8fa1] uppercase">
                      Total Calls
                    </div>
                    <div className="text-lg font-bold font-mono text-white mt-0.5">
                      {costSummary.total_calls}
                    </div>
                  </div>
                  <div className="bg-[#131314] border border-[#27272a] rounded p-2.5">
                    <div className="text-[10px] font-mono text-[#8e8fa1] uppercase">
                      Total Spend
                    </div>
                    <div className="text-lg font-bold font-mono text-[#3ecf8e] mt-0.5">
                      ${costSummary.total_cost.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Model Usage Breakdown */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-[#8e8fa1] uppercase">
                    Model Breakdown
                  </div>

                  {/* Flash Model Card */}
                  <div className="bg-[#131314] border border-[#27272a] rounded p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-[#51df9c] font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Flash (2.0)
                      </span>
                      <span className="text-white font-semibold">
                        {costSummary.flash.call_count} calls
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-[#8e8fa1]">
                      <span>~{costSummary.flash.tokens_est} tokens</span>
                      <span className="text-[#51df9c]">
                        ${costSummary.flash.cost_est.toFixed(5)}
                      </span>
                    </div>
                  </div>

                  {/* Pro Model Card */}
                  <div className="bg-[#131314] border border-[#27272a] rounded p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-[#bac3ff] font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Pro (2.5)
                      </span>
                      <span className="text-white font-semibold">
                        {costSummary.pro.call_count} calls
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-[#8e8fa1]">
                      <span>~{costSummary.pro.tokens_est} tokens</span>
                      <span className="text-[#bac3ff]">
                        ${costSummary.pro.cost_est.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3: Quick Tip Card */}
            <div className="bg-[#131314] border border-[#27272a] rounded-md p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#4f6bff] font-semibold font-mono text-[11px]">
                <Code2 className="w-3.5 h-3.5" />
                <span>ContextCore Memory Syntax</span>
              </div>
              <p className="text-[#8e8fa1] text-[11px] leading-relaxed">
                Use keywords like <code className="text-[#e5e2e3]">actually</code>, <code className="text-[#e5e2e3]">we use</code>, or <code className="text-[#e5e2e3]">instead</code> in your chat message to permanently train ContextCore on a new architectural pattern.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

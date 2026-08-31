"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  Database,
  ArrowLeft,
  Search,
  Filter,
  RotateCw,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Layers,
  Code2,
  Calendar,
} from "lucide-react";

interface Correction {
  id?: string;
  correction_id?: string;
  topic?: string;
  text: string;
  timestamp?: any;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MemoryDashboardPage() {
  const [repoId, setRepoId] = useState("mario-world/contextcore");
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMemory();
  }, [repoId]);

  const fetchMemory = async () => {
    if (!repoId.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/memory/${encodeURIComponent(repoId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error("Failed to fetch memory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const topics = Array.from(
    new Set(corrections.map((c) => (c.topic || "general").toLowerCase()))
  );

  const filteredCorrections = corrections.filter((c) => {
    const topicMatch =
      selectedTopic === "all" ||
      (c.topic || "general").toLowerCase() === selectedTopic.toLowerCase();
    const queryMatch =
      !searchQuery.trim() ||
      c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.topic || "").toLowerCase().includes(searchQuery.toLowerCase());
    return topicMatch && queryMatch;
  });

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
    <div className="min-h-screen bg-[#0a0a0b] text-[#e5e2e3] flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="h-14 border-b border-[#27272a] bg-[#131314]/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono text-[#8e8fa1] hover:text-white transition-colors bg-[#1c1b1c] px-2.5 py-1 rounded border border-[#27272a]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workspace</span>
          </Link>
          <div className="h-4 w-[1px] bg-[#27272a]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#4f6bff]/20 border border-[#4f6bff]/40 text-[#4f6bff] flex items-center justify-center font-bold">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-white">
                ContextCore Memory Inspector
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1c1b1c] px-3 py-1 rounded border border-[#27272a] text-xs font-mono">
            <span className="text-[#8e8fa1]">Repository:</span>
            <input
              type="text"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="bg-transparent border-none text-[#4f6bff] font-semibold focus:outline-none w-44"
              placeholder="repo_id..."
            />
          </div>
          <button
            onClick={fetchMemory}
            disabled={isLoading}
            className="bg-[#1c1b1c] hover:bg-[#27272a] p-1.5 rounded border border-[#27272a] text-[#8e8fa1] hover:text-[#4f6bff] transition-colors"
          >
            <RotateCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#131314] border border-[#27272a] rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-[#4f6bff]/10 border border-[#4f6bff]/30 text-[#4f6bff] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-[#8e8fa1] uppercase">
                Learned Conventions
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">
                {corrections.length}
              </div>
            </div>
          </div>

          <div className="bg-[#131314] border border-[#27272a] rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-[#8e8fa1] uppercase">
                Active Topics
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">
                {topics.length}
              </div>
            </div>
          </div>

          <div className="bg-[#131314] border border-[#27272a] rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-[#8e8fa1] uppercase">
                Enforcement Mode
              </div>
              <div className="text-sm font-semibold font-mono text-amber-300 mt-1">
                STRICT (MUST FOLLOW)
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#131314] border border-[#27272a] rounded-lg p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8e8fa1]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conventions and rules..."
              className="w-full bg-[#050505] border border-[#27272a] rounded-md pl-9 pr-3 py-1.5 text-xs font-mono text-[#e5e2e3] placeholder-[#8e8fa1]/50 focus:border-[#4f6bff] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-[#8e8fa1] mr-1 shrink-0" />
            <button
              onClick={() => setSelectedTopic("all")}
              className={`text-xs px-2.5 py-1 rounded font-mono transition-colors shrink-0 ${
                selectedTopic === "all"
                  ? "bg-[#4f6bff] text-white font-semibold"
                  : "bg-[#1c1b1c] text-[#8e8fa1] border border-[#27272a] hover:text-white"
              }`}
            >
              All ({corrections.length})
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`text-xs px-2.5 py-1 rounded font-mono uppercase transition-colors shrink-0 ${
                  selectedTopic === topic
                    ? "bg-[#4f6bff] text-white font-semibold"
                    : "bg-[#1c1b1c] text-[#8e8fa1] border border-[#27272a] hover:text-white"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Conventions List Grid */}
        <div className="space-y-3">
          {filteredCorrections.length === 0 ? (
            <div className="bg-[#131314] border border-dashed border-[#27272a] rounded-lg p-12 text-center space-y-3">
              <Code2 className="w-8 h-8 text-[#8e8fa1] mx-auto opacity-50" />
              <div className="text-sm text-[#e5e2e3] font-semibold">
                No conventions found
              </div>
              <p className="text-xs text-[#8e8fa1] max-w-md mx-auto">
                No memory records match the current filter. In the chat workspace, type sentences like &quot;Actually we use JWT authentication instead of session cookies&quot; to teach ContextCore new rules.
              </p>
            </div>
          ) : (
            filteredCorrections.map((c, idx) => (
              <div
                key={c.id || c.correction_id || idx}
                className="bg-[#131314] border border-[#27272a] rounded-lg p-4 space-y-2.5 hover:border-[#4f6bff]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase border ${getTopicBadgeStyle(
                        c.topic
                      )}`}
                    >
                      {c.topic || "General"}
                    </span>
                    <span className="text-xs font-mono text-[#8e8fa1]">
                      Convention ID: {c.correction_id || `rule-${idx + 1}`}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      copyToClipboard(c.text, c.id || String(idx))
                    }
                    className="text-xs font-mono text-[#8e8fa1] hover:text-[#4f6bff] flex items-center gap-1 transition-colors"
                  >
                    {copiedId === (c.id || String(idx)) ? (
                      <>
                        <Check className="w-3 h-3 text-[#3ecf8e]" />
                        <span className="text-[#3ecf8e]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Rule</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm text-[#e5e2e3] leading-relaxed font-mono bg-[#050505] p-3 rounded border border-[#27272a]">
                  &quot;{c.text}&quot;
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

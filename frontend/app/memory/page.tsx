"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthButton from "@/components/AuthButton";
import ThemeToggle from "@/components/ThemeToggle";
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
  Network,
} from "lucide-react";

interface Correction {
  id?: string;
  correction_id?: string;
  topic?: string;
  text: string;
  timestamp?: any;
  created_at?: string;
  source_session?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MemoryPage() {
  const [repoId, setRepoId] = useState("mario-world/contextcore");
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMemory();
  }, [repoId]);

  const fetchMemory = async () => {
    if (!repoId.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(repoId)}`);
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
    new Set(corrections.map((c) => (c.topic || "general").toUpperCase()))
  );

  const filteredCorrections = corrections.filter((c) => {
    const matchesSearch =
      c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.topic && c.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTopic =
      selectedTopic === "ALL" ||
      (c.topic && c.topic.toUpperCase() === selectedTopic);
    return matchesSearch && matchesTopic;
  });

  const getTopicBadgeStyle = (topic?: string) => {
    const t = (topic || "").toLowerCase();
    if (t.includes("auth")) return "border-amber-500/40 bg-amber-500/10 text-amber-500";
    if (t.includes("db") || t.includes("database")) return "border-blue-500/40 bg-blue-500/10 text-blue-500";
    if (t.includes("api") || t.includes("endpoint")) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500";
    if (t.includes("state")) return "border-purple-500/40 bg-purple-500/10 text-purple-500";
    if (t.includes("naming") || t.includes("style")) return "border-pink-500/40 bg-pink-500/10 text-pink-500";
    return "border-accent/40 bg-accent/10 text-accent";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Navigation Header */}
      <header className="h-14 border-b border-border bg-surface/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors bg-surface px-2.5 py-1 rounded border border-border"
          >
            <span>Home</span>
          </Link>
          <Link
            href="/workspace"
            className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors bg-surface px-2.5 py-1 rounded border border-border"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </Link>
          <div className="h-4 w-[1px] bg-border" />
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="ContextCore Logo"
              width={28}
              height={28}
              className="w-7 h-7 rounded-lg object-contain bg-surface border border-accent/40 group-hover:border-accent shadow-sm transition-all"
            />
            <div>
              <span className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                ContextCore Memory Inspector
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/graph"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded transition-all shadow-md shadow-accent/20"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Interactive Graph View</span>
          </Link>
          <div className="flex items-center gap-2 bg-background px-3 py-1 rounded border border-border text-xs font-mono">
            <span className="text-muted">Repository:</span>
            <input
              type="text"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="bg-transparent border-none text-accent font-semibold focus:outline-none w-44"
              placeholder="repo_id..."
            />
          </div>
          <button
            onClick={fetchMemory}
            disabled={isLoading}
            className="bg-surface hover:bg-surface/80 p-1.5 rounded border border-border text-muted hover:text-accent transition-colors cursor-pointer"
          >
            <RotateCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>

          {/* Auth Button */}
          <AuthButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 text-accent flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase">
                Learned Conventions
              </div>
              <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                {corrections.length}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-success/10 border border-success/30 text-success flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase">
                Topic Domains
              </div>
              <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                {topics.length}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-pro-purple/10 border border-pro-purple/30 text-pro-purple flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase">
                Enforcement Mode
              </div>
              <div className="text-sm font-bold font-mono text-foreground mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                STRICT INJECTION
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="Search conventions or rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border focus:border-accent rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground placeholder-muted/50 outline-none transition-colors"
            />
          </div>

          {/* Topic Pills Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-muted mr-1 shrink-0" />
            <button
              onClick={() => setSelectedTopic("ALL")}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                selectedTopic === "ALL"
                  ? "bg-accent text-white font-semibold shadow-sm"
                  : "bg-background text-muted hover:text-foreground border border-border"
              }`}
            >
              ALL
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors shrink-0 cursor-pointer ${
                  selectedTopic === topic
                    ? "bg-accent text-white font-semibold shadow-sm"
                    : "bg-background text-muted hover:text-foreground border border-border"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Conventions Grid List */}
        {filteredCorrections.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-3">
            <Database className="w-10 h-10 text-muted mx-auto opacity-40" />
            <div className="text-foreground font-semibold text-sm">
              No conventions found for repository &quot;{repoId}&quot;
            </div>
            <p className="text-xs text-muted max-w-md mx-auto">
              Correct the AI agent in the Workspace chat (e.g., &quot;Actually, in this repo we use snake_case for methods&quot;) to automatically learn and store permanent rules.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCorrections.map((corr, idx) => {
              const cardId = corr.id || corr.correction_id || String(idx);
              return (
                <div
                  key={cardId}
                  className="bg-surface border border-border hover:border-accent/40 rounded-xl p-5 space-y-3 transition-all group shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Card Top Metadata */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${getTopicBadgeStyle(
                          corr.topic
                        )}`}
                      >
                        {corr.topic || "RULE"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(corr.text, cardId)}
                        className="p-1 rounded text-muted hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                        title="Copy convention text"
                      >
                        {copiedId === cardId ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Rule Text */}
                    <p className="text-xs md:text-sm text-foreground/95 leading-relaxed font-sans">
                      {corr.text}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-3 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted">
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3 h-3 text-muted/60" />
                      ID: {cardId.slice(0, 8)}...
                    </span>
                    <span className="text-success font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      STRICT
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

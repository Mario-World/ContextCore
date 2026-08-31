"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthButton from "@/components/AuthButton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Terminal,
  Database,
  Zap,
  GitCommit,
  FolderGit2,
  Code2,
  Play,
  FileText,
  Network,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  GitBranch,
  Activity,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("contextcore_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/health");
        setApiOnline(res.ok);
      } catch {
        setApiOnline(false);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-accent/30 selection:text-white transition-colors duration-200">
      {/* Top Header / Nav */}
      <header className="h-14 border-b border-border bg-surface/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-3">
          {/* Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="ContextCore Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-contain bg-surface border border-accent/40 group-hover:border-accent shadow-md shadow-accent/20 transition-all"
            />
            <span className="font-bold text-sm tracking-tight text-foreground font-sans group-hover:text-accent transition-colors">
              ContextCore
            </span>
          </Link>

          {/* Center-Left Tab Links */}
          <div className="hidden md:flex items-center ml-6 border-l border-border pl-5 h-7 space-x-1.5 text-xs font-mono">
            <Link
              href="/workspace"
              className="px-3 py-1 text-xs font-medium text-muted hover:text-foreground rounded hover:bg-surface flex items-center gap-1.5 transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
              Workspace
            </Link>
            <Link
              href="/graph"
              className="px-3 py-1 text-xs font-medium text-muted hover:text-foreground rounded hover:bg-surface flex items-center gap-1.5 transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-success" />
              Memory Graph
            </Link>
            <Link
              href="/memory"
              className="px-3 py-1 text-xs font-medium text-muted hover:text-foreground rounded hover:bg-surface flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-[#A78BFA]" />
              Conventions
            </Link>
          </div>
        </div>

        {/* Right Side Info & Status */}
        <div className="flex items-center gap-3.5 text-xs font-mono">
          {/* Backend Health Pill */}
          <div className="flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1 rounded text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                apiOnline === true
                  ? "bg-success animate-pulse"
                  : apiOnline === false
                  ? "bg-amber-400"
                  : "bg-muted"
              }`}
            />
            <span className="text-muted">
              {apiOnline === true
                ? "API Online"
                : apiOnline === false
                ? "Offline Mode"
                : "Checking API..."}
            </span>
          </div>

          <a
            href="https://github.com/mario-world/contextcore"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-muted hover:text-foreground transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          {/* Auth Button */}
          <AuthButton />

          <Link
            href="/workspace"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded transition-all shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Launch</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[50%] translate-x-[-50%] w-[70%] h-[450px] bg-gradient-to-b from-accent/12 via-success/5 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8888880a_1px,transparent_1px),linear-gradient(to_bottom,#8888880a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,#000_70%,transparent_100%)] -z-20 opacity-50 pointer-events-none" />

        {/* Hero Section */}
        <section className="w-full max-w-5xl px-6 pt-16 pb-12 flex flex-col items-center text-center">
          {/* Centered Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface/80 backdrop-blur-md mb-6 shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-[11px] font-bold tracking-wider text-foreground font-mono">
              PERSISTENT REPO MEMORY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="text-[11px] text-muted font-mono">
              v2.0-stable
            </span>
          </div>

          {/* Medium Balanced Main Heading */}
          <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.15] mb-8 max-w-4xl text-foreground">
            The AI Partner That{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-accent-hover to-success">
              Remembers Your Code.
            </span>
          </h1>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 w-full max-w-md">
            <Link
              href="/workspace"
              className="w-full sm:w-auto px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/35 hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              <span>{user?.name ? `Enter Workspace as ${user.name.split(" ")[0]}` : "Enter Workspace"}</span>
            </Link>

            <Link
              href="/graph"
              className="w-full sm:w-auto px-6 py-3 bg-surface hover:bg-surface/80 border border-border hover:border-accent/50 text-foreground font-semibold rounded text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <Network className="w-4 h-4 text-success" />
              <span>Memory Graph</span>
            </Link>
          </div>

          {/* Interactive Live Memory Demonstration Card */}
          <div className="w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden text-left mb-16">
            {/* Terminal Top Bar */}
            <div className="h-9 bg-surface border-b border-border px-4 flex items-center justify-between font-mono text-xs text-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="ml-2 text-[11px] text-muted">
                  contextcore — memory-loop: active
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-success font-semibold">VERTEX VECTOR DB</span>
                <span>•</span>
                <span className="text-accent font-semibold">FIRESTORE STATE</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-5 font-mono text-xs space-y-4">
              {/* Turn 1: User Correction */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-border text-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  DEV
                </div>
                <div className="space-y-1 bg-background border border-border rounded-lg p-3 w-full">
                  <div className="text-[11px] text-muted">Natural Language Correction</div>
                  <p className="text-foreground">
                    &quot;Actually, in this repo we always use{" "}
                    <span className="text-accent font-bold">JWT Bearer tokens</span> with
                    RS256 validation for all endpoints instead of sessions.&quot;
                  </p>
                </div>
              </div>

              {/* Turn 1: Agent Acknowledgement & Storage */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 text-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  CC
                </div>
                <div className="space-y-2 bg-background border border-success/30 rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-success font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      NEW TEAM CONVENTION INDEXED
                    </span>
                    <span className="text-muted">TOPIC: AUTH • STRICT ENFORCEMENT</span>
                  </div>
                  <p className="text-muted text-[11px]">
                    Noted! I have embedded and saved this rule into Firestore and Vertex AI Vector
                    Search. It will be strictly injected into all future code generation prompts.
                  </p>
                </div>
              </div>

              {/* Turn 2: Automatic Context Recall */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-border text-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  DEV
                </div>
                <div className="space-y-1 bg-background border border-border rounded-lg p-3 w-full">
                  <div className="text-[11px] text-muted">Follow-up Request</div>
                  <p className="text-foreground">
                    &quot;Implement a new billing webhook endpoint in backend/main.py&quot;
                  </p>
                </div>
              </div>

              {/* Turn 2: Agent Response With Injected Rule */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 text-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  CC
                </div>
                <div className="space-y-2 bg-background border border-accent/30 rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between text-[10px] text-accent">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      APPLIED MEMORY CONVENTION: [AUTH]
                    </span>
                    <span className="text-muted">Model: gemini-2.0-flash ($0.00015/1k)</span>
                  </div>
                  <pre className="text-[11px] text-success bg-surface p-2.5 rounded border border-border overflow-x-auto">
{`@app.post("/billing/webhook")
def billing_webhook(req: WebhookPayload, auth: AuthToken = Depends(verify_jwt_bearer)):
    # Automatically adheres to RS256 JWT Bearer token convention
    return {"status": "received", "event": req.event_id}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mb-20">
            {/* Card 1: Memory */}
            <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden group hover:border-accent/40 transition-all text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-muted lowercase">vector store</span>
                <div className="flex items-center gap-1 text-accent">
                  <Database className="w-3.5 h-3.5" />
                  <span className="font-sans font-bold text-[10px] tracking-wider uppercase">
                    MEMORY
                  </span>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-foreground tracking-tight mb-1 font-mono">
                100k+
              </div>
              <p className="text-xs text-muted">
                Indexed AST Code Chunks & Conventions
              </p>
            </div>

            {/* Card 2: Latency */}
            <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden group hover:border-success/40 transition-all text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-muted lowercase">vertex search</span>
                <div className="flex items-center gap-1 text-success">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-sans font-bold text-[10px] tracking-wider uppercase">
                    LATENCY
                  </span>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-foreground tracking-tight mb-1 font-mono">
                12ms
              </div>
              <p className="text-xs text-muted">
                Semantic Memory Retrieval Time
              </p>
            </div>

            {/* Card 3: Accuracy */}
            <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden group hover:border-pro-purple/40 transition-all text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-muted lowercase">smart routing</span>
                <div className="flex items-center gap-1 text-[#A78BFA]">
                  <GitCommit className="w-3.5 h-3.5" />
                  <span className="font-sans font-bold text-[10px] tracking-wider uppercase">
                    COST SAVINGS
                  </span>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-foreground tracking-tight mb-1 font-mono">
                68%
              </div>
              <p className="text-xs text-muted">
                Saved via Gemini Flash / Pro Router
              </p>
            </div>
          </div>

          {/* Feature Architecture Cards */}
          <div className="w-full max-w-4xl text-left space-y-4 mb-20">
            <h2 className="text-xl font-bold text-foreground font-mono flex items-center gap-2 border-b border-border pb-3">
              <Layers className="w-4 h-4 text-accent" />
              Core Architecture Highlights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-lg p-5 space-y-2.5 hover:border-accent/40 transition-colors">
                <div className="flex items-center gap-2 text-accent">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-bold text-sm text-foreground">Natural Language Learning</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Correct the agent in normal conversation like a human pair programmer. ContextCore
                  classifies topic domains (auth, state, db, naming) and saves strict rules
                  automatically.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5 space-y-2.5 hover:border-success/40 transition-colors">
                <div className="flex items-center gap-2 text-success">
                  <Code2 className="w-4 h-4" />
                  <span className="font-bold text-sm text-foreground">AST Semantic Code Ingestion</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Parses Python ASTs and TypeScript grammar trees into function, class, and route
                  handler symbols so code is indexed with semantic structure, not dumb line slices.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5 space-y-2.5 hover:border-pro-purple/40 transition-colors">
                <div className="flex items-center gap-2 text-[#A78BFA]">
                  <Cpu className="w-4 h-4" />
                  <span className="font-bold text-sm text-foreground">Cost-Aware Model Routing</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Transparent routing: Lightweight explanations run on Gemini 2.0 Flash ($0.00015/1k)
                  while heavy refactoring routes to Gemini 2.5 Pro ($0.00125/1k), logged live to
                  Firestore.
                </p>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5 space-y-2.5 hover:border-amber-400/40 transition-colors">
                <div className="flex items-center gap-2 text-amber-400">
                  <Activity className="w-4 h-4" />
                  <span className="font-bold text-sm text-foreground">Crash-Resilient Checkpointing</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Checkpoints session execution step-by-step to Firestore. If a container resets or
                  crashes mid-generation, ContextCore recovers the pipeline without losing context.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Call to Action Section */}
          <div className="w-full max-w-4xl bg-surface border border-border rounded-xl p-8 text-center space-y-5 shadow-2xl mb-12">
            <h3 className="text-2xl font-bold text-foreground">
              Ready to code with persistent memory?
            </h3>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
              Launch a live session, ingest your repository, and explore what your AI partner
              remembers on the interactive Memory Graph.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/workspace"
                className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded shadow-md transition-all flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Workspace</span>
              </Link>
              <Link
                href="/graph"
                className="px-6 py-2.5 bg-background hover:bg-surface border border-border text-foreground text-xs font-semibold rounded transition-all flex items-center gap-2"
              >
                <Network className="w-3.5 h-3.5 text-success" />
                <span>Open Memory Graph</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-border bg-surface px-6 flex items-center justify-between text-[11px] font-mono text-muted shrink-0">
        <div>ContextCore • Persistent Memory AI Partner</div>
        <div className="flex items-center gap-4">
          <Link href="/workspace" className="hover:text-foreground transition-colors">
            Workspace
          </Link>
          <Link href="/graph" className="hover:text-foreground transition-colors">
            Memory Graph
          </Link>
          <Link href="/memory" className="hover:text-foreground transition-colors">
            Conventions
          </Link>
          <a
            href="https://github.com/mario-world/contextcore"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

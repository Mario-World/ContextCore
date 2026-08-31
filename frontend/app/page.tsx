"use client";

import Link from "next/link";
import {
  Terminal,
  Database,
  Zap,
  GitCommit,
  Settings,
  RefreshCw,
  FolderGit2,
  Code2,
  Play,
  FileText
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-accent/30 selection:text-white">
      {/* Top Header / Nav */}
      <header className="h-14 border-b border-border bg-surface/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          {/* Logo & Wordmark */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent/20 border border-accent/40 text-accent flex items-center justify-center font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white font-sans">
              ContextCore
            </span>
          </div>

          {/* Center-Left Tab Links (Visual Only) */}
          <div className="hidden lg:flex items-center ml-8 border-l border-border pl-6 h-8 space-x-1">
            <span className="px-3 py-1 text-xs font-semibold text-white bg-background border border-border rounded flex items-center gap-1.5 cursor-default select-none">
              <FolderGit2 className="w-3.5 h-3.5 text-accent" />
              Explorer
            </span>
            <span className="px-3 py-1 text-xs font-medium text-muted hover:text-white rounded flex items-center gap-1.5 transition-colors cursor-default select-none">
              <Terminal className="w-3.5 h-3.5 text-muted/60" />
              Terminal
            </span>
            <span className="px-3 py-1 text-xs font-medium text-muted hover:text-white rounded flex items-center gap-1.5 transition-colors cursor-default select-none">
              <Code2 className="w-3.5 h-3.5 text-muted/60" />
              Debug
            </span>
          </div>
        </div>

        {/* Right Side Info & Text Links */}
        <div className="flex items-center gap-5 text-xs">
          {/* Session Breadcrumb Placeholder */}
          <div className="hidden sm:flex items-center gap-1.5 bg-surface/50 border border-border/80 px-2.5 py-1 rounded font-mono text-muted text-[11px]">
            <span className="text-[10px] font-bold text-accent/80 tracking-wider">SESSION:</span>
            <span className="text-white font-medium">workspace / demo-session-1</span>
          </div>

          {/* Sync Link */}
          <button className="flex items-center gap-1 text-muted hover:text-accent font-medium transition-colors cursor-pointer select-none">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>sync</span>
          </button>

          {/* Settings Link */}
          <button className="flex items-center gap-1 text-muted hover:text-accent font-medium transition-colors cursor-pointer select-none">
            <Settings className="w-3.5 h-3.5" />
            <span>settings</span>
          </button>

          {/* Circular Avatar Placeholder */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-success border border-border/80 flex items-center justify-center text-[10px] font-bold text-white shadow-md select-none font-mono">
            CC
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[80%] h-[60%] bg-gradient-to-b from-accent/15 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[10%] w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] -z-20 opacity-40 pointer-events-none" />

        {/* 1. Centered Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface/80 backdrop-blur-md mb-8 shadow-lg shadow-black/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent animate-pulse"></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-white font-mono">
            SYSTEM.READY
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-border" />
          <span className="text-[11px] text-muted font-mono">
            v1.0.4-stable
          </span>
        </div>

        {/* 2. Large Centered Heading */}
        <h1 className="text-center font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[1.05] mb-6 max-w-5xl">
          <span className="text-white block">
            The AI Partner That
          </span>
          <span className="text-accent block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-hover">
            Remembers Your Code.
          </span>
        </h1>

        {/* 3. Subheading */}
        <p className="text-center text-muted text-base md:text-lg lg:text-xl max-w-2xl mb-10 leading-relaxed font-normal">
          A technical coding agent with long-term repository memory. Built for precision, not play.
        </p>

        {/* 4. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24 w-full max-w-md">
          {/* Start a New Session Button */}
          <Link
            href="/workspace"
            className="w-full sm:w-auto px-8 py-3.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-4 h-4 fill-current text-white" />
            <span>Start a New Session</span>
          </Link>

          {/* Docs Button */}
          <a
            href="https://github.com/mario-world/contextcore"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 border border-border hover:border-accent/40 bg-surface/50 hover:bg-surface text-white font-semibold rounded text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
          >
            <FileText className="w-4 h-4 text-muted" />
            <span>Docs</span>
          </a>
        </div>

        {/* 5. Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {/* Card 1: Memory */}
          <div className="bg-surface border border-border rounded p-6 relative overflow-hidden group hover:border-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/5">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <span className="font-mono text-xs text-muted/70 lowercase select-none">
                database
              </span>
              <div className="flex items-center gap-1.5 text-muted/60 group-hover:text-accent transition-colors select-none">
                <Database className="w-3.5 h-3.5" />
                <span className="font-sans font-bold text-[10px] tracking-wider uppercase">
                  MEMORY
                </span>
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="text-4xl font-extrabold text-white tracking-tight mb-2 font-mono">
                2.4 TB
              </div>
              <p className="text-sm text-muted font-sans font-medium">
                Indexed Context
              </p>
            </div>
          </div>

          {/* Card 2: Latency */}
          <div className="bg-surface border border-border rounded p-6 relative overflow-hidden group hover:border-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/5">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <span className="font-mono text-xs text-muted/70 lowercase select-none">
                bolt
              </span>
              <div className="flex items-center gap-1.5 text-muted/60 group-hover:text-success transition-colors select-none">
                <Zap className="w-3.5 h-3.5" />
                <span className="font-sans font-bold text-[10px] tracking-wider uppercase">
                  LATENCY
                </span>
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="text-4xl font-extrabold text-white tracking-tight mb-2 font-mono">
                12ms
              </div>
              <p className="text-sm text-muted font-sans font-medium">
                Retrieval Time
              </p>
            </div>
          </div>

          {/* Card 3: Accuracy */}
          <div className="bg-surface border border-border rounded p-6 relative overflow-hidden group hover:border-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/5">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <span className="font-mono text-xs text-muted/70 lowercase select-none">
                commit
              </span>
              <div className="flex items-center gap-1.5 text-muted/60 group-hover:text-success transition-colors select-none">
                <GitCommit className="w-3.5 h-3.5" />
                <span className="font-sans font-bold text-[10px] tracking-wider uppercase">
                  ACCURACY
                </span>
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="text-4xl font-extrabold text-white tracking-tight mb-2 font-mono">
                99.9%
              </div>
              <p className="text-sm text-muted font-sans font-medium">
                Syntax Precision
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

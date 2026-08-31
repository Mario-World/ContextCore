"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthButton from "@/components/AuthButton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Database,
  ArrowLeft,
  Search,
  Filter,
  RotateCw,
  Plus,
  Play,
  Pause,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  ShieldCheck,
  FileCode,
  Sparkles,
  Copy,
  Check,
  X,
  Sliders,
  Terminal,
  Code2,
} from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "repo" | "topic" | "convention" | "file" | "symbol" | "checkpoint";
  category?: string;
  topic?: string;
  symbol_type?: string;
  size: number;
  color: string;
  enforcement?: string;
  details?: {
    name?: string;
    topic?: string;
    text?: string;
    enforcement?: string;
    status?: string;
    file_path?: string;
    filename?: string;
    language?: string;
    symbol_name?: string;
    symbol_type?: string;
    line_range?: string;
    docstring?: string;
    snippet?: string;
    symbols_count?: number;
    description?: string;
    session_id?: string;
    step?: number;
    stage?: string;
    state?: any;
    timestamp?: string;
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  pinned?: boolean;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  label?: string;
  strength?: number;
}

interface GraphStats {
  repo_id: string;
  total_nodes: number;
  total_links: number;
  conventions_count: number;
  files_count: number;
  symbols_count: number;
  topics_count: number;
  checkpoints_count: number;
  memory_density: number;
  enforcement_mode: string;
  updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MemoryGraphPage() {
  const [repoId, setRepoId] = useState("mario-world/contextcore");
  const [rawNodes, setRawNodes] = useState<GraphNode[]>([]);
  const [rawLinks, setRawLinks] = useState<GraphLink[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Physics & Simulation Controls
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);
  const [repulsionStrength, setRepulsionStrength] = useState(250);
  const [linkDistance, setLinkDistance] = useState(85);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [showTeachModal, setShowTeachModal] = useState(false);

  // Teach modal form state
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleTopic, setNewRuleTopic] = useState("auth");
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Canvas & Interaction references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvas = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<{ source: GraphNode; target: GraphNode; type: string; color: string }[]>([]);
  const particlesRef = useRef<{ linkIdx: number; progress: number; speed: number; color: string }[]>([]);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Graph Data from Backend
  const fetchGraphData = useCallback(async () => {
    if (!repoId.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(repoId)}/graph`);
      if (res.ok) {
        const data = await res.json();
        setRawNodes(data.nodes || []);
        setRawLinks(data.links || []);
        setStats(data.stats || null);
        initSimulation(data.nodes || [], data.links || []);
      } else {
        const altRes = await fetch(`${API_BASE}/graph/${encodeURIComponent(repoId)}`);
        if (altRes.ok) {
          const data = await altRes.json();
          setRawNodes(data.nodes || []);
          setRawLinks(data.links || []);
          setStats(data.stats || null);
          initSimulation(data.nodes || [], data.links || []);
        }
      }
    } catch (err) {
      console.error("Failed to load memory graph:", err);
      showToast("Unable to reach backend memory graph endpoint. Showing cached knowledge.");
    } finally {
      setIsLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Initialize simulation positions
  const initSimulation = (nodes: GraphNode[], links: GraphLink[]) => {
    const width = typeof window !== "undefined" ? window.innerWidth || 1200 : 1200;
    const height = typeof window !== "undefined" ? window.innerHeight || 800 : 800;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodeMap = new Map<string, GraphNode>();

    // Initial positioning in radial clusters
    const processedNodes: GraphNode[] = nodes.map((node, i) => {
      let angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      let dist = 150 + Math.random() * 250;

      if (node.type === "repo") {
        dist = 0;
      } else if (node.type === "topic") {
        dist = 110 + (i % 8) * 30;
      } else if (node.type === "convention") {
        dist = 220 + (i % 6) * 40;
      } else if (node.type === "file") {
        dist = 300 + (i % 10) * 35;
      } else if (node.type === "symbol") {
        dist = 380 + (i % 20) * 40;
      }

      const x = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40;
      const y = centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40;

      const n: GraphNode = {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0,
        pinned: node.type === "repo",
      };
      nodeMap.set(node.id, n);
      return n;
    });

    nodesRef.current = processedNodes;

    // Resolve link references
    const resolvedLinks: { source: GraphNode; target: GraphNode; type: string; color: string }[] = [];
    links.forEach((l) => {
      const srcId = typeof l.source === "string" ? l.source : l.source.id;
      const tgtId = typeof l.target === "string" ? l.target : l.target.id;
      const src = nodeMap.get(srcId);
      const tgt = nodeMap.get(tgtId);

      if (src && tgt) {
        let linkColor = "rgba(99, 102, 241, 0.25)";
        if (l.type === "defines_rule") linkColor = "rgba(62, 207, 142, 0.4)";
        else if (l.type === "applies_to") linkColor = "rgba(245, 158, 11, 0.45)";
        else if (l.type === "declares_symbol") linkColor = "rgba(167, 139, 250, 0.2)";
        else if (l.type === "contains_file") linkColor = "rgba(6, 182, 212, 0.3)";

        resolvedLinks.push({
          source: src,
          target: tgt,
          type: l.type,
          color: linkColor,
        });
      }
    });

    linksRef.current = resolvedLinks;

    // Seed animated particles along links
    const particles = [];
    for (let i = 0; i < Math.min(resolvedLinks.length, 45); i++) {
      particles.push({
        linkIdx: i,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.006,
        color: resolvedLinks[i].color.replace(/[\d\.]+\)$/g, "0.9)"),
      });
    }
    particlesRef.current = particles;

    transformRef.current = {
      x: 0,
      y: 0,
      scale: 1,
    };
  };

  // Teach New Rule Handler
  const handleTeachRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim() || isSubmittingRule) return;

    setIsSubmittingRule(true);
    try {
      const res = await fetch(`${API_BASE}/memory/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: repoId,
          text: newRuleText.trim(),
          topic: newRuleTopic,
        }),
      });

      if (res.ok) {
        showToast(`Rule successfully learned under topic '${newRuleTopic}'! Graph updated.`);
        setNewRuleText("");
        setShowTeachModal(false);
        await fetchGraphData();
      } else {
        const chatRes = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: `rule-add-${Date.now()}`,
            repo_id: repoId,
            message: `Actually we use ${newRuleText.trim()}`,
          }),
        });
        if (chatRes.ok) {
          showToast(`Rule registered into memory agent!`);
          setNewRuleText("");
          setShowTeachModal(false);
          await fetchGraphData();
        } else {
          showToast("Failed to save convention. Please try again.");
        }
      }
    } catch (err: any) {
      showToast(`Network error: ${err.message || "Could not reach server"}`);
    } finally {
      setIsSubmittingRule(false);
    }
  };

  // Filtered nodes logic
  const filteredNodeIds = useMemo(() => {
    const ids = new Set<string>();
    const query = searchQuery.toLowerCase().trim();

    nodesRef.current.forEach((n) => {
      const matchesType =
        selectedTypeFilter === "all" ||
        n.type === selectedTypeFilter;

      const matchesTopic =
        selectedTopicFilter === "all" ||
        (n.topic && n.topic.toLowerCase() === selectedTopicFilter.toLowerCase());

      const matchesSearch =
        !query ||
        n.label.toLowerCase().includes(query) ||
        (n.details?.text && n.details.text.toLowerCase().includes(query)) ||
        (n.details?.file_path && n.details.file_path.toLowerCase().includes(query)) ||
        (n.details?.symbol_name && n.details.symbol_name.toLowerCase().includes(query));

      if (matchesType && matchesTopic && matchesSearch) {
        ids.add(n.id);
      }
    });

    return ids;
  }, [searchQuery, selectedTypeFilter, selectedTopicFilter]);

  // Center on node helper
  const centerOnNode = (node: GraphNode) => {
    if (!canvasRef.current || node.x === undefined || node.y === undefined) return;
    const canvas = canvasRef.current;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const targetScale = 1.4;
    transformRef.current = {
      x: width / 2 - node.x * targetScale,
      y: height / 2 - node.y * targetScale,
      scale: targetScale,
    };
    setSelectedNode(node);
  };

  // Reset Camera View
  const resetCamera = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodesRef.current.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
    });

    if (minX !== Infinity) {
      const graphWidth = maxX - minX + 160;
      const graphHeight = maxY - minY + 160;
      const scale = Math.min(width / graphWidth, height / graphHeight, 1.2);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      transformRef.current = {
        x: width / 2 - cx * scale,
        y: height / 2 - cy * scale,
        scale: Math.max(0.4, scale),
      };
    } else {
      transformRef.current = { x: 0, y: 0, scale: 1 };
    }
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const cx = width / 2;
    const cy = height / 2;

    const oldScale = transformRef.current.scale;
    const newScale = Math.max(0.2, Math.min(3.5, oldScale * factor));

    transformRef.current = {
      x: cx - (cx - transformRef.current.x) * (newScale / oldScale),
      y: cy - (cy - transformRef.current.y) * (newScale / oldScale),
      scale: newScale,
    };
  };

  // Main Canvas Animation Loop & Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const handleResize = () => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const stepPhysics = () => {
      if (!isPhysicsRunning) return;

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const kRepulsion = repulsionStrength * 10;
      const kSpring = 0.04;
      const targetDist = linkDistance;
      const centerGravity = 0.008;

      const centerX = (canvas.width / dpr) / 2;
      const centerY = (canvas.height / dpr) / 2;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (n1.x === undefined || n1.y === undefined) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          if (n2.x === undefined || n2.y === undefined) continue;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);

          if (dist < 450) {
            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!n1.pinned) {
              n1.vx = (n1.vx || 0) - fx;
              n1.vy = (n1.vy || 0) - fy;
            }
            if (!n2.pinned) {
              n2.vx = (n2.vx || 0) + fx;
              n2.vy = (n2.vy || 0) + fy;
            }
          }
        }

        if (!n1.pinned) {
          n1.vx = (n1.vx || 0) + (centerX - n1.x) * centerGravity;
          n1.vy = (n1.vy || 0) + (centerY - n1.y) * centerGravity;
        }
      }

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const src = link.source;
        const tgt = link.target;
        if (src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) continue;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = dist - targetDist;
        const force = displacement * kSpring;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!src.pinned) {
          src.vx = (src.vx || 0) + fx;
          src.vy = (src.vy || 0) + fy;
        }
        if (!tgt.pinned) {
          tgt.vx = (tgt.vx || 0) - fx;
          tgt.vy = (tgt.vy || 0) - fy;
        }
      }

      const damping = 0.88;
      nodes.forEach((n) => {
        if (!n.pinned) {
          n.vx = (n.vx || 0) * damping;
          n.vy = (n.vy || 0) * damping;
          n.x = (n.x || 0) + n.vx;
          n.y = (n.y || 0) + n.vy;
        }
      });
    };

    const render = () => {
      stepPhysics();

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const isLight = typeof document !== "undefined" && document.documentElement.classList.contains("light");

      const { x: tx, y: ty, scale } = transformRef.current;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      const gridSize = 60;
      const viewW = (canvas.width / dpr) / scale;
      const viewH = (canvas.height / dpr) / scale;
      const startX = -tx / scale - 100;
      const startY = -ty / scale - 100;
      const endX = startX + viewW + 200;
      const endY = startY + viewH + 200;

      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      for (let gx = Math.floor(startX / gridSize) * gridSize; gx < endX; gx += gridSize) {
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, endY);
      }
      for (let gy = Math.floor(startY / gridSize) * gridSize; gy < endY; gy += gridSize) {
        ctx.moveTo(startX, gy);
        ctx.lineTo(endX, gy);
      }
      ctx.stroke();

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const filtered = filteredNodeIds;

      links.forEach((link) => {
        const src = link.source;
        const tgt = link.target;
        if (src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) return;

        const isSrcVisible = filtered.has(src.id);
        const isTgtVisible = filtered.has(tgt.id);
        const isHighlighted =
          (selectedNode && (src.id === selectedNode.id || tgt.id === selectedNode.id)) ||
          (hoveredNode && (src.id === hoveredNode.id || tgt.id === hoveredNode.id));

        const opacity = isHighlighted ? 0.9 : isSrcVisible && isTgtVisible ? (isLight ? 0.6 : 0.4) : 0.06;

        ctx.strokeStyle = link.color.replace(/[\d\.]+\)$/g, `${opacity})`);
        ctx.lineWidth = isHighlighted ? 2.2 / scale : 1.2 / scale;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      });

      // Draw active traveling memory particles
      particlesRef.current.forEach((p) => {
        const link = links[p.linkIdx];
        if (!link) return;
        const src = link.source;
        const tgt = link.target;
        if (src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) return;

        if (filtered.has(src.id) || filtered.has(tgt.id)) {
          if (isPhysicsRunning) {
            p.progress += p.speed;
            if (p.progress > 1) p.progress = 0;
          }

          const px = src.x + (tgt.x - src.x) * p.progress;
          const py = src.y + (tgt.y - src.y) * p.progress;

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, 2.2 / scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Nodes
      nodes.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return;

        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isVisible = filtered.has(node.id);
        const isDimmed = !isVisible;

        const radius = (node.size || 16) / 2;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.15 : 1;

        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? "#3ECF8E" : "#6366F1";
          ctx.lineWidth = 3 / scale;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 6 / scale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = isSelected ? "rgba(62, 207, 142, 0.18)" : "rgba(99, 102, 241, 0.18)";
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 12 / scale, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = node.color || "#6366F1";
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();

        if (scale > 0.6 || isSelected || isHovered || node.type === "repo" || node.type === "topic") {
          ctx.font = `${Math.max(10, node.type === "repo" ? 13 : 11) / scale}px var(--font-mono, monospace)`;
          ctx.fillStyle = isDimmed
            ? (isLight ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)")
            : (isLight ? "#0F172A" : "#FFFFFF");
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.shadowColor = isLight ? "rgba(255, 255, 255, 0.9)" : "#000000";
          ctx.shadowBlur = 4;
          ctx.fillText(node.label, node.x, node.y + radius + 14 / scale);
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      });

      ctx.restore();
      ctx.restore();

      renderMinimap();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const renderMinimap = () => {
      const minimap = minimapRef.current;
      if (!minimap) return;
      const mctx = minimap.getContext("2d");
      if (!mctx) return;

      mctx.clearRect(0, 0, minimap.width, minimap.height);

      const nodes = nodesRef.current;
      if (!nodes.length) return;

      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      nodes.forEach((n) => {
        if (n.x !== undefined && n.y !== undefined) {
          minX = Math.min(minX, n.x);
          maxX = Math.max(maxX, n.x);
          minY = Math.min(minY, n.y);
          maxY = Math.max(maxY, n.y);
        }
      });

      const pad = 80;
      const gw = Math.max(100, maxX - minX + pad * 2);
      const gh = Math.max(100, maxY - minY + pad * 2);
      const mw = minimap.width;
      const mh = minimap.height;
      const mScale = Math.min(mw / gw, mh / gh);

      nodes.forEach((n) => {
        if (n.x === undefined || n.y === undefined) return;
        const mx = (n.x - minX + pad) * mScale;
        const my = (n.y - minY + pad) * mScale;

        mctx.fillStyle = n.color || "#6366F1";
        mctx.beginPath();
        mctx.arc(mx, my, 1.8, 0, Math.PI * 2);
        mctx.fill();
      });

      const { x: tx, y: ty, scale } = transformRef.current;
      const vw = canvas.width / dpr / scale;
      const vh = canvas.height / dpr / scale;
      const vx = -tx / scale;
      const vy = -ty / scale;

      const mvx = (vx - minX + pad) * mScale;
      const mvy = (vy - minY + pad) * mScale;
      const mvw = vw * mScale;
      const mvh = vh * mScale;

      mctx.strokeStyle = "#3ECF8E";
      mctx.lineWidth = 1.2;
      mctx.strokeRect(mvx, mvy, mvw, mvh);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [isPhysicsRunning, repulsionStrength, linkDistance, selectedNode, hoveredNode, filteredNodeIds]);

  const getNodeAtCoords = (clientX: number, clientY: number): GraphNode | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { x: tx, y: ty, scale } = transformRef.current;

    const mouseX = (clientX - rect.left - tx) / scale;
    const mouseY = (clientY - rect.top - ty) / scale;

    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.x === undefined || n.y === undefined) continue;
      const dx = mouseX - n.x;
      const dy = mouseY - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= Math.max(10, n.size + 4)) {
        return n;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAtCoords(e.clientX, e.clientY);
    if (node) {
      draggedNodeRef.current = node;
      node.pinned = true;
    } else {
      isDraggingCanvas.current = true;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAtCoords(e.clientX, e.clientY);
    setHoveredNode(node);

    if (draggedNodeRef.current) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const { x: tx, y: ty, scale } = transformRef.current;
      draggedNodeRef.current.x = (e.clientX - rect.left - tx) / scale;
      draggedNodeRef.current.y = (e.clientY - rect.top - ty) / scale;
    } else if (isDraggingCanvas.current) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      if (draggedNodeRef.current.type !== "repo") {
        draggedNodeRef.current.pinned = false;
      }
      setSelectedNode(draggedNodeRef.current);
      draggedNodeRef.current = null;
    } else if (isDraggingCanvas.current) {
      isDraggingCanvas.current = false;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const oldScale = transformRef.current.scale;
    const newScale = Math.max(0.15, Math.min(4.0, oldScale * zoomFactor));

    transformRef.current = {
      x: mouseX - (mouseX - transformRef.current.x) * (newScale / oldScale),
      y: mouseY - (mouseY - transformRef.current.y) * (newScale / oldScale),
      scale: newScale,
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const topicsList = useMemo(() => {
    const set = new Set<string>();
    rawNodes.forEach((n) => {
      if (n.topic) set.add(n.topic.toLowerCase());
    });
    return Array.from(set);
  }, [rawNodes]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden select-none">
      {/* Top Header & Navigation */}
      <header className="h-14 border-b border-border bg-surface/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors bg-surface px-2.5 py-1.5 rounded border border-border"
          >
            <span>Home</span>
          </Link>
          <Link
            href="/workspace"
            className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors bg-surface px-2.5 py-1.5 rounded border border-border"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </Link>
          <div className="h-4 w-[1px] bg-border" />

          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="ContextCore Logo"
              width={30}
              height={30}
              className="w-8 h-8 rounded-lg object-contain bg-surface border border-accent/40 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-foreground font-sans">
                  ContextCore Memory Graph
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-success font-semibold">
                  LIVE VISUALIZER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3">
          {/* Repository Selector */}
          <div className="flex items-center gap-2 bg-background px-3 py-1 rounded border border-border text-xs font-mono">
            <span className="text-muted hidden sm:inline">REPO:</span>
            <input
              type="text"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="bg-transparent border-none text-accent font-semibold focus:outline-none w-44"
              placeholder="repo_id..."
            />
          </div>

          <button
            onClick={fetchGraphData}
            disabled={isLoading}
            title="Refresh Memory Graph"
            className="bg-surface hover:bg-surface/80 p-2 rounded border border-border text-muted hover:text-accent transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Quick Teach Rule Button */}
          <button
            onClick={() => setShowTeachModal(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded transition-all shadow-md shadow-accent/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Teach Rule</span>
          </button>

          {/* Link to List Inspector */}
          <Link
            href="/memory"
            className="hidden md:flex items-center gap-1.5 text-xs text-muted hover:text-foreground bg-surface hover:bg-surface/80 px-3 py-1.5 rounded border border-border transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Table View</span>
          </Link>

          <AuthButton />
        </div>
      </header>

      {/* Filter and Stats Bar */}
      <div className="h-12 border-b border-[#26262B] bg-[#0E0E10] px-6 flex items-center justify-between gap-4 z-20 text-xs">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[#9CA3AF] font-mono text-[11px] uppercase mr-1 hidden sm:inline">
            Filters:
          </span>
          {[
            { key: "all", label: "All Nodes", count: rawNodes.length },
            { key: "convention", label: "Conventions", count: stats?.conventions_count ?? 0 },
            { key: "symbol", label: "AST Symbols", count: stats?.symbols_count ?? 0 },
            { key: "file", label: "Files", count: stats?.files_count ?? 0 },
            { key: "topic", label: "Topics", count: stats?.topics_count ?? 0 },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedTypeFilter(f.key)}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-all whitespace-nowrap ${
                selectedTypeFilter === f.key
                  ? "bg-[#6366F1] text-white font-semibold shadow-sm"
                  : "bg-[#1A1A1E] text-[#9CA3AF] hover:text-white border border-[#26262B]"
              }`}
            >
              {f.label} <span className="opacity-70 text-[10px]">({f.count})</span>
            </button>
          ))}

          {/* Topic Isolator Dropdown */}
          {topicsList.length > 0 && (
            <select
              value={selectedTopicFilter}
              onChange={(e) => setSelectedTopicFilter(e.target.value)}
              className="bg-[#1A1A1E] border border-[#26262B] text-[#9CA3AF] text-xs font-mono rounded px-2.5 py-1 focus:outline-none focus:border-[#6366F1]"
            >
              <option value="all">All Topics</option>
              {topicsList.map((t) => (
                <option key={t} value={t}>
                  Domain: {t.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Live Search Input */}
        <div className="relative w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols, rules, files..."
            className="w-full bg-[#1A1A1E] border border-[#26262B] rounded pl-8 pr-3 py-1 text-xs font-mono text-[#F3F4F6] placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#6366F1] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Visualization Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-[#070708]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Floating Quick Stats Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2 z-10">
          <div className="bg-[#121214]/90 backdrop-blur border border-[#26262B] rounded-lg p-3 shadow-xl pointer-events-auto space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between border-b border-[#26262B] pb-1.5">
              <span className="text-[11px] font-mono text-[#9CA3AF] font-bold uppercase">
                Memory Metrics
              </span>
              <span className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-ping" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <div className="text-[10px] text-[#9CA3AF]">TOTAL NODES</div>
                <div className="text-sm font-bold text-white">{stats?.total_nodes ?? rawNodes.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">RELATIONS</div>
                <div className="text-sm font-bold text-[#6366F1]">{stats?.total_links ?? rawLinks.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">ACTIVE RULES</div>
                <div className="text-sm font-bold text-[#3ECF8E]">{stats?.conventions_count ?? 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">AST SYMBOLS</div>
                <div className="text-sm font-bold text-[#A78BFA]">{stats?.symbols_count ?? 0}</div>
              </div>
            </div>
            <div className="pt-1.5 border-t border-[#26262B] flex items-center justify-between text-[10px] font-mono text-[#9CA3AF]">
              <span>ENFORCEMENT:</span>
              <span className="text-amber-400 font-semibold">STRICT</span>
            </div>
          </div>
        </div>

        {/* Floating Canvas Controls Toolbar */}
        <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-[#121214]/90 backdrop-blur border border-[#26262B] rounded-lg p-1.5 shadow-2xl z-10">
          <button
            onClick={() => handleZoom(1.2)}
            title="Zoom In"
            className="p-2 hover:bg-[#26262B] rounded text-[#9CA3AF] hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            title="Zoom Out"
            className="p-2 hover:bg-[#26262B] rounded text-[#9CA3AF] hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetCamera}
            title="Reset View / Fit Screen"
            className="p-2 hover:bg-[#26262B] rounded text-[#9CA3AF] hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-[#26262B] mx-1" />
          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            title={isPhysicsRunning ? "Pause Physics Simulation" : "Resume Physics Simulation"}
            className={`p-2 rounded transition-colors ${
              isPhysicsRunning ? "text-[#3ECF8E] hover:bg-[#26262B]" : "text-amber-400 bg-amber-400/10"
            }`}
          >
            {isPhysicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowControlsModal(!showControlsModal)}
            title="Simulation Physics Settings"
            className={`p-2 rounded text-[#9CA3AF] hover:text-white hover:bg-[#26262B] transition-colors ${
              showControlsModal ? "text-[#6366F1] bg-[#6366F1]/10" : ""
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Minimap in Bottom Right */}
        <div className="absolute bottom-6 right-6 bg-[#121214]/90 backdrop-blur border border-[#26262B] rounded-lg p-2 shadow-2xl z-10 hidden sm:block">
          <div className="text-[9px] font-mono text-[#9CA3AF] uppercase mb-1 flex items-center justify-between">
            <span>Viewport Radar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
          </div>
          <canvas
            ref={minimapRef}
            width={160}
            height={110}
            className="w-40 h-28 bg-[#0A0A0B] rounded border border-[#26262B]"
          />
        </div>

        {/* Physics Controls Popover */}
        {showControlsModal && (
          <div className="absolute bottom-20 left-6 bg-[#121214] border border-[#26262B] rounded-lg p-4 shadow-2xl z-20 w-72 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#26262B] pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#6366F1]" />
                Physics Tuning
              </span>
              <button
                onClick={() => setShowControlsModal(false)}
                className="text-[#9CA3AF] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1">
                  <span>Charge Repulsion:</span>
                  <span className="text-white">{repulsionStrength}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  value={repulsionStrength}
                  onChange={(e) => setRepulsionStrength(Number(e.target.value))}
                  className="w-full accent-[#6366F1] bg-[#1A1A1E]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1">
                  <span>Link Spring Length:</span>
                  <span className="text-white">{linkDistance}px</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={linkDistance}
                  onChange={(e) => setLinkDistance(Number(e.target.value))}
                  className="w-full accent-[#6366F1] bg-[#1A1A1E]"
                />
              </div>

              <div className="pt-2 border-t border-[#26262B] flex justify-between">
                <button
                  onClick={() => {
                    setRepulsionStrength(250);
                    setLinkDistance(85);
                  }}
                  className="text-[11px] text-[#9CA3AF] hover:text-white underline"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Node Detail Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-[#121214]/98 border-l border-[#26262B] shadow-2xl p-6 z-20 flex flex-col justify-between overflow-y-auto font-sans backdrop-blur-md">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[#26262B] pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedNode.color || "#6366F1" }}
                  />
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1A1A1E] text-[#9CA3AF] border border-[#26262B]">
                      {selectedNode.category || selectedNode.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[#9CA3AF] hover:text-white p-1 rounded hover:bg-[#1A1A1E] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Title */}
              <div>
                <h3 className="text-lg font-bold text-white font-mono break-words">
                  {selectedNode.label}
                </h3>
                {selectedNode.topic && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-[#6366F1]">
                    <span>TOPIC:</span>
                    <span className="uppercase font-semibold">{selectedNode.topic}</span>
                  </div>
                )}
              </div>

              {/* Convention Rule Details */}
              {selectedNode.type === "convention" && selectedNode.details?.text && (
                <div className="space-y-3 bg-[#0A0A0B] border border-[#26262B] rounded-lg p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      ENFORCEMENT: STRICT
                    </span>
                    <span className="text-[#3ECF8E]">ACTIVE</span>
                  </div>
                  <p className="text-xs text-[#F3F4F6] font-mono leading-relaxed bg-[#121214] p-3 rounded border border-[#26262B]/80">
                    &quot;{selectedNode.details.text}&quot;
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA3AF] pt-1">
                    <span>ID: {selectedNode.id}</span>
                    <button
                      onClick={() => copyToClipboard(selectedNode.details?.text || "")}
                      className="flex items-center gap-1 text-[#6366F1] hover:underline"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-[#3ECF8E]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText ? "Copied" : "Copy Rule"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* AST Symbol Details & Code Snippet */}
              {selectedNode.type === "symbol" && selectedNode.details && (
                <div className="space-y-3 bg-[#0A0A0B] border border-[#26262B] rounded-lg p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#A78BFA]">
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" />
                      {selectedNode.symbol_type?.toUpperCase() || "FUNCTION"}
                    </span>
                    <span className="text-[#9CA3AF]">Lines {selectedNode.details.line_range}</span>
                  </div>

                  {selectedNode.details.file_path && (
                    <div className="text-xs font-mono text-[#06B6D4] truncate">
                      File: {selectedNode.details.file_path}
                    </div>
                  )}

                  {selectedNode.details.docstring && (
                    <p className="text-xs text-[#9CA3AF] italic bg-[#121214] p-2.5 rounded border border-[#26262B]">
                      {selectedNode.details.docstring}
                    </p>
                  )}

                  {selectedNode.details.snippet && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#9CA3AF]">CODE PREVIEW:</div>
                      <pre className="text-[11px] font-mono text-[#3ECF8E] bg-[#121214] p-2.5 rounded border border-[#26262B] overflow-x-auto">
                        {selectedNode.details.snippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Source File Details */}
              {selectedNode.type === "file" && selectedNode.details && (
                <div className="space-y-3 bg-[#0A0A0B] border border-[#26262B] rounded-lg p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#06B6D4]">
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5" />
                      SOURCE MODULE
                    </span>
                    <span className="uppercase">{selectedNode.details.language}</span>
                  </div>
                  <div className="text-xs font-mono text-white break-all">
                    {selectedNode.details.file_path}
                  </div>
                  <div className="text-xs font-mono text-[#9CA3AF]">
                    Contains {selectedNode.details.symbols_count ?? 0} indexed symbols
                  </div>
                </div>
              )}

              {/* Topic Cluster Details */}
              {selectedNode.type === "topic" && (
                <div className="space-y-3 bg-[#0A0A0B] border border-[#26262B] rounded-lg p-4">
                  <div className="text-xs font-mono text-[#9CA3AF]">
                    Domain knowledge cluster representing architectural decisions, conventions, and
                    code structures related to{" "}
                    <span className="text-white font-bold">{selectedNode.label}</span>.
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-[#26262B] space-y-2">
              <Link
                href="/workspace"
                className="w-full flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#818CF8] text-white text-xs font-semibold py-2.5 rounded transition-all shadow-md"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Test in Workspace Chat</span>
              </Link>

              <button
                onClick={() => centerOnNode(selectedNode)}
                className="w-full flex items-center justify-center gap-2 bg-[#1A1A1E] hover:bg-[#26262B] text-[#9CA3AF] hover:text-white text-xs font-mono py-2 rounded border border-[#26262B] transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Focus Camera on Node</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal: Teach Agent New Convention */}
        {showTeachModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#121214] border border-[#26262B] rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-5 font-sans">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 text-[#3ECF8E] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Teach Agent a New Rule</h3>
                    <p className="text-[11px] text-[#9CA3AF]">
                      ContextCore will strictly prioritize this convention in all code answers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeachModal(false)}
                  className="text-[#9CA3AF] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleTeachRule} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[#9CA3AF] mb-1.5">
                    TOPIC DOMAIN:
                  </label>
                  <select
                    value={newRuleTopic}
                    onChange={(e) => setNewRuleTopic(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#26262B] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#6366F1]"
                  >
                    <option value="auth">Auth (Authentication, JWT, Permissions)</option>
                    <option value="state">State (Zustand, React State, Stores)</option>
                    <option value="database">Database (Firestore, SQL, Schemas)</option>
                    <option value="api">API (Endpoints, Responses, REST, GraphQL)</option>
                    <option value="naming">Naming (Conventions, Casing, Prefixing)</option>
                    <option value="style">Style (Tailwind, CSS, Layouts, Theme)</option>
                    <option value="routing">Routing (Next.js Pages, Handlers)</option>
                    <option value="test">Testing (Unit Tests, Mocks, Coverage)</option>
                    <option value="general">General Architecture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#9CA3AF] mb-1.5">
                    CONVENTION INSTRUCTION:
                  </label>
                  <textarea
                    rows={4}
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    placeholder="e.g. Always use JWT Bearer tokens in Authorization header for protected endpoints instead of cookie-based sessions."
                    className="w-full bg-[#0A0A0B] border border-[#26262B] rounded p-3 text-xs font-mono text-white placeholder-[#9CA3AF]/50 focus:outline-none focus:border-[#6366F1]"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTeachModal(false)}
                    className="px-4 py-2 text-xs font-mono text-[#9CA3AF] hover:text-white bg-[#1A1A1E] rounded border border-[#26262B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRule || !newRuleText.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#6366F1] hover:bg-[#818CF8] rounded transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmittingRule ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmittingRule ? "Learning..." : "Save to Agent Memory"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#121214] border border-[#3ECF8E]/40 text-[#3ECF8E] px-4 py-2.5 rounded-lg shadow-2xl text-xs font-mono flex items-center gap-2 z-50 animate-bounce">
            <Sparkles className="w-4 h-4 text-[#3ECF8E]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

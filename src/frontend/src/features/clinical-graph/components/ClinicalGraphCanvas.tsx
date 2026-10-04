import React, { useEffect, useRef, useState } from 'react';
import type { GraphNode, GraphEdge } from '../types';

// =========================================================================
// 🎛️ CUSTOMIZATION SETTINGS - TWEAK SHAPES, SIZES, AND RADIANT GLOW HERE!
// =========================================================================

// 1. CHOOSE SHAPE: 'diamond' | 'circle' | 'hexagon'
export const DEFAULT_NODE_SHAPE: 'diamond' | 'circle' | 'hexagon' = 'diamond';

// 2. CHOOSE SIZES (Radii in pixels - smaller & sharper!)
export const NODE_SIZES = {
  target: 18,       // Main target diagnosis node
  clue: 12,         // Primary input clue nodes
  intermediate: 10, // Bridge / pathway intermediate nodes
  halo: 6,          // Background context stars
};

// 3. CHOOSE SHININESS / RADIANT GLOW (ShadowBlur in pixels)
export const GLOW_LEVELS = {
  target: { normal: 24, hover: 38 },
  clue: { normal: 18, hover: 28 },
  intermediate: { normal: 14, hover: 24 },
  halo: { normal: 8, hover: 16 },
};

// 4. FIXED CANVAS HEIGHT SCALE (Default is 1.3 = 130%! Tweak this number to change height!)
export const DEFAULT_CANVAS_HEIGHT_SCALE = 1.3;

// =========================================================================

interface ClinicalGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (node: GraphNode | null) => void;
  onAddHaloToClues?: (haloLabel: string) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isDragging?: boolean;
}

export const ClinicalGraphCanvas: React.FC<ClinicalGraphCanvasProps> = ({
  nodes,
  edges,
  onSelectNode,
  onAddHaloToClues,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const draggedNodeRef = useRef<SimNode | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 750,
    height: 560,
  });

  // Dynamically observe container dimensions so canvas bitmap matches 1:1 without horizontal stretching
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const newW = Math.round(width);
          const newH = Math.round(height);

          setCanvasDimensions((prev) => {
            if (prev.width === newW && prev.height === newH) return prev;
            // Proportionally scale existing nodes horizontally so they spread cleanly across the new width
            if (prev.width > 0 && newW > 0 && prev.width !== newW) {
              const scaleRatio = newW / prev.width;
              simNodesRef.current.forEach((node) => {
                node.x *= scaleRatio;
              });
            }
            return { width: newW, height: newH };
          });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize simulation nodes with customized compact sizes
  useEffect(() => {
    const width = canvasDimensions.width || 750;
    const height = canvasDimensions.height || 560;

    simNodesRef.current = nodes.map((n) => {
      let radius = NODE_SIZES.intermediate;
      let initialX = width / 2 + (Math.random() - 0.5) * 200;
      let initialY = height / 2 + (Math.random() - 0.5) * 200;

      if (n.type === 'target') {
        radius = NODE_SIZES.target;
        initialX = width * 0.78;
        initialY = height * 0.5;
      } else if (n.type === 'clue') {
        radius = NODE_SIZES.clue;
        initialX = width * 0.18;
        initialY = height * (0.2 + Math.random() * 0.6);
      } else if (n.type === 'intermediate') {
        radius = NODE_SIZES.intermediate;
        initialX = width * 0.48;
        initialY = height * (0.25 + Math.random() * 0.5);
      } else if (n.type === 'halo') {
        radius = NODE_SIZES.halo;
        initialX = width * (0.15 + Math.random() * 0.7);
        initialY = height * (0.1 + Math.random() * 0.8);
      }

      return {
        ...n,
        x: initialX,
        y: initialY,
        vx: 0,
        vy: 0,
        radius,
      };
    });
  }, [nodes, canvasDimensions.height]);

  // Shape drawing helper
  const drawNodeShape = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    shape: 'diamond' | 'circle' | 'hexagon',
    isTarget: boolean
  ) => {
    ctx.beginPath();
    if (isTarget || shape === 'circle') {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (shape === 'diamond') {
      ctx.moveTo(x, y - r * 1.3);
      ctx.lineTo(x + r * 1.3, y);
      ctx.lineTo(x, y + r * 1.3);
      ctx.lineTo(x - r * 1.3, y);
      ctx.closePath();
    } else if (shape === 'hexagon') {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + r * 1.18 * Math.cos(angle);
        const hy = y + r * 1.18 * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
    }
  };

  // Main animation loop with visible, tangible texture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stepCount = 0;

    const render = () => {
      stepCount++;
      const width = canvas.width;
      const height = canvas.height;
      const simNodes = simNodesRef.current;
      const nodeMap = new Map<string, SimNode>(simNodes.map((n) => [n.id, n]));

      // Physics: gentle repulsion
      for (let i = 0; i < simNodes.length; i++) {
        const n1 = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = n1.radius + n2.radius + 40;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.18;
            if (!n1.isDragging) {
              n1.vx -= dx * force;
              n1.vy -= dy * force;
            }
            if (!n2.isDragging) {
              n2.vx += dx * force;
              n2.vy += dy * force;
            }
          }
        }
      }

      // Physics: edge attraction
      for (const edge of edges) {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (src && tgt) {
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = edge.is_primary ? 120 : 160;
          const force = (dist - targetDist) * (edge.is_primary ? 0.005 : 0.002);
          if (!src.isDragging) {
            src.vx += (dx / dist) * force;
            src.vy += (dy / dist) * force;
          }
          if (!tgt.isDragging) {
            tgt.vx -= (dx / dist) * force;
            tgt.vy -= (dy / dist) * force;
          }
        }
      }

      // Damping & soft boundary containment
      for (const n of simNodes) {
        if (!n.isDragging) {
          if (n.type === 'target') {
            n.vx += (width * 0.78 - n.x) * 0.015;
            n.vy += (height * 0.5 - n.y) * 0.015;
          } else if (n.type === 'clue') {
            n.vx += (width * 0.18 - n.x) * 0.01;
          }
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= 0.88;
          n.vy *= 0.88;
        }

        n.x = Math.max(n.radius + 15, Math.min(width - n.radius - 15, n.x));
        n.y = Math.max(n.radius + 15, Math.min(height - n.radius - 15, n.y));
      }

      const isDark = document.documentElement.classList.contains('dark');

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // --- 🌌 HIGH-FIDELITY MEDICAL LAB TEXTURED BACKGROUND ---
      // 1. Deep atmospheric radial glow
      const bgGrad = ctx.createRadialGradient(
        width * 0.55, height * 0.45, 20,
        width * 0.5, height * 0.5, width * 0.8
      );
      if (isDark) {
        bgGrad.addColorStop(0, '#162038');   // Luminous deep navy hub
        bgGrad.addColorStop(0.45, '#0d1322'); // Obsidian slate
        bgGrad.addColorStop(1, '#05070c');   // Midnight perimeter
      } else {
        bgGrad.addColorStop(0, '#ffffff');   // Pure illuminated center
        bgGrad.addColorStop(0.5, '#f1f5f9'); // Clean blueprint slate
        bgGrad.addColorStop(1, '#dfe7f2');   // Crisp outer vignette
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Blueprint Engineering Grid Lines (Fine Texture)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.07)' : 'rgba(5, 150, 105, 0.07)';
      const step = 28;
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 3. Crosshair Medical Coordinate Markers at Grid Intersections
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.20)' : 'rgba(16, 185, 129, 0.20)';
      const crossSize = 3;
      for (let x = step * 2; x < width; x += step * 3) {
        for (let y = step * 2; y < height; y += step * 3) {
          ctx.beginPath();
          ctx.moveTo(x - crossSize, y);
          ctx.lineTo(x + crossSize, y);
          ctx.moveTo(x, y - crossSize);
          ctx.lineTo(x, y + crossSize);
          ctx.stroke();
        }
      }

      // 4. Subtle Organic Noise / Micro-Particle Stipple (Cosmic Bio Texture)
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(15, 23, 42, 0.03)';
      for (let i = 0; i < 85; i++) {
        const nx = ((i * 97) % width);
        const ny = ((i * 131) % height);
        ctx.fillRect(nx, ny, 1.5, 1.5);
      }

      // 1. Draw Edges
      for (const edge of edges) {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) continue;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (edge.is_primary) {
          ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.75)' : 'rgba(5, 150, 105, 0.65)';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Slower elegant particle pulse
          const t = (stepCount * 0.0035) % 1;
          const px = src.x + (tgt.x - src.x) * t;
          const py = src.y + (tgt.y - src.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#d1fae5' : '#065f46';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = isDark ? 10 : 5;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 2. Draw Nodes with intense radiant light/glow
      for (const n of simNodes) {
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedNode?.id === n.id;
        const currentR = isHovered ? n.radius + 3 : n.radius;

        if (n.type === 'target') {
          drawNodeShape(ctx, n.x, n.y, currentR, DEFAULT_NODE_SHAPE, true);
          ctx.fillStyle = isDark ? '#10b981' : '#059669';
          ctx.shadowColor = isDark ? '#34d399' : '#059669';
          ctx.shadowBlur = isHovered ? GLOW_LEVELS.target.hover : GLOW_LEVELS.target.normal;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (n.type === 'clue') {
          drawNodeShape(ctx, n.x, n.y, currentR, DEFAULT_NODE_SHAPE, false);
          ctx.fillStyle = isDark ? '#059669' : '#047857';
          ctx.shadowColor = isDark ? '#34d399' : '#10b981';
          ctx.shadowBlur = isHovered ? GLOW_LEVELS.clue.hover : GLOW_LEVELS.clue.normal;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (n.type === 'intermediate') {
          drawNodeShape(ctx, n.x, n.y, currentR, DEFAULT_NODE_SHAPE, false);
          ctx.fillStyle = isDark ? '#14b8a6' : '#0d9488';
          ctx.shadowColor = isDark ? '#2dd4bf' : '#14b8a6';
          ctx.shadowBlur = isHovered ? GLOW_LEVELS.intermediate.hover : GLOW_LEVELS.intermediate.normal;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          // Halo Context Star
          drawNodeShape(ctx, n.x, n.y, currentR, DEFAULT_NODE_SHAPE, false);
          ctx.fillStyle = isDark ? '#cbd5e1' : '#64748b';
          ctx.shadowColor = isDark ? '#e2e8f0' : '#94a3b8';
          ctx.shadowBlur = isHovered ? GLOW_LEVELS.halo.hover : GLOW_LEVELS.halo.normal;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Selection highlight ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Legible Labels with floating badge
        if (n.is_primary || isHovered) {
          ctx.font = n.type === 'target' ? 'bold 12px Inter, sans-serif' : '600 11px Inter, sans-serif';
          ctx.textAlign = 'center';

          const maxChars = 24;
          const displayLabel = n.label.length > maxChars ? `${n.label.slice(0, maxChars)}…` : n.label;
          const metrics = ctx.measureText(displayLabel);
          const bgW = metrics.width + 10;
          const bgH = 16;
          const bgX = n.x - bgW / 2;
          const bgY = n.y + n.radius + 5;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
          ctx.fillRect(bgX, bgY, bgW, bgH);

          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.fillText(displayLabel, n.x, bgY + 12);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [edges, hoveredNode, selectedNode]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    for (const n of simNodesRef.current) {
      const dx = x - n.x;
      const dy = y - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 8) {
        n.isDragging = true;
        draggedNodeRef.current = n;
        setSelectedNode(n);
        if (onSelectNode) onSelectNode(n);
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    let found: SimNode | null = null;
    for (const n of simNodesRef.current) {
      const dx = x - n.x;
      const dy = y - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 8) {
        found = n;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.isDragging = false;
      draggedNodeRef.current = null;
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{ height: `${Math.round(420 * DEFAULT_CANVAS_HEIGHT_SCALE)}px` }}
      className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex flex-col transition-all duration-200"
    >
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full block ${hoveredNode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      />

      {/* Interactive Node Inspection Popover */}
      {(hoveredNode || selectedNode) && (
        <div className="absolute bottom-3 left-3 right-3 px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 backdrop-blur-md text-xs shadow-xl animate-in fade-in duration-150 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white truncate text-sm">
              {(hoveredNode || selectedNode)?.label}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
              Role: <strong className="text-slate-700 dark:text-slate-200">{(hoveredNode || selectedNode)?.type}</strong> • CUI: <span className="font-mono text-emerald-600 dark:text-emerald-400">{(hoveredNode || selectedNode)?.id}</span>
            </span>
          </div>

          {(hoveredNode || selectedNode)?.type === 'halo' && onAddHaloToClues && (
            <button
              type="button"
              onClick={() => onAddHaloToClues((hoveredNode || selectedNode)!.label)}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer shrink-0 transition-colors"
            >
              + Add as Clue
            </button>
          )}
        </div>
      )}
    </div>
  );
};

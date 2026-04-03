import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Animated honeycomb hexagonal grid background.
 * Renders a <canvas> that draws golden hex outlines on a dark surface,
 * with subtle glow pulses and floating highlights.
 *
 * Variants:
 *  - "hero"   → full opacity, prominent glow
 *  - "section"→ subtle, lower opacity
 *  - "page"   → very subtle, for auth pages
 *  - "app"    → minimal, for dashboard areas
 */
export type HoneycombVariant = "hero" | "section" | "page" | "app";

interface HoneycombBackgroundProps {
  variant?: HoneycombVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<HoneycombVariant, {
  lineAlpha: number;
  glowAlpha: number;
  pulseCount: number;
  hexSize: number;
}> = {
  hero:    { lineAlpha: 0.38, glowAlpha: 0.30, pulseCount: 6, hexSize: 38 },
  section: { lineAlpha: 0.22, glowAlpha: 0.18, pulseCount: 4, hexSize: 42 },
  page:    { lineAlpha: 0.30, glowAlpha: 0.22, pulseCount: 5, hexSize: 36 },
  app:     { lineAlpha: 0.14, glowAlpha: 0.10, pulseCount: 3, hexSize: 44 },
};

export function HoneycombBackground({ variant = "hero", className }: HoneycombBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = VARIANT_CONFIG[variant];
    let width = 0;
    let height = 0;

    // Pulse state — each pulse is a hex that briefly glows brighter
    interface Pulse {
      col: number;
      row: number;
      phase: number; // 0→1
      speed: number;
    }
    let pulses: Pulse[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function hexPath(cx: number, cy: number, r: number) {
      ctx!.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.closePath();
    }

    function getHexCenter(col: number, row: number, size: number): [number, number] {
      const w = size * Math.sqrt(3);
      const h = size * 2;
      const x = col * w + (row % 2 === 1 ? w / 2 : 0);
      const y = row * (h * 0.75);
      return [x, y];
    }

    function initPulses() {
      const size = config.hexSize;
      const w = size * Math.sqrt(3);
      const h = size * 2;
      const cols = Math.ceil(width / w) + 2;
      const rows = Math.ceil(height / (h * 0.75)) + 2;
      pulses = [];
      for (let i = 0; i < config.pulseCount; i++) {
        pulses.push({
          col: Math.floor(Math.random() * cols),
          row: Math.floor(Math.random() * rows),
          phase: Math.random(),
          speed: 0.003 + Math.random() * 0.005,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      const size = config.hexSize;
      const w = size * Math.sqrt(3);
      const h = size * 2;
      const cols = Math.ceil(width / w) + 2;
      const rows = Math.ceil(height / (h * 0.75)) + 2;

      // Advance pulses
      for (const p of pulses) {
        p.phase += p.speed;
        if (p.phase > 1) {
          p.phase = 0;
          p.col = Math.floor(Math.random() * cols);
          p.row = Math.floor(Math.random() * rows);
          p.speed = 0.003 + Math.random() * 0.005;
        }
      }

      // Draw hex grid
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const [cx, cy] = getHexCenter(col, row, size);

          // Check if this hex has a pulse
          let extraGlow = 0;
          for (const p of pulses) {
            if (p.col === col && p.row === row) {
              // Sine ease for glow: peak at 0.5
              extraGlow = Math.sin(p.phase * Math.PI) * 0.6;
            }
            // Neighbor glow (softer)
            const dx = Math.abs(p.col - col);
            const dy = Math.abs(p.row - row);
            if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
              extraGlow = Math.max(extraGlow, Math.sin(p.phase * Math.PI) * 0.25);
            }
          }

          const alpha = config.lineAlpha + extraGlow * config.glowAlpha * 3;

          // Glow layer (thicker, blurred)
          if (extraGlow > 0.05) {
            ctx!.save();
            ctx!.shadowColor = `rgba(245, 158, 11, ${extraGlow * 0.5})`;
            ctx!.shadowBlur = 12;
            hexPath(cx, cy, size * 0.92);
            ctx!.strokeStyle = `rgba(245, 158, 11, ${extraGlow * config.glowAlpha * 2})`;
            ctx!.lineWidth = 1.5;
            ctx!.stroke();
            ctx!.restore();
          }

          // Main hex outline
          hexPath(cx, cy, size * 0.92);
          ctx!.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
          ctx!.lineWidth = 1.1;
          ctx!.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    initPulses();
    draw();

    const handleResize = () => {
      resize();
      initPulses();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}

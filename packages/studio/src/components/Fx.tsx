/**
 * <Fx> — the minimal fx library (ARCHITECTURE §9): fade, title card, glow,
 * flash. Each fx is a timed overlay; opacity/scale are pure functions of the
 * current frame relative to the fx trigger time. Unknown fx names render
 * nothing (canonical YAML validation reports unsupported catalog references).
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../lib/interpolate";
import type { RmFx } from "../model";

function num(opts: Record<string, unknown> | undefined, key: string, dflt: number): number {
  const v = opts?.[key];
  return typeof v === "number" ? v : dflt;
}
function str(opts: Record<string, unknown> | undefined, key: string, dflt: string): string {
  const v = opts?.[key];
  return typeof v === "string" ? v : dflt;
}

export const Fx: React.FC<{ fx: RmFx }> = ({ fx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dt = t - fx.t; // seconds since the fx fired
  const dur = num(fx.opts, "over", 1);

  switch (fx.fx) {
    case "fade": {
      // Fade the screen to `color`, in over `dur`, then hold if `hold`.
      const color = str(fx.opts, "color", "#000");
      const dir = str(fx.opts, "dir", "in"); // "in" = to color, "out" = from color
      if (dt < 0) return null;
      const p = dur <= 0 ? 1 : Math.min(1, dt / dur);
      const o = dir === "out" ? 1 - p : p;
      return <AbsoluteFill style={{ background: color, opacity: o }} />;
    }
    case "flash": {
      if (dt < 0 || dt > dur) return null;
      const o = 1 - dt / dur;
      return <AbsoluteFill style={{ background: str(fx.opts, "color", "#fff"), opacity: o }} />;
    }
    case "glow": {
      if (dt < 0) return null;
      const p = dur <= 0 ? 1 : Math.min(1, dt / dur);
      const o = 0.5 * ease("io", p);
      return (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 45%, ${str(fx.opts, "color", "#ffd98a")}, transparent 60%)`,
            opacity: o,
            mixBlendMode: "screen",
          }}
        />
      );
    }
    case "title": {
      if (dt < 0) return null;
      const fadeIn = Math.min(1, dt / Math.max(0.001, num(fx.opts, "in", 0.6)));
      const life = num(fx.opts, "hold", 3);
      const fadeOut = life > 0 ? Math.min(1, Math.max(0, (dt - life) / Math.max(0.001, num(fx.opts, "out", 0.6)))) : 0;
      const o = fadeIn * (1 - fadeOut);
      if (o <= 0) return null;
      return (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
          <div
            style={{
              color: str(fx.opts, "textColor", "#f5efe0"),
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: num(fx.opts, "size", 84),
              textAlign: "center",
              textShadow: "0 2px 24px rgba(0,0,0,0.6)",
              padding: "0 8%",
            }}
          >
            {str(fx.opts, "text", "")}
          </div>
        </AbsoluteFill>
      );
    }
    case "system": {
      if (dt < 0 || dt > dur) return null;
      const p = Math.min(1, dt / 0.16);
      return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p }}>
        <div style={{ minWidth: 900, maxWidth: 1500, padding: "26px 48px", border: "12px solid #f3c64f", background: "#123d78", color: "#fff8cf", fontSize: num(fx.opts, "size", 42), fontWeight: 900, textAlign: "center", boxShadow: "14px 14px 0 #291b2b", transform: `rotate(-1deg) scale(${0.92 + p * 0.08})` }}>{str(fx.opts, "text", "系统提示")}</div>
      </AbsoluteFill>;
    }
    default:
      return null;
  }
};

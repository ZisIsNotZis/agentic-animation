/**
 * <Set> — layered background for a shot. For M0 the sets are drawn procedurally
 * (CSS gradients + a ground plane) keyed by set name, so the whole pipeline is
 * exercisable before any generated background art exists. Real backgrounds
 * (ARCHITECTURE §9: layered parallax images) drop in behind the same interface.
 */
import { AbsoluteFill } from "remotion";

interface Palette {
  top: string;
  bottom: string;
  ground?: string;
}

const SETS: Record<string, Palette> = {
  void: { top: "#0a0a12", bottom: "#05050a" },
  interior: { top: "#3a2e2a", bottom: "#1c1512", ground: "#241a15" },
  exterior: { top: "#89b7e0", bottom: "#dfeaf2", ground: "#7c8a5a" },
  sky: { top: "#2a4a80", bottom: "#8fb6dd" },
  river: { top: "#3f6d8c", bottom: "#12303f", ground: "#0d2634" },
  forest: { top: "#1e3320", bottom: "#0b160c", ground: "#12240f" },
};

export const Set: React.FC<{ name: string; opts?: Record<string, unknown> }> = ({ name, opts }) => {
  const p = SETS[name] ?? SETS.void!;
  const accent = typeof opts?.accent === "string" ? opts.accent : "#efb45d";
  const ink = "#272331";
  const stone = "#687080";
  const stoneDark = "#3e4555";
  const wood = "#70432f";
  const gold = "#e5b65b";
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ background: p.top }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "48%", bottom: 0, background: p.bottom }} />
      {name === "interior" ? (
        <>
          {/* back wall: panel rhythm, window light, and a readable office skyline */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(255,239,205,.12), transparent 30%, rgba(87,57,51,.18))" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 92, height: 10, background: "#71483b" }} />
          <div style={{ position: "absolute", left: 70, top: 145, width: 470, height: 300, border: "18px solid #6d4638", background: "#b9e7e9", boxShadow: "inset 0 0 0 10px rgba(255,255,255,.22)" }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 12, background: "#6d4638" }} />
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 12, background: "#6d4638" }} />
            <div style={{ position: "absolute", left: 20, right: 20, bottom: 24, height: 76, background: "#8db7b4", clipPath: "polygon(0 100%,0 70%,14% 42%,28% 70%,39% 30%,54% 70%,68% 18%,82% 70%,100% 38%,100% 100%)" }} />
            <div style={{ position: "absolute", left: 32, bottom: 36, width: 20, height: 76, background: "#557b7a" }} />
            <div style={{ position: "absolute", right: 66, bottom: 35, width: 24, height: 95, background: "#557b7a" }} />
          </div>
          {/* pinboard: contextual visual props for the AI engineering story */}
          <div style={{ position: "absolute", right: 90, top: 126, width: 530, height: 285, background: "#b9774d", border: `14px solid ${ink}`, boxShadow: "inset 0 0 0 10px #d69a63" }}>
            <div style={{ color: "#fff0c4", fontSize: 30, fontWeight: 900, padding: "18px 28px 10px" }}>AI 项目作战墙</div>
            <div style={{ position: "absolute", left: 28, top: 76, width: 150, height: 105, background: "#fff5dc", transform: "rotate(-3deg)", color: "#523a35", fontSize: 23, fontWeight: 800, padding: "14px 12px" }}>先复述目标<br/>再动代码</div>
            <div style={{ position: "absolute", left: 215, top: 82, width: 125, height: 94, background: "#c8e6d0", transform: "rotate(4deg)", color: "#315b4c", fontSize: 22, fontWeight: 800, padding: "14px 12px" }}>正例<br/>反例<br/>验收</div>
            <div style={{ position: "absolute", left: 386, top: 80, width: 110, height: 115, background: "#f1c85f", transform: "rotate(-2deg)", color: "#674333", fontSize: 21, fontWeight: 900, padding: "13px 10px" }}>最小权限<br/>可撤销</div>
            <div style={{ position: "absolute", left: 64, top: 205, width: 370, height: 6, background: "#684235" }} />
            <div style={{ position: "absolute", left: 98, top: 192, width: 15, height: 32, background: "#684235" }} />
            <div style={{ position: "absolute", left: 302, top: 192, width: 15, height: 32, background: "#684235" }} />
          </div>
          <div style={{ position: "absolute", right: 184, top: 452, width: 150, height: 20, background: "#75452d" }} />
          <div style={{ position: "absolute", right: 195, top: 470, width: 14, height: 110, background: "#75452d" }} />
          <div style={{ position: "absolute", right: 307, top: 470, width: 14, height: 110, background: "#75452d" }} />
          <div style={{ position: "absolute", right: 208, top: 474, width: 88, height: 62, borderRadius: 10, background: "#202936", border: "8px solid #d9e2e4" }}><div style={{ margin: 10, height: 8, background: accent }} /><div style={{ margin: 10, height: 8, background: "#6cc6cf" }} /><div style={{ margin: 10, height: 8, background: "#d95d4f" }} /></div>
          <div style={{ position: "absolute", left: 60, bottom: "22%", width: 225, height: 145, background: "#d69a63", border: "10px solid #873f32" }}><div style={{ color: "#fff0c4", fontSize: 25, fontWeight: 900, textAlign: "center", paddingTop: 22 }}>咖啡续命站</div><div style={{ color: "#873f32", fontSize: 18, fontWeight: 800, textAlign: "center", paddingTop: 10 }}>今日第 4 杯</div></div>
          <div style={{ position: "absolute", left: 35, top: 490, right: 35, height: 10, background: "#5b3a32" }} />
          <div style={{ position: "absolute", left: 600, top: 462, width: 470, height: 12, background: "#75452d" }} />
          <div style={{ position: "absolute", left: 690, top: 474, width: 14, height: 103, background: "#75452d" }} />
          <div style={{ position: "absolute", left: 982, top: 474, width: 14, height: 103, background: "#75452d" }} />
          <div style={{ position: "absolute", left: 722, top: 480, width: 210, height: 85, background: "#f2d08c", border: `10px solid #8d5039` }}><div style={{ color: "#8d5039", fontSize: 22, fontWeight: 900, textAlign: "center", paddingTop: 12 }}>Build Monitor</div><div style={{ color: "#d35b35", fontSize: 18, fontWeight: 900, textAlign: "center" }}>PASS  ·  24 tests</div></div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "22%", height: 34, background: "#a45f3e" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "22.5%", height: 8, background: "#e5b65b" }} />
        </>
      ) : null}
      {name === "cultivation" ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, background: "#261c36", borderBottom: `16px solid ${gold}` }} />
          <div style={{ position: "absolute", left: 70, top: 20, color: "#ffe8a7", fontSize: 34, fontWeight: 900, letterSpacing: 8 }}>青云宗 · 外门弟子院</div>
          {/* rear roofline and courtyard architecture; the center stays quiet for actors */}
          <div style={{ position: "absolute", left: 350, top: 112, width: 1220, height: 22, background: wood, transform: "rotate(-2deg)" }} />
          <div style={{ position: "absolute", left: 390, top: 135, width: 18, height: 210, background: stoneDark }} />
          <div style={{ position: "absolute", left: 1510, top: 135, width: 18, height: 210, background: stoneDark }} />
          <div style={{ position: "absolute", left: 420, top: 145, width: 250, height: 190, background: "#73503e", border: `12px solid ${ink}` }}>
            <div style={{ position: "absolute", left: 28, top: 30, width: 190, height: 115, background: "#d0a664", border: `8px solid ${wood}` }} />
            <div style={{ position: "absolute", left: 82, top: 45, color: "#49302d", fontSize: 34, fontWeight: 900, writingMode: "vertical-rl" }}>勤能补拙</div>
          </div>
          <div style={{ position: "absolute", left: 690, top: 145, width: 250, height: 190, background: "#73503e", border: `12px solid ${ink}` }}>
            <div style={{ position: "absolute", left: 28, top: 30, width: 190, height: 115, background: "#d0a664", border: `8px solid ${wood}` }} />
            <div style={{ position: "absolute", left: 82, top: 45, color: "#49302d", fontSize: 34, fontWeight: 900, writingMode: "vertical-rl" }}>戒骄戒躁</div>
          </div>
          <div style={{ position: "absolute", left: 1000, top: 142, width: 270, height: 185, background: "#304b65", border: `12px solid ${ink}` }}>
            <div style={{ color: "#d9f4ff", fontSize: 29, fontWeight: 900, padding: "16px 18px 8px" }}>本月修炼榜</div>
            <div style={{ color: "#f2c14e", fontSize: 24, paddingLeft: 18 }}>大师兄 · 第一</div>
            <div style={{ color: "#ff8c69", fontSize: 24, paddingLeft: 18 }}>林摆摆 · 躺平</div>
          </div>
          <div style={{ position: "absolute", right: 95, top: 135, width: 210, height: 190, background: "#b97b3e", border: `12px solid ${ink}` }}>
            <div style={{ color: "#ffe7a2", fontSize: 36, fontWeight: 900, textAlign: "center", paddingTop: 50 }}>青云宗</div>
            <div style={{ color: "#422b2c", fontSize: 22, textAlign: "center", paddingTop: 18 }}>外门 · 甲院</div>
          </div>
          {/* left weapons rack and right spirit-stone pond, away from safe actor area */}
          <div style={{ position: "absolute", left: 55, top: 365, width: 260, height: 18, background: wood, border: `6px solid ${ink}` }} />
          <div style={{ position: "absolute", left: 75, top: 382, width: 14, height: 205, background: wood }} />
          <div style={{ position: "absolute", left: 275, top: 382, width: 14, height: 205, background: wood }} />
          <div style={{ position: "absolute", left: 82, top: 330, width: 12, height: 240, background: "#bfc9d8", transform: "rotate(-18deg)" }} />
          <div style={{ position: "absolute", left: 150, top: 315, width: 12, height: 260, background: "#c6d2dc", transform: "rotate(2deg)" }} />
          <div style={{ position: "absolute", left: 220, top: 325, width: 12, height: 245, background: "#d9b45f", transform: "rotate(16deg)" }} />
          <div style={{ position: "absolute", right: 48, top: 430, width: 300, height: 145, borderRadius: "50%", background: "#426f66", border: `18px solid ${ink}` }} />
          <div style={{ position: "absolute", right: 104, top: 470, width: 90, height: 62, borderRadius: "50%", background: "#69b6bb", border: `8px solid #bcecff` }} />
          <div style={{ position: "absolute", right: 205, top: 505, width: 70, height: 52, borderRadius: "50%", background: "#d8a94e", border: `8px solid #ffe49c` }} />
          {/* flags and lanterns add a readable silhouette without gradients */}
          <div style={{ position: "absolute", left: 330, top: 165, width: 10, height: 250, background: wood }} />
          <div style={{ position: "absolute", left: 340, top: 170, width: 110, height: 72, background: accent, border: `8px solid ${ink}`, clipPath: "polygon(0 0,100% 0,78% 50%,100% 100%,0 100%)" }} />
          <div style={{ position: "absolute", right: 360, top: 165, width: 10, height: 250, background: wood }} />
          <div style={{ position: "absolute", right: 370, top: 170, width: 110, height: 72, background: "#cf5960", border: `8px solid ${ink}`, clipPath: "polygon(0 0,100% 0,78% 50%,100% 100%,0 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "22%", height: 28, background: "#855034" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "22.5%", height: 10, background: gold }} />
          {/* foreground steps are low and remain below the actors' torso */}
          <div style={{ position: "absolute", left: 280, right: 280, bottom: "13%", height: 42, background: stoneDark, borderTop: `8px solid ${stone}` }} />
          <div style={{ position: "absolute", left: 380, right: 380, bottom: "8%", height: 36, background: stone, borderTop: `8px solid ${stoneDark}` }} />
        </>
      ) : null}
      {name === "arena" ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 90, background: "#241d38", borderBottom: `14px solid ${gold}` }} />
          <div style={{ position: "absolute", left: 70, top: 20, color: "#ffe7a0", fontSize: 34, fontWeight: 900, letterSpacing: 7 }}>青云宗 · 演武场</div>
          {/* rear spectator gallery: repeated hard-edge seats create scale and place */}
          <div style={{ position: "absolute", left: 25, top: 150, width: 260, height: 480, background: stoneDark, border: `16px solid ${ink}` }} />
          <div style={{ position: "absolute", left: 52, top: 195, width: 205, height: 48, background: stone, border: `6px solid ${ink}` }} />
          <div style={{ position: "absolute", left: 52, top: 270, width: 205, height: 48, background: stone, border: `6px solid ${ink}` }} />
          <div style={{ position: "absolute", left: 52, top: 345, width: 205, height: 48, background: stone, border: `6px solid ${ink}` }} />
          <div style={{ position: "absolute", left: 52, top: 420, width: 205, height: 48, background: stone, border: `6px solid ${ink}` }} />
          <div style={{ position: "absolute", left: 76, top: 505, color: "#f5e5ba", fontSize: 30, fontWeight: 900, writingMode: "vertical-rl" }}>胜负自负</div>
          <div style={{ position: "absolute", right: 34, top: 155, width: 270, height: 430, background: "#51405f", border: `16px solid ${ink}` }} />
          <div style={{ position: "absolute", right: 70, top: 205, width: 198, height: 70, background: "#d2a850", border: `8px solid ${wood}` }}>
            <div style={{ color: "#432e35", textAlign: "center", fontSize: 30, fontWeight: 900, paddingTop: 14 }}>观战席</div>
          </div>
          <div style={{ position: "absolute", right: 75, top: 315, width: 82, height: 82, borderRadius: "50%", background: "#e0a04f", border: `10px solid ${ink}` }} />
          <div style={{ position: "absolute", right: 180, top: 335, width: 82, height: 82, borderRadius: "50%", background: "#7ab7b4", border: `10px solid ${ink}` }} />
          <div style={{ position: "absolute", right: 115, top: 440, width: 165, height: 16, background: gold, border: `5px solid ${ink}` }} />
          {/* roof and central tournament plaque stay behind heads */}
          <div style={{ position: "absolute", left: 300, top: 110, width: 1320, height: 460, border: `18px solid ${wood}`, background: "#b96d45" }} />
          <div style={{ position: "absolute", left: 370, top: 180, width: 1180, height: 320, border: `10px solid #e3a65d`, background: "#8e543d" }} />
          <div style={{ position: "absolute", left: 715, top: 125, width: 420, height: 94, background: "#d2a850", border: `12px solid ${ink}` }}>
            <div style={{ color: "#4c3030", textAlign: "center", fontSize: 44, fontWeight: 900, paddingTop: 18 }}>外门擂台</div>
          </div>
          <div style={{ position: "absolute", left: 80, top: 160, color: "#ffe8a7", fontSize: 54, fontWeight: 900, transform: "rotate(-8deg)" }}>演武场</div>
          {/* flags, weapon rack and a segmented formation circle */}
          <div style={{ position: "absolute", left: 330, top: 125, width: 10, height: 410, background: wood }} />
          <div style={{ position: "absolute", left: 340, top: 145, width: 135, height: 82, background: "#d55757", border: `8px solid ${ink}`, clipPath: "polygon(0 0,100% 0,78% 50%,100% 100%,0 100%)" }} />
          <div style={{ position: "absolute", right: 335, top: 125, width: 10, height: 410, background: wood }} />
          <div style={{ position: "absolute", right: 345, top: 145, width: 135, height: 82, background: "#5aa6a0", border: `8px solid ${ink}`, clipPath: "polygon(0 0,100% 0,78% 50%,100% 100%,0 100%)" }} />
          <div style={{ position: "absolute", left: 300, top: 640, width: 190, height: 110, background: wood, border: `12px solid ${ink}` }}>
            <div style={{ position: "absolute", left: 52, top: -62, width: 70, height: 70, borderRadius: "50%", background: "#d68c4c", border: `10px solid ${ink}` }} />
            <div style={{ color: "#f5d179", textAlign: "center", fontSize: 25, fontWeight: 900, paddingTop: 35 }}>兵器架</div>
          </div>
          <div style={{ position: "absolute", right: 340, top: 610, width: 250, height: 170, borderRadius: "50%", background: "#4f3d70", border: `18px solid ${ink}` }}>
            <div style={{ position: "absolute", left: 54, top: 35, width: 125, height: 80, borderRadius: "50%", border: `12px solid #f3d57a` }} />
            <div style={{ position: "absolute", left: 104, top: 12, width: 18, height: 135, background: "#9bdbe0" }} />
            <div style={{ position: "absolute", left: 48, top: 69, width: 140, height: 18, background: "#9bdbe0" }} />
          </div>
          {/* low steps and floor bands establish the stage plane without touching captions */}
          <div style={{ position: "absolute", left: 220, right: 220, bottom: "20%", height: 28, background: "#c88744" }} />
          <div style={{ position: "absolute", left: 300, right: 300, bottom: "14%", height: 42, background: stoneDark, borderTop: `8px solid ${stone}` }} />
          <div style={{ position: "absolute", left: 410, right: 410, bottom: "8%", height: 35, background: stone, borderTop: `8px solid ${stoneDark}` }} />
          <div style={{ position: "absolute", left: 520, top: 640, width: 880, height: 12, background: gold }} />
        </>
      ) : null}
      {name === "exterior" ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, background: "#fff4cf", borderBottom: `12px solid ${wood}` }} />
          <div style={{ position: "absolute", left: 70, top: 25, color: ink, fontSize: 36, fontWeight: 900 }}>园区 · A座研发楼</div>
          <div style={{ position: "absolute", left: 90, top: 205, width: 174, height: 285, background: "#d8e4e2", border: `14px solid ${ink}` }}>
            <div style={{ width: 94, height: 62, margin: 28, background: "#79aaa8", border: `8px solid ${wood}` }} /><div style={{ width: 94, height: 62, margin: 28, background: "#79aaa8", border: `8px solid ${wood}` }} />
          </div>
          <div style={{ position: "absolute", left: 290, top: 270, width: 920, height: 220, background: "#efe5d0", border: `16px solid ${ink}` }}>
            <div style={{ position: "absolute", left: 42, top: 40, width: 820, height: 26, background: wood }} /><div style={{ position: "absolute", left: 42, top: 86, width: 820, height: 26, background: "#d49b53" }} />
            <div style={{ position: "absolute", left: 42, top: 132, width: 600, height: 26, background: wood }} />
          </div>
          <div style={{ position: "absolute", right: 130, top: 175, width: 240, height: 215, background: "#b9774d", border: `14px solid ${ink}` }}><div style={{ color: "#fff0c4", fontSize: 30, fontWeight: 900, textAlign: "center", paddingTop: 45 }}>交付大厅</div><div style={{ color: "#4b3431", fontSize: 22, textAlign: "center", paddingTop: 22 }}>人定规则 · AI执行</div></div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "22%", height: 30, background: wood }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "22.5%", height: 8, background: gold }} />
          <div style={{ position: "absolute", left: 280, bottom: "22%", width: 240, height: 180, background: "#6d9b68", border: `12px solid ${ink}`, borderRadius: "50% 50% 12px 12px" }} />
          <div style={{ position: "absolute", right: 480, bottom: "22%", width: 240, height: 180, background: "#6d9b68", border: `12px solid ${ink}`, borderRadius: "50% 50% 12px 12px" }} />
        </>
      ) : null}
      {p.ground ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", background: p.ground }} />
      ) : null}
    </AbsoluteFill>
  );
};

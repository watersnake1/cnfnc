import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { type Address } from "viem";
import { ProverFlow }          from "./components/ProverFlow";
import { VerifierFlow }        from "./components/VerifierFlow";
import { ExploreFlow }         from "./components/ExploreFlow";
import { CreateVerifierFlow }  from "./components/CreateVerifierFlow";

type Tab = "prove" | "explore" | "create" | "verify";

function Balloon({
  color, size = 40, delay = "0s",
  style,
}: {
  color: string; size?: number; delay?: string;
  style?: React.CSSProperties;
}) {
  const w = size * 0.68;
  const h = size;
  const cx = w / 2;
  return (
    <svg
      width={w}
      height={h + 14}
      viewBox={`0 0 ${w} ${h + 14}`}
      style={style}
    >
      <ellipse cx={cx} cy={h * 0.46} rx={cx - 1} ry={h * 0.46} fill={color} />
      <ellipse cx={cx * 0.55} cy={h * 0.24} rx={cx * 0.28} ry={h * 0.16} fill="white" opacity={0.32} />
      <path
        d={`M${cx - 2.5} ${h * 0.93} Q${cx} ${h + 1} ${cx + 2.5} ${h * 0.93}`}
        stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"
      />
      <path
        d={`M${cx} ${h + 1} Q${cx + 5} ${h + 7} ${cx} ${h + 14}`}
        stroke="#c9c3bc" strokeWidth="1" fill="none"
      />
    </svg>
  );
}

// Each background balloon: position, color, size, animation
const BG_BALLOONS: Array<{
  left: string; bottom: string; color: string; size: number;
  duration: string; delay: string; sway: string;
}> = [
  { left:  "3%",  bottom: "8%",  color: "#dc2626", size: 54, duration: "7s",   delay: "0s",    sway: "bgBalloon1" },
  { left:  "9%",  bottom: "22%", color: "#fca5a5", size: 38, duration: "9s",   delay: "1.4s",  sway: "bgBalloon2" },
  { left:  "18%", bottom: "5%",  color: "#f87171", size: 46, duration: "8.5s", delay: "0.7s",  sway: "bgBalloon1" },
  { left:  "28%", bottom: "15%", color: "#fecdd3", size: 34, duration: "11s",  delay: "2.1s",  sway: "bgBalloon3" },
  { left:  "38%", bottom: "3%",  color: "#dc2626", size: 42, duration: "7.5s", delay: "3.3s",  sway: "bgBalloon2" },
  { left:  "50%", bottom: "18%", color: "#fb923c", size: 50, duration: "10s",  delay: "0.3s",  sway: "bgBalloon1" },
  { left:  "60%", bottom: "7%",  color: "#fca5a5", size: 36, duration: "8s",   delay: "1.8s",  sway: "bgBalloon3" },
  { left:  "70%", bottom: "25%", color: "#f43f5e", size: 58, duration: "9.5s", delay: "0.9s",  sway: "bgBalloon2" },
  { left:  "79%", bottom: "4%",  color: "#fda4af", size: 40, duration: "7s",   delay: "2.6s",  sway: "bgBalloon1" },
  { left:  "87%", bottom: "14%", color: "#dc2626", size: 44, duration: "11.5s",delay: "1.1s",  sway: "bgBalloon3" },
  { left:  "94%", bottom: "9%",  color: "#fb7185", size: 32, duration: "8s",   delay: "4.0s",  sway: "bgBalloon2" },
  { left:  "13%", bottom: "40%", color: "#fecdd3", size: 30, duration: "12s",  delay: "5.5s",  sway: "bgBalloon1" },
  { left:  "55%", bottom: "45%", color: "#f87171", size: 28, duration: "10.5s",delay: "3.8s",  sway: "bgBalloon3" },
  { left:  "83%", bottom: "38%", color: "#fca5a5", size: 36, duration: "9s",   delay: "6.2s",  sway: "bgBalloon2" },
];

const TAB_LABELS: Record<Tab, string> = {
  prove:   "🎈 Prove Ownership",
  explore: "Explore",
  create:  "Create Verifier",
  verify:  "Verify Claim",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("prove");
  const [selectedCollection, setSelectedCollection] = useState<Address | undefined>();

  const handleSelectCollection = (collection: Address) => {
    setSelectedCollection(collection);
    setTab("prove");
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t !== "prove") setSelectedCollection(undefined);
  };

  return (
    <>
      <style>{`
        @keyframes floatBalloon {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes bgBalloon1 {
          0%   { transform: translateY(0px)   rotate(-3deg); }
          30%  { transform: translateY(-18px) rotate(2deg);  }
          60%  { transform: translateY(-8px)  rotate(-1deg); }
          100% { transform: translateY(-22px) rotate(3deg);  }
        }
        @keyframes bgBalloon2 {
          0%   { transform: translateY(0px)   rotate(2deg);  }
          40%  { transform: translateY(-14px) rotate(-3deg); }
          70%  { transform: translateY(-6px)  rotate(1deg);  }
          100% { transform: translateY(-20px) rotate(-2deg); }
        }
        @keyframes bgBalloon3 {
          0%   { transform: translateY(0px)   rotate(-1deg); }
          25%  { transform: translateY(-20px) rotate(3deg);  }
          55%  { transform: translateY(-10px) rotate(-2deg); }
          100% { transform: translateY(-16px) rotate(2deg);  }
        }
      `}</style>

      <div style={styles.root}>
        {/* ── Background balloons ─────────────────────────────────────── */}
        <div style={styles.bgLayer} aria-hidden>
          {BG_BALLOONS.map((b, i) => (
            <Balloon
              key={i}
              color={b.color}
              size={b.size}
              style={{
                position: "absolute",
                left: b.left,
                bottom: b.bottom,
                animation: `${b.sway} ${b.duration} ease-in-out infinite alternate`,
                animationDelay: b.delay,
                opacity: 0.55,
                filter: "blur(0.4px)",
              }}
            />
          ))}
        </div>

        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={styles.balloons}>
                <Balloon color="#dc2626" size={38} style={{ animation: "floatBalloon 3s ease-in-out infinite", animationDelay: "0s" }} />
                <Balloon color="#fca5a5" size={30} style={{ animation: "floatBalloon 3s ease-in-out infinite", animationDelay: "0.6s" }} />
                <Balloon color="#ef4444" size={34} style={{ animation: "floatBalloon 3s ease-in-out infinite", animationDelay: "1.2s" }} />
              </div>
              <div>
                <h1 style={styles.title}>CNFNC</h1>
                <p style={styles.tagline}>ZK NFT Ownership Prover</p>
              </div>
            </div>
            <ConnectButton />
          </div>
          <nav style={styles.nav}>
            {(["prove", "explore", "create", "verify"] as Tab[]).map(t => (
              <button
                key={t}
                style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}
                onClick={() => handleTabChange(t)}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </header>

        <main style={styles.main}>
          <div style={{ display: tab === "prove"   ? "block" : "none" }}>
            <ProverFlow key={selectedCollection ?? "default"} initialCollection={selectedCollection} />
          </div>
          <div style={{ display: tab === "explore" ? "block" : "none" }}>
            <ExploreFlow onSelectCollection={handleSelectCollection} />
          </div>
          <div style={{ display: tab === "create"  ? "block" : "none" }}>
            <CreateVerifierFlow onDeployed={() => setTab("explore")} />
          </div>
          <div style={{ display: tab === "verify"  ? "block" : "none" }}><VerifierFlow /></div>

          <section style={styles.about}>
            <h3 style={styles.aboutHeading}>What does NFNC do?</h3>
            <p style={styles.aboutText}>
              A user wants to prove that they own an NFT of collection C in one of their wallets.
              But they do not want others to know what this wallet is, or which of the collection
              they own. This user only wants to prove membership in the set of all C NFTs. To do
              this, they use this tool to generate a zk proof in-browser that attests to their
              membership in this collection C. Then, a new badge NFT is minted to a different
              public wallet the user controls, which can then be used to prove they indeed own
              the NFT.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}

const styles = {
  root:        { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f4f3f1", position: "relative", overflow: "hidden" } as React.CSSProperties,
  bgLayer:     { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 } as React.CSSProperties,
  header:      { background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", borderBottom: "1px solid #e8e4e0", padding: "0 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative", zIndex: 10 } as React.CSSProperties,
  headerInner: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" } as React.CSSProperties,
  balloons:    { display: "flex", alignItems: "flex-end", gap: 4 } as React.CSSProperties,
  title:       { fontSize: 22, fontWeight: 800, margin: 0, color: "#111827", letterSpacing: "-0.5px" } as React.CSSProperties,
  tagline:     { fontSize: 12, color: "#9ca3af", margin: "2px 0 0" } as React.CSSProperties,
  nav:         { display: "flex", gap: 4 } as React.CSSProperties,
  tabBtn:      { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, fontWeight: 500, padding: "10px 16px", borderBottom: "2px solid transparent" } as React.CSSProperties,
  tabActive:   { color: "#dc2626", borderBottomColor: "#dc2626" } as React.CSSProperties,
  main:        { flex: 1, position: "relative", zIndex: 1 } as React.CSSProperties,
  about:       { maxWidth: 600, margin: "48px auto 64px", padding: "0 24px", textAlign: "center" } as React.CSSProperties,
  aboutHeading:{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 } as React.CSSProperties,
  aboutText:   { fontSize: 14, color: "#6b7280", lineHeight: 1.8, margin: 0 } as React.CSSProperties,
} satisfies Record<string, React.CSSProperties>;

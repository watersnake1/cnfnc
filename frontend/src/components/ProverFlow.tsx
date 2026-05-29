import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { isAddress, type Address } from "viem";
import { useNFTCheck } from "../hooks/useNFTCheck";
import { useProver } from "../hooks/useProver";
import { useCollectionInfo, useCollectionToProver } from "../hooks/useFactory";

interface Props {
  /** Pre-selected collection coming from the Explore tab. */
  initialCollection?: Address;
}

const steps = [
  "Select Collection",
  "Connect Wallet A",
  "Verify NFT & Generate Proof",
  "Connect Wallet B & Mint",
];

export function ProverFlow({ initialCollection }: Props) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [collectionInput, setCollectionInput] = useState(initialCollection ?? "");
  const [collection, setCollection] = useState<Address | undefined>(initialCollection);
  const [walletBInput, setWalletBInput] = useState("");
  const [proofReadyForWalletB, setProofReadyForWalletB] = useState(false);

  // Resolve the prover address from the factory for the selected collection
  const { data: proverAddress } = useCollectionToProver(collection);
  const { name: collectionName, symbol: collectionSymbol } = useCollectionInfo(collection);
  const { hasNFT, isLoading: nftLoading } = useNFTCheck(address, collection);
  const { step, error, proof, tokenId, txHash, generateAndStoreProof, mintBadge, cancelMint, reset } =
    useProver(proverAddress as Address | undefined);

  const validProver = proverAddress && proverAddress !== "0x0000000000000000000000000000000000000000";

  const phase = (() => {
    if (!collection)                             return "select-collection";
    if (collection && !validProver)              return "no-prover";
    if (step === "ready" && proofReadyForWalletB) return "connect-b";
    if (step === "generating")                   return "generating";
    if (step === "confirming")                   return "confirming";
    if (step === "mining")                       return "mining";
    if (step === "done")                         return "done";
    if (step === "error")                        return "error";
    if (!isConnected)                            return "connect-a";
    if (step === "ready")                        return "proof-generated";
    if (!hasNFT && !nftLoading)                  return "no-nft";
    if (hasNFT)                                  return "ready-to-prove";
    return "connect-a";
  })();

  const activeStep = phase === "select-collection" || phase === "no-prover" ? 0
    : phase === "connect-a" || phase === "no-nft" ? 1
    : ["ready-to-prove", "generating"].includes(phase) ? 2
    : ["proof-generated", "connect-b", "confirming", "mining"].includes(phase) ? 3
    : phase === "done" ? 4 : -1;

  const handleConfirmCollection = () => {
    if (isAddress(collectionInput)) setCollection(collectionInput as Address);
  };

  const handleGenerateProof = async () => {
    if (!isAddress(walletBInput) || !collection) return;
    await generateAndStoreProof(walletBInput as Address, collection);
  };

  const handleDisconnectAndSwitchToB = () => {
    disconnect();
    setProofReadyForWalletB(true);
  };

  const handleReset = () => {
    reset();
    setProofReadyForWalletB(false);
    if (!initialCollection) {
      setCollection(undefined);
      setCollectionInput("");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Prove NFT Ownership</h2>
      <p style={styles.sub}>
        Generate a ZK proof that you own an NFT in a collection — without revealing your wallet.
      </p>

      <StepTracker active={activeStep} steps={steps} />

      {/* ── Step 0: Select Collection ─────────────────────────────── */}
      {phase === "select-collection" && (
        <Section>
          <label style={styles.label}>
            NFT Collection contract address:
            <div style={styles.inputRow}>
              <input
                style={styles.input}
                placeholder="0x…"
                value={collectionInput}
                onChange={e => setCollectionInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConfirmCollection()}
              />
              <button
                style={{ ...styles.btn, opacity: isAddress(collectionInput) ? 1 : 0.5 }}
                disabled={!isAddress(collectionInput)}
                onClick={handleConfirmCollection}
              >
                Continue
              </button>
            </div>
          </label>
          <p style={styles.hint}>
            You can find active collections on the Explore tab.
          </p>
        </Section>
      )}

      {/* ── No prover deployed for this collection ────────────────── */}
      {phase === "no-prover" && (
        <Section>
          <Status ok={false}>
            No verifier has been deployed for{" "}
            <code style={styles.code}>{collection}</code>.
          </Status>
          <p style={styles.hint}>
            Go to the Create Verifier tab to deploy one, or pick a collection from Explore.
          </p>
          <button style={styles.btnSecondary} onClick={() => { setCollection(undefined); setCollectionInput(""); }}>
            Change Collection
          </button>
        </Section>
      )}

      {/* ── Step 1: Connect Wallet A ──────────────────────────────── */}
      {phase === "connect-a" && (
        <Section>
          <CollectionBadge name={collectionName} symbol={collectionSymbol} address={collection} />
          <p style={styles.bodyText}>
            Connect the wallet that holds your NFT (Wallet A). This wallet stays private.
          </p>
          <ConnectButton />
        </Section>
      )}

      {/* ── No NFT ───────────────────────────────────────────────── */}
      {phase === "no-nft" && (
        <Section>
          <Status ok={false}>
            {address} does not own an NFT in this collection.
          </Status>
          <button style={styles.btnSecondary} onClick={() => disconnect()}>
            Try a different wallet
          </button>
        </Section>
      )}

      {/* ── Step 2+3: NFT found → enter Wallet B → generate proof ── */}
      {(phase === "ready-to-prove" || phase === "generating") && (
        <Section>
          <CollectionBadge name={collectionName} symbol={collectionSymbol} address={collection} />
          <Status ok={true}>Wallet {address} owns ≥1 NFT in this collection.</Status>
          <label style={styles.label}>
            Wallet B — the public wallet that will receive the badge NFT:
            <input
              style={styles.input}
              placeholder="0x…"
              value={walletBInput}
              onChange={e => setWalletBInput(e.target.value)}
            />
          </label>
          <button
            style={{ ...styles.btn, opacity: !isAddress(walletBInput) || phase === "generating" ? 0.6 : 1 }}
            disabled={!isAddress(walletBInput) || phase === "generating"}
            onClick={handleGenerateProof}
          >
            {phase === "generating" ? "Generating proof…" : "Generate ZK Proof"}
          </button>
          {phase === "generating" && (
            <p style={styles.hint}>Computing Groth16 proof in browser — this may take 15–60s…</p>
          )}
        </Section>
      )}

      {/* ── Proof generated — disconnect A ────────────────────────── */}
      {phase === "proof-generated" && (
        <Section>
          <Status ok={true}>Proof generated successfully. 🎈</Status>
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", color: "#9ca3af", fontSize: 13 }}>View proof data</summary>
            <pre style={styles.pre}>{JSON.stringify(proof, (_, v) => typeof v === "bigint" ? v.toString() : v, 2)}</pre>
          </details>
          <p style={styles.bodyText}>
            Now disconnect Wallet A, then connect Wallet B to mint the badge.
          </p>
          <button style={styles.btn} onClick={handleDisconnectAndSwitchToB}>
            Disconnect Wallet A
          </button>
        </Section>
      )}

      {/* ── Connect B + mint ──────────────────────────────────────── */}
      {phase === "connect-b" && (
        <Section>
          <p style={styles.bodyText}>
            Connect Wallet B (<code style={styles.code}>{walletBInput}</code>) to receive the badge.
          </p>
          {!isConnected ? (
            <ConnectButton />
          ) : (
            <>
              <Status ok={true}>Wallet B connected: {address}</Status>
              <button
                style={{ ...styles.btn, opacity: address?.toLowerCase() !== walletBInput.toLowerCase() ? 0.5 : 1 }}
                disabled={address?.toLowerCase() !== walletBInput.toLowerCase()}
                onClick={() => collection && mintBadge(collection)}
              >
                Mint Badge NFT
              </button>
              {address?.toLowerCase() !== walletBInput.toLowerCase() && (
                <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>
                  Connected wallet does not match Wallet B. Please switch accounts.
                </p>
              )}
            </>
          )}
        </Section>
      )}

      {/* ── Confirming ────────────────────────────────────────────── */}
      {phase === "confirming" && (
        <Section>
          <p style={styles.bodyText}>Check your wallet — a transaction confirmation should be open.</p>
          <p style={styles.hint}>Approve the transaction to submit the proof on-chain.</p>
          <button style={styles.btnSecondary} onClick={cancelMint}>Cancel</button>
        </Section>
      )}

      {/* ── Mining ────────────────────────────────────────────────── */}
      {phase === "mining" && (
        <Section>
          <p style={styles.bodyText}>Transaction submitted. Waiting for on-chain confirmation…</p>
          {txHash && <p style={{ ...styles.hint, fontFamily: "monospace", wordBreak: "break-all" }}>TX: {txHash}</p>}
        </Section>
      )}

      {/* ── Done ─────────────────────────────────────────────────── */}
      {phase === "done" && (
        <Section>
          <Status ok={true}>Badge NFT minted! 🎈 Token ID: {tokenId?.toString() ?? "0"}</Status>
          <p style={styles.hint}>Anyone can now verify your claim on the Verify tab.</p>
          <button style={styles.btnSecondary} onClick={handleReset}>Start over</button>
        </Section>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {phase === "error" && (
        <Section>
          <Status ok={false}>Error: {error}</Status>
          <button style={styles.btnSecondary} onClick={handleReset}>Retry</button>
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <div style={styles.section}>{children}</div>;
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      ...styles.status,
      background:  ok ? "#f0fdf4" : "#fff1f2",
      borderColor: ok ? "#bbf7d0" : "#fecdd3",
      color:       ok ? "#15803d" : "#be123c",
    }}>
      <span style={{ marginRight: 8, fontSize: 16 }}>{ok ? "✓" : "✗"}</span>
      {children}
    </div>
  );
}

function CollectionBadge({ name, symbol, address }: { name?: string; symbol?: string; address?: string }) {
  if (!address) return null;
  return (
    <div style={styles.collectionBadge}>
      <span style={{ fontWeight: 700 }}>{symbol ?? "?"}</span>
      <span style={{ color: "#374151" }}>{name ?? address}</span>
    </div>
  );
}

function StepTracker({ active, steps }: { active: number; steps: string[] }) {
  return (
    <div style={styles.stepper}>
      {steps.map((label, i) => {
        const done    = i < active;
        const current = i === active;
        return (
          <div key={i} style={{ ...styles.stepItem, opacity: i <= active ? 1 : 0.4 }}>
            <div style={{
              ...styles.stepDot,
              background: done || current ? "#dc2626" : "#e5e7eb",
              color:      done || current ? "#fff"    : "#9ca3af",
              boxShadow:  current ? "0 0 0 3px #fecaca" : "none",
            }}>
              {done ? "🎈" : i + 1}
            </div>
            <span style={{ fontSize: 12, color: i <= active ? "#374151" : "#9ca3af", fontWeight: current ? 600 : 400 }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:      { maxWidth: 640, margin: "0 auto", padding: "32px 16px" },
  heading:        { fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#111827" },
  sub:            { color: "#6b7280", marginBottom: 24, fontSize: 14 },
  section:        { background: "#ffffff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 24, marginTop: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  status:         { border: "1px solid", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", fontWeight: 500, fontSize: 14 },
  collectionBadge:{ display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 14 },
  bodyText:       { color: "#374151", fontSize: 14, marginBottom: 16, lineHeight: 1.6 },
  hint:           { color: "#9ca3af", fontSize: 13, marginTop: 10, lineHeight: 1.5 },
  label:          { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, fontSize: 14, color: "#374151", fontWeight: 500 },
  inputRow:       { display: "flex", gap: 8 },
  input:          { flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", color: "#111827", fontSize: 14, outline: "none" },
  code:           { background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "2px 6px", borderRadius: 4, fontSize: 12, color: "#374151" },
  btn:            { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  btnSecondary:   { background: "#fff", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 8, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
  pre:            { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, fontSize: 11, overflowX: "auto", color: "#6b7280", maxHeight: 200 },
  stepper:        { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8, padding: "16px 0 4px" },
  stepItem:       { display: "flex", alignItems: "center", gap: 8, flex: "1 1 140px" },
  stepDot:        { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.2s" },
};

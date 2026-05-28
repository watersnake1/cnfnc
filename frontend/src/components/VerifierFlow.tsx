import { useState } from "react";
import { useReadContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { NFTProverABI } from "../abis/NFTProver";
import deployments from "../deployments.json";

export function VerifierFlow() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<Address | null>(null);

  const { data: hasBadge, isLoading, error, refetch } = useReadContract({
    address:      deployments.nftProver as Address,
    abi:          NFTProverABI,
    functionName: "hasBadge",
    args:         query ? [query] : undefined,
    query:        { enabled: !!query },
  });

  const handleVerify = () => {
    if (!isAddress(input)) return;
    const addr = input as Address;
    if (query === addr) {
      // Same address clicked again — force a fresh RPC call, don't rely on cache
      void refetch();
    } else {
      setQuery(addr);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Verify a Claim</h2>
      <p style={styles.sub}>
        Enter a Wallet B address to check whether its owner proved NFT ownership via a ZK proof.
      </p>

      <div style={styles.card}>
        <label style={styles.label}>
          Wallet B address:
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              placeholder="0x..."
              value={input}
              onChange={e => { setInput(e.target.value); setQuery(null); }}
              onKeyDown={handleKeyDown}
            />
            <button
              style={{ ...styles.btn, opacity: isAddress(input) ? 1 : 0.5 }}
              disabled={!isAddress(input) || isLoading}
              onClick={handleVerify}
            >
              {isLoading ? "Checking…" : "Verify"}
            </button>
          </div>
        </label>

        {query && !isLoading && !error && hasBadge !== undefined && (
          <div style={{
            ...styles.result,
            background:  hasBadge ? "#f0fdf4" : "#fff1f2",
            borderColor: hasBadge ? "#bbf7d0" : "#fecdd3",
          }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>
              {hasBadge ? "🎈" : "✗"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: hasBadge ? "#15803d" : "#be123c" }}>
                {hasBadge ? "Valid Proof" : "No Proof Found"}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>
                {hasBadge
                  ? `${query} holds a soulbound badge NFT confirming proven ownership of an NFT in Collection X.`
                  : `${query} has no badge — either they haven't proved ownership yet, or the address is incorrect.`}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.errorMsg}>
            Error: {error.message}
          </div>
        )}
      </div>

      <div style={styles.explainer}>
        <div style={styles.explainerTitle}>How it works</div>
        <p style={styles.explainerText}>
          The smart contract checks whether this address holds a soulbound badge NFT. Badges are
          only minted after a valid Groth16 ZK proof is verified on-chain — proving the owner is
          a member of the NFT-holder set without ever revealing their private wallet address.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container:     { maxWidth: 640, margin: "0 auto", padding: "32px 16px" } as React.CSSProperties,
  heading:       { fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#111827" } as React.CSSProperties,
  sub:           { color: "#6b7280", marginBottom: 24, fontSize: 14 } as React.CSSProperties,
  card:          { background: "#ffffff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" } as React.CSSProperties,
  label:         { display: "flex", flexDirection: "column" as const, gap: 10, fontSize: 14, color: "#374151", fontWeight: 500 },
  inputRow:      { display: "flex", gap: 8 } as React.CSSProperties,
  input:         { flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", color: "#111827", fontSize: 14, outline: "none" } as React.CSSProperties,
  btn:           { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" } as React.CSSProperties,
  result:        { display: "flex", alignItems: "center", gap: 16, marginTop: 20, border: "1px solid", borderRadius: 10, padding: "16px 20px" } as React.CSSProperties,
  errorMsg:      { color: "#dc2626", marginTop: 12, fontSize: 13 } as React.CSSProperties,
  explainer:     { marginTop: 24, background: "#ffffff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 20 } as React.CSSProperties,
  explainerTitle:{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 8 } as React.CSSProperties,
  explainerText: { color: "#6b7280", fontSize: 13, lineHeight: 1.7, margin: 0 } as React.CSSProperties,
} satisfies Record<string, React.CSSProperties>;

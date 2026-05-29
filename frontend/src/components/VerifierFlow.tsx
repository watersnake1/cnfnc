import { useState } from "react";
import { useReadContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { NFTProverABI } from "../abis/NFTProver";
import { useCollectionToProver, useDeployments, useCollectionInfo, type FactoryDeployment } from "../hooks/useFactory";

export function VerifierFlow() {
  const [collectionInput, setCollectionInput] = useState("");
  const [collection, setCollection] = useState<Address | null>(null);
  const [walletInput, setWalletInput] = useState("");
  const [query, setQuery] = useState<Address | null>(null);

  const { data: deployments } = useDeployments();
  const { data: proverAddress } = useCollectionToProver(collection ?? undefined);
  const validProver = proverAddress && proverAddress !== "0x0000000000000000000000000000000000000000";

  const { data: hasBadge, isLoading, error, refetch } = useReadContract({
    address:      validProver ? (proverAddress as Address) : undefined,
    abi:          NFTProverABI,
    functionName: "hasBadge",
    args:         query ? [query] : undefined,
    query:        { enabled: !!query && !!validProver },
  });

  const handleVerify = () => {
    if (!isAddress(walletInput)) return;
    const addr = walletInput as Address;
    if (query === addr) { void refetch(); } else { setQuery(addr); }
  };

  const selectCollection = (addr: Address) => {
    setCollection(addr);
    setCollectionInput(addr);
    setQuery(null);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Verify a Claim</h2>
      <p style={styles.sub}>Check whether a wallet holds a badge for a given collection.</p>

      <div style={styles.card}>
        <label style={styles.label}>
          NFT collection:
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="0x… or pick below"
              value={collectionInput}
              onChange={e => { setCollectionInput(e.target.value); setCollection(null); setQuery(null); }}
            />
            <button
              style={{ ...styles.btn, background: "#6b7280", opacity: isAddress(collectionInput) ? 1 : 0.5 }}
              disabled={!isAddress(collectionInput)}
              onClick={() => isAddress(collectionInput) && setCollection(collectionInput as Address)}
            >
              Set
            </button>
          </div>
        </label>

        {(deployments as FactoryDeployment[] | undefined)?.length && !collection && (
          <div style={styles.quickPick}>
            <div style={styles.quickPickLabel}>Quick pick:</div>
            <div style={styles.quickPickRow}>
              {(deployments as FactoryDeployment[]).map(d => (
                <QuickPickChip key={d.nftCollection} address={d.nftCollection} onSelect={selectCollection} />
              ))}
            </div>
          </div>
        )}

        {collection && !validProver && (
          <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>
            No verifier deployed for this collection.
          </p>
        )}

        {validProver && (
          <label style={{ ...styles.label, marginTop: 16 }}>
            Wallet B address:
            <div style={styles.row}>
              <input
                style={styles.input}
                placeholder="0x…"
                value={walletInput}
                onChange={e => { setWalletInput(e.target.value); setQuery(null); }}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
              />
              <button
                style={{ ...styles.btn, opacity: isAddress(walletInput) ? 1 : 0.5 }}
                disabled={!isAddress(walletInput) || isLoading}
                onClick={handleVerify}
              >
                {isLoading ? "Checking…" : "Verify"}
              </button>
            </div>
          </label>
        )}

        {query && !isLoading && !error && hasBadge !== undefined && (
          <div style={{
            ...styles.result,
            background:  hasBadge ? "#f0fdf4" : "#fff1f2",
            borderColor: hasBadge ? "#bbf7d0" : "#fecdd3",
          }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>{hasBadge ? "🎈" : "✗"}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: hasBadge ? "#15803d" : "#be123c" }}>
                {hasBadge ? "Valid Proof" : "No Proof Found"}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>
                {hasBadge
                  ? `${query} holds a badge confirming proven membership in this collection.`
                  : `${query} has no badge for this collection.`}
              </div>
            </div>
          </div>
        )}

        {error && <div style={styles.errorMsg}>Error: {error.message}</div>}
      </div>

      <div style={styles.explainer}>
        <div style={styles.explainerTitle}>How it works</div>
        <p style={styles.explainerText}>
          The contract checks whether this address holds a soulbound badge NFT. Badges are minted
          only after a valid Groth16 ZK proof is verified on-chain — proving the owner is a member
          of the collection's holder set without revealing their private wallet.
        </p>
      </div>
    </div>
  );
}

function QuickPickChip({ address, onSelect }: { address: Address; onSelect: (a: Address) => void }) {
  const { symbol } = useCollectionInfo(address);
  return (
    <button style={styles.chip} onClick={() => onSelect(address)}>
      {symbol ?? address.slice(0, 8)}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:      { maxWidth: 640, margin: "0 auto", padding: "32px 16px" },
  heading:        { fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#111827" },
  sub:            { color: "#6b7280", marginBottom: 24, fontSize: 14 },
  card:           { background: "#ffffff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  label:          { display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "#374151", fontWeight: 500 },
  row:            { display: "flex", gap: 8 },
  input:          { flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", color: "#111827", fontSize: 14, outline: "none" },
  btn:            { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  quickPick:      { marginTop: 12 },
  quickPickLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  quickPickRow:   { display: "flex", flexWrap: "wrap", gap: 8 },
  chip:           { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 12px", fontSize: 13, cursor: "pointer", color: "#374151", fontWeight: 600 },
  result:         { display: "flex", alignItems: "center", gap: 16, marginTop: 20, border: "1px solid", borderRadius: 10, padding: "16px 20px" },
  errorMsg:       { color: "#dc2626", marginTop: 12, fontSize: 13 },
  explainer:      { marginTop: 24, background: "#ffffff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 20 },
  explainerTitle: { fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 8 },
  explainerText:  { color: "#6b7280", fontSize: 13, lineHeight: 1.7, margin: 0 },
};

import { useState } from "react";
import { useAccount } from "wagmi";
import { isAddress, type Address } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCollectionInfo, useDeployProver } from "../hooks/useFactory";

interface Props {
  onDeployed: () => void;
}

export function CreateVerifierFlow({ onDeployed }: Props) {
  const { isConnected } = useAccount();
  const [input, setInput]     = useState("");
  const [collection, setCollection] = useState<Address | undefined>();

  const { name, symbol, isERC721 } = useCollectionInfo(collection);
  const { deploy, isPending, error } = useDeployProver();

  const handleCheck = () => {
    if (isAddress(input)) setCollection(input as Address);
  };

  const handleDeploy = async () => {
    if (!collection) return;
    const result = await deploy(collection);
    if (result) {
      setInput("");
      setCollection(undefined);
      onDeployed();
    }
  };

  const validERC721 = isERC721 === true;
  const checkedInvalid = collection && isERC721 === false;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Create Verifier</h2>
      <p style={styles.sub}>
        Deploy a ZK prover + soulbound badge contract for any ERC-721 collection.
        Anyone can create a verifier — it's permissionless.
      </p>

      <div style={styles.card}>
        <label style={styles.label}>
          NFT collection contract address:
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="0x…"
              value={input}
              onChange={e => { setInput(e.target.value); setCollection(undefined); }}
              onKeyDown={e => e.key === "Enter" && handleCheck()}
            />
            <button
              style={{ ...styles.btn, opacity: isAddress(input) ? 1 : 0.5 }}
              disabled={!isAddress(input)}
              onClick={handleCheck}
            >
              Check
            </button>
          </div>
        </label>

        {collection && isERC721 === undefined && (
          <p style={styles.hint}>Checking contract…</p>
        )}

        {validERC721 && (
          <div style={styles.result}>
            <div style={styles.resultBadge}>ERC-721 ✓</div>
            <div>
              <div style={styles.collectionName}>{name ?? "Unknown"} ({symbol ?? "?"})</div>
              <div style={styles.collectionAddr}>{collection}</div>
            </div>
          </div>
        )}

        {checkedInvalid && (
          <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>
            This address does not implement ERC-721.
          </p>
        )}

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        {validERC721 && (
          isConnected ? (
            <button
              style={{ ...styles.deployBtn, opacity: isPending ? 0.6 : 1 }}
              disabled={isPending}
              onClick={handleDeploy}
            >
              {isPending ? "Deploying…" : "Deploy Verifier"}
            </button>
          ) : (
            <div style={{ marginTop: 20 }}>
              <p style={styles.hint}>Connect a wallet to deploy.</p>
              <ConnectButton />
            </div>
          )
        )}
      </div>

      <div style={styles.explainer}>
        <div style={styles.explainerTitle}>What gets deployed?</div>
        <p style={styles.explainerText}>
          Two contracts are deployed: a <strong>BadgeNFT</strong> (soulbound ERC-721 that records
          proven memberships) and an <strong>NFTProver</strong> (verifies Groth16 ZK proofs and
          mints badges). After deployment, the oracle must index the collection's holder set
          before proofs can be generated.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container:      { maxWidth: 640, margin: "0 auto", padding: "32px 16px" },
  heading:        { fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#111827" },
  sub:            { color: "#6b7280", marginBottom: 24, fontSize: 14 },
  card:           { background: "#fff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  label:          { display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "#374151", fontWeight: 500 },
  row:            { display: "flex", gap: 8 },
  input:          { flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", color: "#111827", fontSize: 14, outline: "none" },
  btn:            { background: "#6b7280", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  hint:           { color: "#9ca3af", fontSize: 13, marginTop: 10 },
  result:         { display: "flex", alignItems: "center", gap: 14, marginTop: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px" },
  resultBadge:    { background: "#15803d", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  collectionName: { fontWeight: 700, fontSize: 15, color: "#111827" },
  collectionAddr: { fontSize: 11, color: "#6b7280", fontFamily: "monospace", marginTop: 2 },
  deployBtn:      { display: "block", width: "100%", marginTop: 20, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, cursor: "pointer", fontSize: 15 },
  explainer:      { marginTop: 24, background: "#fff", border: "1px solid #e8e4e0", borderRadius: 12, padding: 20 },
  explainerTitle: { fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 8 },
  explainerText:  { color: "#6b7280", fontSize: 13, lineHeight: 1.7, margin: 0 },
};

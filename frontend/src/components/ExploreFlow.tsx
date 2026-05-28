import { type Address } from "viem";
import { useDeployments, useCollectionInfo, type FactoryDeployment } from "../hooks/useFactory";

interface Props {
  onSelectCollection: (collection: Address) => void;
}

export function ExploreFlow({ onSelectCollection }: Props) {
  const { data: deployments, isLoading, error } = useDeployments();

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Explore Collections</h2>
      <p style={styles.sub}>
        Every tile below is an active NFT collection with a deployed ZK prover.
        Click one to prove ownership.
      </p>

      {isLoading && <p style={styles.dim}>Loading collections…</p>}
      {error    && <p style={styles.err}>Could not load collections: {error.message}</p>}

      {deployments && deployments.length === 0 && (
        <p style={styles.dim}>No collections registered yet. Use Create Verifier to add one.</p>
      )}

      <div style={styles.grid}>
        {(deployments as FactoryDeployment[] | undefined)?.map((d) => (
          <CollectionTile key={d.nftCollection} deployment={d} onSelect={onSelectCollection} />
        ))}
      </div>
    </div>
  );
}

function CollectionTile({
  deployment,
  onSelect,
}: {
  deployment: FactoryDeployment;
  onSelect: (c: Address) => void;
}) {
  const { name, symbol } = useCollectionInfo(deployment.nftCollection);
  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div style={styles.tile}>
      <div style={styles.tileSymbol}>{symbol ?? "…"}</div>
      <div style={styles.tileName}>{name ?? "Unknown Collection"}</div>
      <div style={styles.tileAddr}>{short(deployment.nftCollection)}</div>
      <button style={styles.tileBtn} onClick={() => onSelect(deployment.nftCollection)}>
        Prove Ownership →
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 720, margin: "0 auto", padding: "32px 16px" },
  heading:   { fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#111827" },
  sub:       { color: "#6b7280", marginBottom: 28, fontSize: 14 },
  dim:       { color: "#9ca3af", fontSize: 14 },
  err:       { color: "#dc2626", fontSize: 14 },
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 },
  tile:      {
    background: "#ffffff", border: "1px solid #e8e4e0", borderRadius: 12,
    padding: "20px 16px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    transition: "box-shadow 0.15s",
  },
  tileSymbol:{ fontSize: 28, fontWeight: 800, color: "#dc2626" },
  tileName:  { fontSize: 13, fontWeight: 600, color: "#111827", textAlign: "center" },
  tileAddr:  { fontSize: 11, color: "#9ca3af", fontFamily: "monospace" },
  tileBtn:   {
    marginTop: 8, background: "#dc2626", color: "#fff", border: "none",
    borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer",
    fontSize: 13, width: "100%",
  },
};

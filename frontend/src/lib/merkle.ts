/**
 * Client-side merkle tree utilities.
 * Loads the pre-built tree from /circuits/merkle.json (output of scripts/update-merkle.ts).
 */

export interface MerkleData {
  root: string;
  depth: number;
  holders: string[];
  proofs: Record<
    string,
    { path: string[]; indices: number[] }
  >;
}

let cachedMerkle: MerkleData | null = null;

export async function loadMerkleData(): Promise<MerkleData> {
  if (cachedMerkle) return cachedMerkle;
  const res = await fetch("/circuits/merkle.json");
  if (!res.ok) throw new Error("merkle.json not found — run scripts/update-merkle.ts first");
  cachedMerkle = await res.json() as MerkleData;
  return cachedMerkle;
}

export async function getMerkleProof(
  address: string
): Promise<{ path: bigint[]; indices: number[] }> {
  const data   = await loadMerkleData();
  const addr   = address.toLowerCase();
  const proof  = data.proofs[addr];
  if (!proof) throw new Error(`${addr} is not in the NFT-holder merkle tree`);
  return {
    path:    proof.path.map(BigInt),
    indices: proof.indices,
  };
}

export async function getMerkleRoot(): Promise<bigint> {
  const data = await loadMerkleData();
  return BigInt(data.root);
}

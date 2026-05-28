export interface CollectionMerkleData {
  root: string;
  depth: number;
  holders: string[];
  proofs: Record<string, { path: string[]; indices: number[] }>;
}

type MerkleFile = Record<string, CollectionMerkleData>;

let cached: MerkleFile | null = null;

async function load(): Promise<MerkleFile> {
  if (cached) return cached;
  const res = await fetch("/circuits/merkle.json");
  if (!res.ok) throw new Error("merkle.json not found — run scripts/update-merkle.ts first");
  cached = await res.json() as MerkleFile;
  return cached;
}

export async function getMerkleProof(
  walletAddress: string,
  collection: string,
): Promise<{ path: bigint[]; indices: number[] }> {
  const data = await load();
  const tree = data[collection.toLowerCase()];
  if (!tree) throw new Error(`No merkle tree for collection ${collection} — run update-merkle.ts`);
  const proof = tree.proofs[walletAddress.toLowerCase()];
  if (!proof) throw new Error(`${walletAddress} is not in the merkle tree for ${collection}`);
  return { path: proof.path.map(BigInt), indices: proof.indices };
}

export async function getMerkleRoot(collection: string): Promise<bigint> {
  const data = await load();
  const tree = data[collection.toLowerCase()];
  if (!tree) throw new Error(`No merkle tree for collection ${collection}`);
  return BigInt(tree.root);
}

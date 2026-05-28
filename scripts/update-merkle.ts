/**
 * Oracle script: reads current NFT holders from the MockNFT contract,
 * builds a Poseidon merkle tree (depth 10), and posts the new root
 * to the NFTProver contract. Also writes merkle.json for the frontend.
 *
 * Usage:
 *   PRIVATE_KEY=0x... tsx update-merkle.ts
 *
 * Requires frontend/src/deployments.json to exist (from forge script Deploy).
 *
 * IMPORTANT — hash conversion:
 *   circomlibjs returns Poseidon results as field elements in LE Montgomery form.
 *   Reading the raw bytes as big-endian hex produces a different number than what
 *   the circom circuit computes. Always use poseidon.F.toObject() to get a BigInt.
 */
import { createPublicClient, createWalletClient, http, parseAbiItem, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil, sepolia } from "viem/chains";
import { buildPoseidon } from "circomlibjs";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname   = dirname(fileURLToPath(import.meta.url));
const DEPLOY_PATH = resolve(__dirname, "../frontend/src/deployments.json");
const MERKLE_PATH = resolve(__dirname, "../frontend/public/circuits/merkle.json");

const DEPTH = 10;

// poseidon is typed with .F after buildPoseidon() resolves
type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;

function hash(poseidon: Poseidon, inputs: bigint[]): bigint {
  return poseidon.F.toObject(poseidon(inputs)) as bigint;
}

function addressToField(addr: string): bigint {
  return BigInt(addr.toLowerCase());
}

async function main() {
  const deployments  = JSON.parse(readFileSync(DEPLOY_PATH, "utf-8"));
  const mockNFTAddr  = deployments.mockNFT   as Address;
  const nftProverAddr = deployments.nftProver as Address;

  const privateKey = (process.env.PRIVATE_KEY
    ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  // Select chain and RPC from environment. Falls back to local anvil for dev.
  const chainId  = Number(deployments.chainId);
  const chain    = chainId === sepolia.id ? sepolia : anvil;
  const rpcUrl   = process.env.SEPOLIA_RPC_URL ?? process.env.RPC_URL;
  const transport = rpcUrl ? http(rpcUrl) : http();

  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });

  // ── 1. Fetch current NFT holders ────────────────────────────────────────────
  console.log(">>> Fetching NFT holders...");
  const logs = await publicClient.getLogs({
    address:   mockNFTAddr,
    event:     parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
    fromBlock: 0n,
    toBlock:   "latest",
  });

  const ownerOf: Record<string, string> = {};
  for (const log of logs) {
    const { to, tokenId } = log.args as { from: string; to: string; tokenId: bigint };
    if (to !== "0x0000000000000000000000000000000000000000") {
      ownerOf[tokenId.toString()] = to.toLowerCase();
    }
  }
  const holders = [...new Set(Object.values(ownerOf))];
  console.log(`Found ${holders.length} unique holder(s): ${holders.join(", ")}`);

  // ── 2. Build Poseidon merkle tree ────────────────────────────────────────────
  console.log(">>> Building Poseidon merkle tree (depth 10)...");
  const poseidon = await buildPoseidon();

  // leaves: Poseidon([address_as_field]) for each holder, 0 for empty slots
  const size   = 2 ** DEPTH;
  const leaves = Array<bigint>(size).fill(0n);
  for (let i = 0; i < holders.length; i++) {
    leaves[i] = hash(poseidon, [addressToField(holders[i])]);
  }

  // build layers bottom-up
  const layers: bigint[][] = [leaves];
  let current = leaves;
  for (let d = 0; d < DEPTH; d++) {
    const next: bigint[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(hash(poseidon, [current[i], current[i + 1]]));
    }
    layers.push(next);
    current = next;
  }
  const root = current[0];
  console.log(`Merkle root: 0x${root.toString(16)}`);

  // ── 3. Build per-holder proofs ───────────────────────────────────────────────
  const proofs: Record<string, { path: string[]; indices: number[] }> = {};
  for (const addr of holders) {
    const leaf      = hash(poseidon, [addressToField(addr)]);
    const leafIndex = leaves.indexOf(leaf);
    if (leafIndex === -1) throw new Error(`Leaf not found for ${addr}`);

    const path: bigint[]    = [];
    const indices: number[] = [];
    let idx = leafIndex;
    for (let d = 0; d < DEPTH; d++) {
      const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
      path.push(layers[d][sibling]);
      indices.push(idx % 2);   // 0 = current is left child, 1 = current is right child
      idx = Math.floor(idx / 2);
    }
    proofs[addr] = { path: path.map(n => n.toString()), indices };
  }

  // ── 4. Write merkle.json for the frontend ────────────────────────────────────
  writeFileSync(MERKLE_PATH, JSON.stringify({
    root:    root.toString(),
    depth:   DEPTH,
    holders,
    proofs,
  }, null, 2));
  console.log(`>>> Wrote merkle.json to ${MERKLE_PATH}`);

  // ── 5. Post root on-chain ────────────────────────────────────────────────────
  console.log(">>> Updating merkle root on NFTProver...");
  const txHash = await walletClient.writeContract({
    address:      nftProverAddr,
    abi:          [{ name: "setMerkleRoot", type: "function", inputs: [{ name: "_newRoot", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const,
    functionName: "setMerkleRoot",
    args:         [root],
    chain,
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`>>> setMerkleRoot tx: ${txHash}`);
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });

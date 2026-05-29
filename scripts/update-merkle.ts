/**
 * Oracle: reads NFT holders for every registered collection from the factory,
 * builds Poseidon merkle trees, updates on-chain roots via the factory, and
 * writes a multi-collection merkle.json for the frontend.
 *
 * Usage:  PRIVATE_KEY=0x... tsx update-merkle.ts
 *
 * IMPORTANT — hash conversion:
 *   circomlibjs returns Poseidon results as field elements in LE Montgomery form.
 *   Always use poseidon.F.toObject() to convert to BigInt.
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
const DEPTH       = 10;

type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;

function hash(poseidon: Poseidon, inputs: bigint[]): bigint {
  return poseidon.F.toObject(poseidon(inputs)) as bigint;
}

function addressToField(addr: string): bigint {
  return BigInt(addr.toLowerCase());
}

async function buildTree(poseidon: Poseidon, holders: string[]) {
  const size   = 2 ** DEPTH;
  const leaves = Array<bigint>(size).fill(0n);
  for (let i = 0; i < holders.length; i++) {
    leaves[i] = hash(poseidon, [addressToField(holders[i])]);
  }

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
      indices.push(idx % 2);
      idx = Math.floor(idx / 2);
    }
    proofs[addr] = { path: path.map(n => n.toString()), indices };
  }

  return { root, proofs };
}

const FACTORY_ABI = [
  { name: "getDeployments", type: "function", stateMutability: "view", inputs: [],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "nftCollection",   type: "address" },
      { name: "nftProver",       type: "address" },
      { name: "badgeNFT",        type: "address" },
      { name: "deployer",        type: "address" },
      { name: "deployedAtBlock", type: "uint256" },
    ]}]},
  { name: "setMerkleRoot", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "nftCollection", type: "address" }, { name: "newRoot", type: "uint256" }], outputs: [] },
] as const;

const PROVER_ABI = [
  { name: "merkleRoot", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const deployments   = JSON.parse(readFileSync(DEPLOY_PATH, "utf-8"));
  const factoryAddr   = deployments.factory as Address;
  const chainId       = Number(deployments.chainId);
  const chain         = chainId === sepolia.id ? sepolia : anvil;
  const rpcUrl        = process.env.SEPOLIA_RPC_URL ?? process.env.RPC_URL;
  const transport     = rpcUrl ? http(rpcUrl) : http();

  const rawKey   = process.env.PRIVATE_KEY
    ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account  = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });

  // ── 1. Fetch all registered collections from the factory ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factoryDeployments = await (publicClient as any).readContract({
    address: factoryAddr, abi: FACTORY_ABI, functionName: "getDeployments",
  }) as Array<{ nftCollection: Address; nftProver: Address }>;

  console.log(`>>> Found ${factoryDeployments.length} registered collection(s).`);

  const poseidon    = await buildPoseidon();
  const merkleFile: Record<string, { root: string; depth: number; holders: string[]; proofs: Record<string, { path: string[]; indices: number[] }> }> = {};

  // ── 2. Process each collection ────────────────────────────────────────────────
  for (const { nftCollection, nftProver } of factoryDeployments) {
    console.log(`\n>>> Collection: ${nftCollection}`);

    const logs = await publicClient.getLogs({
      address:   nftCollection,
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
    console.log(`    ${holders.length} unique holder(s): ${holders.join(", ")}`);

    const { root, proofs } = await buildTree(poseidon, holders);
    merkleFile[nftCollection.toLowerCase()] = { root: root.toString(), depth: DEPTH, holders, proofs };

    // ── 3. Update on-chain root if changed ──────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onChainRoot = await (publicClient as any).readContract({
      address: nftProver, abi: PROVER_ABI, functionName: "merkleRoot",
    }) as bigint;

    if (onChainRoot === root) {
      console.log("    Root unchanged — skipping setMerkleRoot.");
      continue;
    }

    console.log(`    Root changed (${onChainRoot} → ${root}). Calling factory.setMerkleRoot...`);
    const txHash = await walletClient.writeContract({
      address:      factoryAddr,
      abi:          FACTORY_ABI,
      functionName: "setMerkleRoot",
      args:         [nftCollection, root],
      chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`    setMerkleRoot tx: ${txHash}`);
  }

  // ── 4. Write unified merkle.json ─────────────────────────────────────────────
  writeFileSync(MERKLE_PATH, JSON.stringify(merkleFile, null, 2));
  console.log(`\n>>> Wrote merkle.json (${Object.keys(merkleFile).length} collection(s)) to ${MERKLE_PATH}`);
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });

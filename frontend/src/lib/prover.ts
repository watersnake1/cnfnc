/**
 * Browser-side ZK proof generation using snarkjs + the compiled circuit WASM/zkey.
 * The heavy artifacts (.wasm, .zkey) are fetched lazily from /circuits/.
 */
import * as snarkjs from "snarkjs";

const WASM_URL = "/circuits/nft_ownership.wasm";
const ZKEY_URL = "/circuits/nft_ownership_final.zkey";

export interface ProofInput {
  wallet_a:       bigint;
  merkle_path:    bigint[];
  merkle_indices: number[];
  wallet_b:       bigint;
  merkle_root:    bigint;
  nullifier_hash: bigint;
}

export interface GrothProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint];  // [wallet_b, merkle_root, nullifier_hash]
}

// snarkjs expects plain numbers/strings for the input JSON
function toSnarkInput(input: ProofInput) {
  return {
    wallet_a:        input.wallet_a.toString(),
    merkle_path:     input.merkle_path.map(n => n.toString()),
    merkle_indices:  input.merkle_indices.map(n => n.toString()),
    wallet_b:        input.wallet_b.toString(),
    merkle_root:     input.merkle_root.toString(),
    nullifier_hash:  input.nullifier_hash.toString(),
  };
}

function parseGrothProof(rawProof: Record<string, unknown>, publicSignals: string[]): GrothProof {
  const pi_a = rawProof.pi_a as string[];
  const pi_b = rawProof.pi_b as string[][];
  const pi_c = rawProof.pi_c as string[];

  // The EVM BN254 pairing precompile expects G2 Fp2 coordinates in [c1, c0] order
  // (imaginary part first), but snarkjs returns pi_b with each pair as [c0, c1]
  // (real part first). Swap within each pair to match what the verifier contract expects.
  return {
    pA: [BigInt(pi_a[0]), BigInt(pi_a[1])],
    pB: [
      [BigInt(pi_b[0][1]), BigInt(pi_b[0][0])],  // swap: c1, c0
      [BigInt(pi_b[1][1]), BigInt(pi_b[1][0])],  // swap: c1, c0
    ],
    pC: [BigInt(pi_c[0]), BigInt(pi_c[1])],
    pubSignals: [
      BigInt(publicSignals[0]),
      BigInt(publicSignals[1]),
      BigInt(publicSignals[2]),
    ],
  };
}

export async function generateProof(input: ProofInput): Promise<GrothProof> {
  const snarkInput = toSnarkInput(input);

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    snarkInput,
    WASM_URL,
    ZKEY_URL
  );

  return parseGrothProof(proof as Record<string, unknown>, publicSignals as string[]);
}

// Format a GrothProof as the solidity calldata arrays expected by NFTProver.mint()
export function toContractArgs(p: GrothProof): {
  pA:         [bigint, bigint];
  pB:         [[bigint, bigint], [bigint, bigint]];
  pC:         [bigint, bigint];
  pubSignals: [bigint, bigint, bigint];
} {
  return {
    pA:         p.pA,
    pB:         p.pB,
    pC:         p.pC,
    pubSignals: p.pubSignals,
  };
}

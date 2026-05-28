/**
 * Thin Poseidon wrapper for the browser.
 * Uses circomlibjs (WASM-backed), lazy-loaded on first use.
 *
 * IMPORTANT: circomlibjs returns hashes as field elements in little-endian
 * Montgomery form. Reading the raw bytes as big-endian hex produces a completely
 * different number than what the circom circuit computes. Always use
 * poseidon.F.toObject() to convert to a BigInt — never read the raw bytes directly.
 */
import type { PoseidonFn } from "circomlibjs";

let poseidonFn: PoseidonFn | undefined;

async function getPoseidon(): Promise<PoseidonFn> {
  if (poseidonFn) return poseidonFn;
  const { buildPoseidon } = await import("circomlibjs");
  poseidonFn = await buildPoseidon();
  return poseidonFn;
}

export async function poseidon1(input: bigint): Promise<bigint> {
  const fn = await getPoseidon();
  return fn.F.toObject(fn([input]));
}

export async function nullifierHash(walletA: bigint): Promise<bigint> {
  return poseidon1(walletA);
}

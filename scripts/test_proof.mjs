import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import { readFileSync } from "fs";

const merkle = JSON.parse(readFileSync(
  "../frontend/public/circuits/merkle.json", "utf8"
));

const WASM = "../frontend/public/circuits/nft_ownership.wasm";
const ZKEY = "../frontend/public/circuits/nft_ownership_final.zkey";

const WALLET_A = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const WALLET_B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // anvil account[1]

const poseidon = await buildPoseidon();
const hash = (inputs) => poseidon.F.toObject(poseidon(inputs));

const walletAField = BigInt(WALLET_A);
const walletBField = BigInt(WALLET_B);

const nullifier = hash([walletAField]);
console.log("nullifier_hash:", nullifier.toString());

const proofData = merkle.proofs[WALLET_A];
if (!proofData) { console.error("Address not found in tree:", WALLET_A); process.exit(1); }
const merkleRoot = BigInt(merkle.root);
console.log("merkle_root:   ", merkleRoot.toString());

const input = {
  wallet_a:       walletAField.toString(),
  merkle_path:    proofData.path,
  merkle_indices: proofData.indices.map(String),
  wallet_b:       walletBField.toString(),
  merkle_root:    merkleRoot.toString(),
  nullifier_hash: nullifier.toString(),
};

console.log("\nGenerating proof (this takes ~30s)...");
const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
console.log("publicSignals:", publicSignals);

const vkey = JSON.parse(readFileSync("/tmp/vkey.json", "utf8"));
const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
console.log("Local verify:  ", valid);

const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
console.log("\n--- cast calldata ---\n", calldata);

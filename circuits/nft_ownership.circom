pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/mux1.circom";

// Binary merkle tree membership proof using Poseidon hashing.
// depth: number of levels (supports 2^depth leaves).
template MerkleProof(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];  // 0 = leaf is left child, 1 = leaf is right child

    component hashers[depth];
    component mux[depth];

    signal levelHashes[depth + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;  // must be 0 or 1

        mux[i] = MultiMux1(2);
        // slot 0: [currentHash, sibling] when pathIndices[i] == 0 (current is left)
        // slot 1: [sibling, currentHash] when pathIndices[i] == 1 (current is right)
        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];
        mux[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root === levelHashes[depth];
}

// Proves: the prover knows a wallet_a such that:
//   1. Poseidon([wallet_a]) is a leaf in the NFT-holder merkle tree at merkle_root
//   2. nullifier_hash == Poseidon([wallet_a])  (prevents double-claiming)
//   wallet_b is the publicly committed destination for the badge NFT.
//
// depth 10 => supports up to 1024 NFT holders (sufficient for v1).
template NFTOwnershipProver(depth) {
    // ── Private inputs ──────────────────────────────────────────────────────
    signal input wallet_a;                  // owner's private wallet address (as field)
    signal input merkle_path[depth];        // sibling hashes along the merkle path
    signal input merkle_indices[depth];     // 0=left / 1=right at each level

    // ── Public inputs ───────────────────────────────────────────────────────
    signal input wallet_b;                  // destination badge wallet (committed publicly)
    signal input merkle_root;              // root of the current NFT-holder tree
    signal input nullifier_hash;           // = Poseidon([wallet_a]), prevents double-mint

    // ── 1. Compute leaf from wallet_a ───────────────────────────────────────
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== wallet_a;

    // ── 2. Verify merkle membership ─────────────────────────────────────────
    component merkleCheck = MerkleProof(depth);
    merkleCheck.leaf <== leafHasher.out;
    merkleCheck.root <== merkle_root;
    for (var i = 0; i < depth; i++) {
        merkleCheck.pathElements[i] <== merkle_path[i];
        merkleCheck.pathIndices[i]  <== merkle_indices[i];
    }

    // ── 3. Verify nullifier matches wallet_a ────────────────────────────────
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== wallet_a;
    nullifier_hash === nullifierHasher.out;

    // ── 4. Constrain wallet_b so it cannot be malleated post-proof ──────────
    signal wallet_b_sq;
    wallet_b_sq <== wallet_b * wallet_b;
}

component main {public [wallet_b, merkle_root, nullifier_hash]} = NFTOwnershipProver(10);

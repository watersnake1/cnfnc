// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface matching the Groth16 verifier contract exported by snarkjs.
///         Public signals order: [wallet_b, merkle_root, nullifier_hash]
interface IVerifier {
    function verifyProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[3] calldata pubSignals
    ) external view returns (bool);
}

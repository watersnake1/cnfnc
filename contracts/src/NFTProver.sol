// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVerifier.sol";
import "./BadgeNFT.sol";

/// @notice Core contract: verifies ZK proofs of NFT ownership and mints soulbound badges.
///
/// Public signals layout (matches circuit output order):
///   pubSignals[0] = wallet_b       — destination badge wallet
///   pubSignals[1] = merkle_root    — root of the NFT-holder merkle tree
///   pubSignals[2] = nullifier_hash — Poseidon(wallet_a), prevents double-claiming
contract NFTProver is Ownable {
    IVerifier public immutable verifier;
    BadgeNFT  public immutable badgeNFT;

    uint256 public merkleRoot;

    // nullifier_hash => whether a badge has already been minted
    mapping(uint256 => bool) public nullifiers;

    event MerkleRootUpdated(uint256 indexed oldRoot, uint256 indexed newRoot);
    event BadgeMinted(address indexed walletB, uint256 indexed tokenId, uint256 nullifierHash);

    error InvalidProof();
    error StaleOrWrongMerkleRoot();
    error NullifierAlreadyUsed();
    error ZeroAddress();

    constructor(address _verifier, address _badgeNFT, uint256 _merkleRoot) Ownable(msg.sender) {
        if (_verifier == address(0) || _badgeNFT == address(0)) revert ZeroAddress();
        verifier   = IVerifier(_verifier);
        badgeNFT   = BadgeNFT(_badgeNFT);
        merkleRoot = _merkleRoot;
    }

    /// @notice Update the merkle root of the NFT-holder set. Admin only.
    function setMerkleRoot(uint256 _newRoot) external onlyOwner {
        emit MerkleRootUpdated(merkleRoot, _newRoot);
        merkleRoot = _newRoot;
    }

    /// @notice Verify a ZK proof and mint a soulbound badge to wallet_b.
    /// @param pA          Proof part A  (from snarkjs)
    /// @param pB          Proof part B  (from snarkjs)
    /// @param pC          Proof part C  (from snarkjs)
    /// @param pubSignals  [wallet_b, merkle_root, nullifier_hash]
    function mint(
        uint256[2]    calldata pA,
        uint256[2][2] calldata pB,
        uint256[2]    calldata pC,
        uint256[3]    calldata pubSignals
    ) external returns (uint256 tokenId) {
        uint256 walletB       = pubSignals[0];
        uint256 proofRoot     = pubSignals[1];
        uint256 nullifierHash = pubSignals[2];

        // Reject proofs built against an old or wrong tree root
        if (proofRoot != merkleRoot) revert StaleOrWrongMerkleRoot();

        // Prevent double-claiming
        if (nullifiers[nullifierHash]) revert NullifierAlreadyUsed();

        // Verify the Groth16 proof
        if (!verifier.verifyProof(pA, pB, pC, pubSignals)) revert InvalidProof();

        nullifiers[nullifierHash] = true;

        address dest = address(uint160(walletB));
        bytes memory metadata = abi.encode(pA, pB, pC, pubSignals);
        tokenId = badgeNFT.mint(dest, metadata);

        emit BadgeMinted(dest, tokenId, nullifierHash);
    }

    /// @notice Returns true if wallet_b holds at least one badge (i.e., proved ownership).
    function hasBadge(address walletB) external view returns (bool) {
        return badgeNFT.balanceOf(walletB) > 0;
    }

    /// @notice Returns whether a specific nullifier has been consumed.
    function isNullifierUsed(uint256 nullifierHash) external view returns (bool) {
        return nullifiers[nullifierHash];
    }
}

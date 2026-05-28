// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/NFTProver.sol";
import "../src/BadgeNFT.sol";
import "../src/IVerifier.sol";
import "../src/mocks/MockNFT.sol";

/// @notice Mock verifier that returns a configurable result.
contract MockVerifier is IVerifier {
    bool public result = true;

    function setResult(bool _result) external { result = _result; }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[3] calldata
    ) external view returns (bool) {
        return result;
    }
}

contract NFTProverTest is Test {
    MockVerifier verifier;
    BadgeNFT     badge;
    NFTProver    prover;
    MockNFT      nft;

    address admin  = address(this);
    address alice  = makeAddr("alice");   // wallet_A owner
    address bob    = makeAddr("bob");     // wallet_B (badge recipient)

    uint256 constant MERKLE_ROOT     = 0xdeadbeef;
    uint256 constant NULLIFIER_HASH  = 0xcafe1234;
    uint256 constant WALLET_B_FIELD  = uint256(uint160(address(0xB0b)));

    uint256[2]    pA = [uint256(1), 2];
    uint256[2][2] pB = [[uint256(3), 4], [uint256(5), 6]];
    uint256[2]    pC = [uint256(7), 8];
    uint256[3]    pubSignals;

    function setUp() public {
        verifier = new MockVerifier();
        badge    = new BadgeNFT();
        prover   = new NFTProver(address(verifier), address(badge), MERKLE_ROOT);
        nft      = new MockNFT();

        badge.setProver(address(prover));

        pubSignals = [WALLET_B_FIELD, MERKLE_ROOT, NULLIFIER_HASH];
    }

    // ── Happy path ───────────────────────────────────────────────────────────

    function test_MintSucceeds() public {
        vm.prank(alice);
        uint256 tokenId = prover.mint(pA, pB, pC, pubSignals);

        address dest = address(uint160(WALLET_B_FIELD));
        assertEq(badge.ownerOf(tokenId), dest);
        assertTrue(prover.hasBadge(dest));
        assertTrue(prover.isNullifierUsed(NULLIFIER_HASH));
    }

    // ── Rejection: wrong merkle root ─────────────────────────────────────────

    function test_RejectWrongMerkleRoot() public {
        uint256[3] memory badSignals = [WALLET_B_FIELD, uint256(0xBAD0000), NULLIFIER_HASH];
        vm.expectRevert(NFTProver.StaleOrWrongMerkleRoot.selector);
        prover.mint(pA, pB, pC, badSignals);
    }

    // ── Rejection: double-mint ───────────────────────────────────────────────

    function test_RejectDoubleMintsForSameNullifier() public {
        prover.mint(pA, pB, pC, pubSignals);

        vm.expectRevert(NFTProver.NullifierAlreadyUsed.selector);
        prover.mint(pA, pB, pC, pubSignals);
    }

    // ── Rejection: invalid proof ─────────────────────────────────────────────

    function test_RejectInvalidProof() public {
        verifier.setResult(false);
        vm.expectRevert(NFTProver.InvalidProof.selector);
        prover.mint(pA, pB, pC, pubSignals);
    }

    // ── Admin: update merkle root ────────────────────────────────────────────

    function test_AdminCanUpdateMerkleRoot() public {
        uint256 newRoot = 0xABCDEF01;
        prover.setMerkleRoot(newRoot);
        assertEq(prover.merkleRoot(), newRoot);
    }

    function test_NonAdminCannotUpdateMerkleRoot() public {
        vm.prank(alice);
        vm.expectRevert();
        prover.setMerkleRoot(0xABCDEF01);
    }

    // ── hasBadge returns false for wallet with no badge ──────────────────────

    function test_HasBadgeReturnsFalseForUnknown() public {
        assertFalse(prover.hasBadge(address(0xdead)));
    }

    // ── Event emission ───────────────────────────────────────────────────────

    function test_EmitsBadgeMintedEvent() public {
        address dest = address(uint160(WALLET_B_FIELD));
        vm.expectEmit(true, true, true, true);
        emit NFTProver.BadgeMinted(dest, 0, NULLIFIER_HASH);
        prover.mint(pA, pB, pC, pubSignals);
    }
}

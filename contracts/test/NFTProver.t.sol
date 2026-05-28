// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/NFTProver.sol";
import "../src/BadgeNFT.sol";
import "../src/IVerifier.sol";
import "../src/mocks/MockNFT.sol";

contract MockVerifier is IVerifier {
    bool public result = true;
    function setResult(bool _result) external { result = _result; }
    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[3] calldata)
        external view returns (bool) { return result; }
}

contract NFTProverTest is Test {
    MockVerifier verifier;
    BadgeNFT     badge;
    NFTProver    prover;
    MockNFT      nft;

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    uint256 constant MERKLE_ROOT    = 0xdeadbeef;
    uint256 constant NULLIFIER_HASH = 0xcafe1234;
    uint256 constant WALLET_B_FIELD = uint256(uint160(address(0xB0b)));

    uint256[2]    pA = [uint256(1), 2];
    uint256[2][2] pB = [[uint256(3), 4], [uint256(5), 6]];
    uint256[2]    pC = [uint256(7), 8];
    uint256[3]    pubSignals;

    function setUp() public {
        nft      = new MockNFT();
        verifier = new MockVerifier();
        badge    = new BadgeNFT(address(nft));
        prover   = new NFTProver(address(verifier), address(badge), MERKLE_ROOT, address(nft));
        badge.setProver(address(prover));
        pubSignals = [WALLET_B_FIELD, MERKLE_ROOT, NULLIFIER_HASH];
    }

    function test_MintSucceeds() public {
        vm.prank(alice);
        uint256 tokenId = prover.mint(pA, pB, pC, pubSignals);
        address dest = address(uint160(WALLET_B_FIELD));
        assertEq(badge.ownerOf(tokenId), dest);
        assertTrue(prover.hasBadge(dest));
        assertTrue(prover.isNullifierUsed(NULLIFIER_HASH));
        assertEq(badge.mintedAtBlock(tokenId), block.number);
        assertEq(badge.nftCollection(), address(nft));
        assertEq(prover.nftCollection(), address(nft));
    }

    function test_RejectWrongMerkleRoot() public {
        uint256[3] memory bad = [WALLET_B_FIELD, uint256(0xBAD), NULLIFIER_HASH];
        vm.expectRevert(NFTProver.StaleOrWrongMerkleRoot.selector);
        prover.mint(pA, pB, pC, bad);
    }

    function test_RejectDoubleMintsForSameNullifier() public {
        prover.mint(pA, pB, pC, pubSignals);
        vm.expectRevert(NFTProver.NullifierAlreadyUsed.selector);
        prover.mint(pA, pB, pC, pubSignals);
    }

    function test_RejectInvalidProof() public {
        verifier.setResult(false);
        vm.expectRevert(NFTProver.InvalidProof.selector);
        prover.mint(pA, pB, pC, pubSignals);
    }

    function test_AdminCanUpdateMerkleRoot() public {
        prover.setMerkleRoot(0xABCD);
        assertEq(prover.merkleRoot(), 0xABCD);
    }

    function test_NonAdminCannotUpdateMerkleRoot() public {
        vm.prank(alice);
        vm.expectRevert();
        prover.setMerkleRoot(0xABCD);
    }

    function test_HasBadgeReturnsFalseForUnknown() public {
        assertFalse(prover.hasBadge(address(0xdead)));
    }

    function test_EmitsBadgeMintedEvent() public {
        address dest = address(uint160(WALLET_B_FIELD));
        vm.expectEmit(true, true, true, true);
        emit NFTProver.BadgeMinted(dest, 0, NULLIFIER_HASH);
        prover.mint(pA, pB, pC, pubSignals);
    }
}

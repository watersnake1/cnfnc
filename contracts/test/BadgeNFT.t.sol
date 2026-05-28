// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BadgeNFT.sol";

contract BadgeNFTTest is Test {
    BadgeNFT badge;
    address owner   = address(this);
    address prover  = makeAddr("prover");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");

    function setUp() public {
        badge = new BadgeNFT();
        badge.setProver(prover);
    }

    // ── Minting ──────────────────────────────────────────────────────────────

    function test_ProverCanMint() public {
        vm.prank(prover);
        uint256 id = badge.mint(alice, abi.encode("proof-data"));
        assertEq(badge.ownerOf(id), alice);
        assertEq(badge.balanceOf(alice), 1);
    }

    function test_NonProverCannotMint() public {
        vm.prank(alice);
        vm.expectRevert(BadgeNFT.OnlyProver.selector);
        badge.mint(alice, abi.encode("proof-data"));
    }

    function test_SetProverCanOnlyBeCalledOnce() public {
        vm.expectRevert(BadgeNFT.ProverAlreadySet.selector);
        badge.setProver(bob);
    }

    // ── Soulbound ────────────────────────────────────────────────────────────

    function test_TransferReverts() public {
        vm.prank(prover);
        uint256 id = badge.mint(alice, abi.encode("proof-data"));

        vm.prank(alice);
        vm.expectRevert(BadgeNFT.Soulbound.selector);
        badge.transferFrom(alice, bob, id);
    }

    function test_SafeTransferReverts() public {
        vm.prank(prover);
        uint256 id = badge.mint(alice, abi.encode("proof-data"));

        vm.prank(alice);
        vm.expectRevert(BadgeNFT.Soulbound.selector);
        badge.safeTransferFrom(alice, bob, id, "");
    }

    // ── TokenURI ─────────────────────────────────────────────────────────────

    function test_TokenURIIsDataURI() public {
        vm.prank(prover);
        uint256 id = badge.mint(alice, abi.encode("proof-data"));
        string memory uri = badge.tokenURI(id);
        assertTrue(
            bytes(uri).length > 0,
            "tokenURI must be non-empty"
        );
        // Must start with data:application/json;base64,
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory uriBytes = bytes(uri);
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i], "tokenURI prefix mismatch");
        }
    }
}

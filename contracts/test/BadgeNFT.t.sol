// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BadgeNFT.sol";
import "../src/mocks/MockNFT.sol";

contract BadgeNFTTest is Test {
    BadgeNFT badge;
    MockNFT  nft;

    address prover = makeAddr("prover");
    address alice  = makeAddr("alice");
    address bob    = makeAddr("bob");

    function setUp() public {
        nft   = new MockNFT();
        badge = new BadgeNFT(address(nft));
        badge.setProver(prover);
    }

    function test_ProverCanMint() public {
        vm.prank(prover);
        uint256 id = badge.mint(alice, abi.encode("proof-data"));
        assertEq(badge.ownerOf(id), alice);
        assertEq(badge.balanceOf(alice), 1);
        assertEq(badge.mintedAtBlock(id), block.number);
        assertEq(badge.nftCollection(), address(nft));
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

    function test_TokenURIIsDataURI() public {
        vm.prank(prover);
        uint256 id = badge.mint(alice, abi.encode("proof-data"));
        string memory uri = badge.tokenURI(id);
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory uriBytes = bytes(uri);
        assertTrue(uriBytes.length > prefix.length);
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../src/Verifier.sol";
import "../src/NFTProverFactory.sol";
import "../src/mocks/MockNFT.sol";

/// @notice Local dev deploy: three mock collections, each minted to the first
///         three anvil accounts, each registered with the factory.
contract DeployLocal is Script {
    // Standard anvil accounts (derived from default mnemonic)
    address constant ACCOUNT_0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant ACCOUNT_1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant ACCOUNT_2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ── Shared verifier + factory ────────────────────────────────────────
        Groth16Verifier  verifier = new Groth16Verifier();
        NFTProverFactory factory  = new NFTProverFactory(address(verifier));

        // ── Collection A: "Cosmic Apes" ──────────────────────────────────────
        MockNFT collectionA = new MockNFT("Cosmic Apes", "CAPE");
        collectionA.mint(ACCOUNT_0);
        collectionA.mint(ACCOUNT_1);
        collectionA.mint(ACCOUNT_2);

        // ── Collection B: "Pixel Punks" ──────────────────────────────────────
        MockNFT collectionB = new MockNFT("Pixel Punks", "PUNK");
        collectionB.mint(ACCOUNT_0);
        collectionB.mint(ACCOUNT_1);
        collectionB.mint(ACCOUNT_2);

        // ── Collection C: "Neon Frogs" ───────────────────────────────────────
        MockNFT collectionC = new MockNFT("Neon Frogs", "FROG");
        collectionC.mint(ACCOUNT_0);
        collectionC.mint(ACCOUNT_1);
        collectionC.mint(ACCOUNT_2);

        // ── Register all three with the factory ──────────────────────────────
        factory.deployProver(address(collectionA));
        factory.deployProver(address(collectionB));
        factory.deployProver(address(collectionC));

        vm.stopBroadcast();

        _writeDeployments(
            deployer,
            address(verifier),
            address(factory),
            address(collectionA),
            address(collectionB),
            address(collectionC)
        );

        console2.log("Verifier:     ", address(verifier));
        console2.log("Factory:      ", address(factory));
        console2.log("Cosmic Apes:  ", address(collectionA));
        console2.log("Pixel Punks:  ", address(collectionB));
        console2.log("Neon Frogs:   ", address(collectionC));
    }

    function _writeDeployments(
        address deployer,
        address verifier,
        address factory,
        address collectionA,
        address collectionB,
        address collectionC
    ) internal {
        string memory json = "{";
        json = string.concat(json, '"chainId":',    vm.toString(block.chainid), ",");
        json = string.concat(json, '"deployer":"',  vm.toString(deployer),      '",');
        json = string.concat(json, '"verifier":"',  vm.toString(verifier),      '",');
        json = string.concat(json, '"factory":"',   vm.toString(factory),       '",');
        json = string.concat(json, '"mockCollections":[');
        json = string.concat(json, '"', vm.toString(collectionA), '",');
        json = string.concat(json, '"', vm.toString(collectionB), '",');
        json = string.concat(json, '"', vm.toString(collectionC), '"');
        json = string.concat(json, "]}");

        vm.writeFile("../frontend/src/deployments.json", json);
    }
}

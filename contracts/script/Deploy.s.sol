// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../src/Verifier.sol";
import "../src/BadgeNFT.sol";
import "../src/NFTProver.sol";
import "../src/mocks/MockNFT.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        uint256 merkleRoot  = vm.envOr("MERKLE_ROOT", uint256(0));

        vm.startBroadcast(deployerKey);

        MockNFT mockNFT = new MockNFT();

        // Mint 1 NFT to the dev testing wallet
        mockNFT.mint(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);

        Groth16Verifier verifier = new Groth16Verifier();
        BadgeNFT badge           = new BadgeNFT();
        NFTProver prover         = new NFTProver(address(verifier), address(badge), merkleRoot);
        badge.setProver(address(prover));

        vm.stopBroadcast();

        _writeDeployments(deployer, address(mockNFT), address(verifier), address(badge), address(prover), merkleRoot);

        console2.log("MockNFT:   ", address(mockNFT));
        console2.log("Verifier:  ", address(verifier));
        console2.log("BadgeNFT:  ", address(badge));
        console2.log("NFTProver: ", address(prover));
    }

    function _writeDeployments(
        address deployer,
        address mockNFT,
        address verifier,
        address badge,
        address prover,
        uint256 merkleRoot
    ) internal {
        string memory json = "{";
        json = string.concat(json, '"chainId":', vm.toString(block.chainid), ",");
        json = string.concat(json, '"deployer":"', vm.toString(deployer), '",');
        json = string.concat(json, '"mockNFT":"',  vm.toString(mockNFT),  '",');
        json = string.concat(json, '"verifier":"', vm.toString(verifier), '",');
        json = string.concat(json, '"badgeNFT":"', vm.toString(badge),    '",');
        json = string.concat(json, '"nftProver":"',vm.toString(prover),   '",');
        json = string.concat(json, '"merkleRoot":"',vm.toString(merkleRoot),'",');
        json = string.concat(json, '"nftHolders":["');
        json = string.concat(json, vm.toString(address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)), '"]}');

        vm.writeFile("../frontend/src/deployments.json", json);
    }
}

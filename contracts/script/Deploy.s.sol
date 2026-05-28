// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../src/Verifier.sol";
import "../src/NFTProverFactory.sol";
import "../src/mocks/MockNFT.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        MockNFT mockNFT = new MockNFT();
        mockNFT.mint(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);

        Groth16Verifier  verifier = new Groth16Verifier();
        NFTProverFactory factory  = new NFTProverFactory(address(verifier));

        // Register MockNFT as the first collection
        (address nftProver, address badgeNFT) = factory.deployProver(address(mockNFT));

        vm.stopBroadcast();

        _writeDeployments(deployer, address(mockNFT), address(verifier), address(factory), nftProver, badgeNFT);

        console2.log("MockNFT:   ", address(mockNFT));
        console2.log("Verifier:  ", address(verifier));
        console2.log("Factory:   ", address(factory));
        console2.log("NFTProver: ", nftProver);
        console2.log("BadgeNFT:  ", badgeNFT);
    }

    function _writeDeployments(
        address deployer,
        address mockNFT,
        address verifier,
        address factory,
        address nftProver,
        address badgeNFT
    ) internal {
        string memory json = "{";
        json = string.concat(json, '"chainId":',    vm.toString(block.chainid),  ",");
        json = string.concat(json, '"deployer":"',  vm.toString(deployer),       '",');
        json = string.concat(json, '"mockNFT":"',   vm.toString(mockNFT),        '",');
        json = string.concat(json, '"verifier":"',  vm.toString(verifier),       '",');
        json = string.concat(json, '"factory":"',   vm.toString(factory),        '",');
        json = string.concat(json, '"nftProver":"', vm.toString(nftProver),      '",');
        json = string.concat(json, '"badgeNFT":"',  vm.toString(badgeNFT),       '",');
        json = string.concat(json, '"nftHolders":["');
        json = string.concat(json, vm.toString(address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)), '"]}');

        vm.writeFile("../frontend/src/deployments.json", json);
    }
}

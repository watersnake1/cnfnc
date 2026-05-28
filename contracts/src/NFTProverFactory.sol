// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BadgeNFT.sol";
import "./NFTProver.sol";

/// @notice Factory that deploys a BadgeNFT + NFTProver pair for any ERC-721 collection.
///         The factory retains ownership of every deployed prover so the oracle can
///         update merkle roots via a single admin key.
contract NFTProverFactory is Ownable {
    address public immutable verifier;

    struct Deployment {
        address nftCollection;
        address nftProver;
        address badgeNFT;
        address deployer;
        uint256 deployedAtBlock;
    }

    Deployment[] private _deployments;
    mapping(address => address) public collectionToProver;

    event ProverDeployed(
        address indexed nftCollection,
        address indexed nftProver,
        address indexed badgeNFT,
        address deployer
    );

    error AlreadyDeployed();
    error CollectionNotRegistered();

    constructor(address _verifier) Ownable(msg.sender) {
        verifier = _verifier;
    }

    /// @notice Deploy a BadgeNFT + NFTProver for the given NFT collection.
    ///         Anyone can call this. The factory retains ownership of both contracts.
    function deployProver(address nftCollection)
        external
        returns (address nftProver, address badgeNFT)
    {
        if (collectionToProver[nftCollection] != address(0)) revert AlreadyDeployed();

        BadgeNFT  badge  = new BadgeNFT(nftCollection);
        NFTProver prover = new NFTProver(verifier, address(badge), 0, nftCollection);
        badge.setProver(address(prover));

        collectionToProver[nftCollection] = address(prover);
        _deployments.push(Deployment({
            nftCollection:    nftCollection,
            nftProver:        address(prover),
            badgeNFT:         address(badge),
            deployer:         msg.sender,
            deployedAtBlock:  block.number
        }));

        emit ProverDeployed(nftCollection, address(prover), address(badge), msg.sender);
        return (address(prover), address(badge));
    }

    /// @notice Update the merkle root for a collection's prover. Factory owner only.
    ///         Called by the off-chain oracle after rebuilding the holder tree.
    function setMerkleRoot(address nftCollection, uint256 newRoot) external onlyOwner {
        address prover = collectionToProver[nftCollection];
        if (prover == address(0)) revert CollectionNotRegistered();
        NFTProver(prover).setMerkleRoot(newRoot);
    }

    function getDeployments() external view returns (Deployment[] memory) {
        return _deployments;
    }

    function getDeploymentCount() external view returns (uint256) {
        return _deployments.length;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Dummy ERC-721 for local testing. Name and symbol are set at deploy time.
contract MockNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _mint(to, tokenId);
    }
}

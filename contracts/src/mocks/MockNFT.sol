// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Dummy ERC-721 representing "collection X" for v1 testing.
///         Anyone can mint; no transfer restrictions.
contract MockNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("Mock Collection X", "MCX") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _mint(to, tokenId);
    }
}

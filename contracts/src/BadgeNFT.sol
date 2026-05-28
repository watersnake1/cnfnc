// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Soulbound badge NFT minted by NFTProver as proof-of-ownership evidence.
///         Each BadgeNFT is tied to a single NFT collection. Transfers are disabled.
///         Token URI is fully on-chain JSON containing proof metadata.
contract BadgeNFT is ERC721, Ownable {
    using Strings for uint256;

    address public prover;
    address public immutable nftCollection;
    uint256 private _nextTokenId;

    mapping(uint256 => bytes)   private _proofData;
    mapping(uint256 => uint256) public  mintedAtBlock;

    event ProverSet(address indexed prover);

    error OnlyProver();
    error Soulbound();
    error ProverAlreadySet();

    constructor(address _nftCollection) ERC721("NFT Ownership Badge", "BADGE") Ownable(msg.sender) {
        nftCollection = _nftCollection;
    }

    modifier onlyProver() {
        if (msg.sender != prover) revert OnlyProver();
        _;
    }

    function setProver(address _prover) external onlyOwner {
        if (prover != address(0)) revert ProverAlreadySet();
        prover = _prover;
        emit ProverSet(_prover);
    }

    function mint(address to, bytes calldata metadata) external onlyProver returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _proofData[tokenId]    = metadata;
        mintedAtBlock[tokenId] = block.number;
        _mint(to, tokenId);
    }

    // ── Soulbound ────────────────────────────────────────────────────────────

    function transferFrom(address, address, uint256) public pure override {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert Soulbound();
    }

    // ── On-chain token URI ───────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        bytes memory data = _proofData[tokenId];
        string memory json = Base64.encode(
            abi.encodePacked(
                '{"name":"NFT Ownership Badge #', tokenId.toString(), '",',
                '"description":"Soulbound proof of NFT collection ownership via ZK circuit.",',
                '"attributes":[',
                '{"trait_type":"nftCollection","value":"', Strings.toHexString(uint160(nftCollection), 20), '"},',
                '{"trait_type":"mintedAtBlock","value":"', mintedAtBlock[tokenId].toString(), '"},',
                '{"trait_type":"proof","value":"', _toHex(data), '"}',
                ']}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _toHex(bytes memory data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(2 * data.length + 2);
        result[0] = "0";
        result[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            result[2 + 2 * i]     = hexChars[uint8(data[i]) >> 4];
            result[2 + 2 * i + 1] = hexChars[uint8(data[i]) & 0x0f];
        }
        return string(result);
    }
}

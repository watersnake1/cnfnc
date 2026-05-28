export const NFTProverABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pA", type: "uint256[2]" },
      { name: "pB", type: "uint256[2][2]" },
      { name: "pC", type: "uint256[2]" },
      { name: "pubSignals", type: "uint256[3]" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "hasBadge",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "walletB", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isNullifierUsed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "nullifierHash", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "merkleRoot",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "BadgeMinted",
    type: "event",
    inputs: [
      { name: "walletB",       type: "address", indexed: true },
      { name: "tokenId",       type: "uint256", indexed: true },
      { name: "nullifierHash", type: "uint256", indexed: true },
    ],
  },
  { name: "InvalidProof",           type: "error", inputs: [] },
  { name: "StaleOrWrongMerkleRoot", type: "error", inputs: [] },
  { name: "NullifierAlreadyUsed",   type: "error", inputs: [] },
  { name: "ZeroAddress",            type: "error", inputs: [] },
] as const;

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load root .env into the shell environment
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

: "${PRIVATE_KEY:?Set PRIVATE_KEY in .env}"
: "${SEPOLIA_RPC_URL:?Set SEPOLIA_RPC_URL in .env}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  CNFNC — Sepolia deployment          ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Deploy contracts ──────────────────────────────────────────────────────
echo "==> [1/3] Deploying contracts..."
cd "$ROOT_DIR/contracts"

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$SEPOLIA_RPC_URL"          \
  --broadcast                           \
  --private-key "$PRIVATE_KEY"          \
  --slow                                \
  -vvv

echo ""

# ── 2. Sync merkle tree ──────────────────────────────────────────────────────
echo "==> [2/3] Building merkle tree and updating on-chain root..."
cd "$SCRIPT_DIR"

SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PRIVATE_KEY="$PRIVATE_KEY" npx tsx update-merkle.ts

echo ""

# ── 3. Optional: verify contracts on Etherscan ───────────────────────────────
if [ -n "${ETHERSCAN_API_KEY:-}" ]; then
  echo "==> [3/3] Verifying contracts on Etherscan..."
  DEPLOY_JSON="$ROOT_DIR/frontend/src/deployments.json"
  VERIFIER=$(node -e "console.log(require('$DEPLOY_JSON').verifier)")
  BADGE=$(node   -e "console.log(require('$DEPLOY_JSON').badgeNFT)")
  PROVER=$(node  -e "console.log(require('$DEPLOY_JSON').nftProver)")
  MOCK=$(node    -e "console.log(require('$DEPLOY_JSON').mockNFT)")

  forge verify-contract "$VERIFIER" src/Verifier.sol:Groth16Verifier  --chain sepolia --watch
  forge verify-contract "$BADGE"    src/BadgeNFT.sol:BadgeNFT          --chain sepolia --watch
  forge verify-contract "$MOCK"     src/mocks/MockNFT.sol:MockNFT      --chain sepolia --watch

  # NFTProver needs constructor args
  PROVER_ARGS=$(cast abi-encode "constructor(address,address,uint256)" "$VERIFIER" "$BADGE" 0)
  forge verify-contract "$PROVER" src/NFTProver.sol:NFTProver \
    --chain sepolia \
    --constructor-args "$PROVER_ARGS" \
    --watch
else
  echo "==> [3/3] Skipping Etherscan verification (ETHERSCAN_API_KEY not set)"
fi

echo ""
echo "✓ Done. Next steps:"
echo "  1. Commit frontend/src/deployments.json and frontend/public/circuits/merkle.json"
echo "  2. Push to trigger a Vercel redeploy"
echo "  3. Set VITE_CHAIN=sepolia in your Vercel project environment variables"

#!/usr/bin/env bash
# Compiles the circom circuit, runs a development trusted setup,
# exports Verifier.sol, and copies artifacts to the frontend.
set -euo pipefail

CIRCOM="${HOME}/.cargo/bin/circom"
SNARKJS="${HOME}/.nvm/versions/node/v22.21.0/bin/snarkjs"
CIRCUITS_DIR="$(cd "$(dirname "$0")/../circuits" && pwd)"
BUILD_DIR="${CIRCUITS_DIR}/build"
CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"

mkdir -p "${BUILD_DIR}" "${FRONTEND_DIR}/public/circuits"

echo ">>> [1/6] Compiling circuit..."
"${CIRCOM}" "${CIRCUITS_DIR}/nft_ownership.circom" \
  --r1cs --wasm --sym \
  -l "${CIRCUITS_DIR}/node_modules" \
  -o "${BUILD_DIR}"

echo ">>> [2/6] Powers of Tau (dev, 2^15)..."
"${SNARKJS}" powersoftau new bn128 15 "${BUILD_DIR}/pot15_0000.ptau" -v
"${SNARKJS}" powersoftau contribute \
  "${BUILD_DIR}/pot15_0000.ptau" "${BUILD_DIR}/pot15_0001.ptau" \
  --name="dev-contribution" -v -e="$(date +%s%N)"

echo ">>> [3/6] Preparing Phase 2..."
"${SNARKJS}" powersoftau prepare phase2 \
  "${BUILD_DIR}/pot15_0001.ptau" "${BUILD_DIR}/pot15_final.ptau" -v

echo ">>> [4/6] Groth16 setup..."
"${SNARKJS}" groth16 setup \
  "${BUILD_DIR}/nft_ownership.r1cs" \
  "${BUILD_DIR}/pot15_final.ptau" \
  "${BUILD_DIR}/nft_ownership_0000.zkey"

"${SNARKJS}" zkey contribute \
  "${BUILD_DIR}/nft_ownership_0000.zkey" "${BUILD_DIR}/nft_ownership_final.zkey" \
  --name="dev-contribution" -v -e="$(date +%s%N)"

echo ">>> [5/6] Exporting Verifier.sol..."
"${SNARKJS}" zkey export solidityverifier \
  "${BUILD_DIR}/nft_ownership_final.zkey" \
  "${CONTRACTS_DIR}/src/Verifier.sol"

"${SNARKJS}" zkey export verificationkey \
  "${BUILD_DIR}/nft_ownership_final.zkey" \
  "${BUILD_DIR}/verification_key.json"

echo ">>> [6/6] Copying artifacts to frontend/public/circuits/..."
cp "${BUILD_DIR}/nft_ownership_js/nft_ownership.wasm" \
   "${FRONTEND_DIR}/public/circuits/nft_ownership.wasm"
cp "${BUILD_DIR}/nft_ownership_final.zkey" \
   "${FRONTEND_DIR}/public/circuits/nft_ownership_final.zkey"

echo ""
echo "Done! Circuit artifacts ready."
echo "  Verifier.sol  -> contracts/src/Verifier.sol"
echo "  .wasm + .zkey -> frontend/public/circuits/"

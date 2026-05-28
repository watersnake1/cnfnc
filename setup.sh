# 2. Deploy contracts (new terminal)
cd contracts
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 3. Build merkle tree and post root on-chain
cd ../scripts && pnpm install
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 tsx update-merkle.ts

# 4. Start frontend
npx tsx update-merkle.ts
cd ../frontend && pnpm dev
.PHONY: setup build-circuit contracts deploy dev clean

# Install tooling and project dependencies
setup:
	@echo ">>> Installing circom..."
	cargo install circom
	@echo ">>> Installing snarkjs..."
	npm install -g snarkjs
	@echo ">>> Installing circomlib (for circuit includes)..."
	cd circuits && npm install circomlib
	@echo ">>> Initialising Foundry project..."
	cd contracts && forge install
	@echo ">>> Installing frontend dependencies..."
	cd frontend && pnpm install
	@echo ">>> Installing script dependencies..."
	cd scripts && pnpm install
	@echo ">>> Setup complete."

# Compile circuit, run dev trusted setup, export Verifier.sol
build-circuit:
	bash scripts/build-circuit.sh

# Build and test Solidity contracts (requires Verifier.sol from build-circuit)
contracts:
	cd contracts && forge build && forge test -vvv

# Start anvil, deploy contracts, build merkle tree, write deployments.json
deploy:
	@echo ">>> Starting anvil..."
	anvil --block-time 1 &
	sleep 2
	@echo ">>> Running deploy script..."
	cd contracts && forge script script/Deploy.s.sol:Deploy \
		--rpc-url http://localhost:8545 \
		--broadcast \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
	@echo ">>> Updating merkle root..."
	cd scripts && tsx update-merkle.ts
	@echo ">>> Deploy complete. Frontend deployments.json written."

# Start Vite dev server
dev:
	cd frontend && pnpm dev

clean:
	rm -rf circuits/build circuits/node_modules
	rm -rf contracts/out contracts/cache contracts/broadcast
	rm -rf frontend/dist frontend/node_modules
	rm -rf scripts/node_modules

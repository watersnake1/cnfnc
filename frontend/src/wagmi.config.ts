import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";
import deployments from "./deployments.json";

// Chain is derived from deployments.json so it automatically follows whichever
// network was last deployed to — no manual env var switching needed.
const chain  = deployments.chainId === sepolia.id ? sepolia : anvil;
const rpcUrl = chain.id === sepolia.id
  ? import.meta.env.VITE_SEPOLIA_RPC_URL
  : "http://127.0.0.1:8545";

export const wagmiConfig = getDefaultConfig({
  appName: "NFT Ownership Prover",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "cnfnc-dev",
  chains: [chain],
  transports: {
    [chain.id]: http(rpcUrl),
  },
  ssr: false,
});

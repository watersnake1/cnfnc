import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";

const isSepolia = import.meta.env.VITE_CHAIN === "sepolia";
const chain     = isSepolia ? sepolia : anvil;
const rpcUrl    = isSepolia
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

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { anvil } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "NFT Ownership Prover",
  projectId: "cnfnc-dev",
  chains: [anvil],
  transports: {
    // Force all RPC through local anvil — without this, getDefaultConfig routes
    // receipt polling through WalletConnect's public infra, which never sees
    // transactions on a local chain.
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
  ssr: false,
});

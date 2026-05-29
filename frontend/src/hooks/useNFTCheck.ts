import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { ERC721ABI } from "../abis/ERC721";

export function useNFTCheck(wallet: Address | undefined, collection: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: collection,
    abi:     ERC721ABI,
    functionName: "balanceOf",
    args:    wallet ? [wallet] : undefined,
    query:   { enabled: !!wallet && !!collection },
  });

  return {
    balance:  data ?? 0n,
    hasNFT:   (data ?? 0n) > 0n,
    isLoading,
    error,
  };
}

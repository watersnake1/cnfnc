import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { MockNFTABI } from "../abis/MockNFT";
import deployments from "../deployments.json";

export function useNFTCheck(address: Address | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: deployments.mockNFT as Address,
    abi:     MockNFTABI,
    functionName: "balanceOf",
    args:    address ? [address] : undefined,
    query:   { enabled: !!address },
  });

  return {
    balance:  data ?? 0n,
    hasNFT:   (data ?? 0n) > 0n,
    isLoading,
    error,
  };
}

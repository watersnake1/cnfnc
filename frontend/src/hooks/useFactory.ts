import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useCallback, useState } from "react";
import { isAddress, type Address } from "viem";
import { NFTProverFactoryABI } from "../abis/NFTProverFactory";
import { ERC721ABI } from "../abis/ERC721";
import deployments from "../deployments.json";

export interface FactoryDeployment {
  nftCollection:   Address;
  nftProver:       Address;
  badgeNFT:        Address;
  deployer:        Address;
  deployedAtBlock: bigint;
}

const FACTORY = deployments.factory as Address;

export function useDeployments() {
  return useReadContract({
    address:      FACTORY,
    abi:          NFTProverFactoryABI,
    functionName: "getDeployments",
    query:        { refetchInterval: 15_000 },
  });
}

export function useCollectionToProver(collection: Address | undefined) {
  return useReadContract({
    address:      FACTORY,
    abi:          NFTProverFactoryABI,
    functionName: "collectionToProver",
    args:         collection ? [collection] : undefined,
    query:        { enabled: isAddress(collection ?? "") },
  });
}

export function useCollectionInfo(collection: Address | undefined) {
  const enabled = isAddress(collection ?? "");
  const { data: name }   = useReadContract({ address: collection, abi: ERC721ABI, functionName: "name",   query: { enabled } });
  const { data: symbol } = useReadContract({ address: collection, abi: ERC721ABI, functionName: "symbol", query: { enabled } });
  const { data: isERC721 } = useReadContract({
    address:      collection,
    abi:          ERC721ABI,
    functionName: "supportsInterface",
    args:         ["0x80ac58cd"],
    query:        { enabled },
  });
  return { name: name as string | undefined, symbol: symbol as string | undefined, isERC721: isERC721 as boolean | undefined };
}

export function useDeployProver() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deploy = useCallback(async (collection: Address): Promise<{ prover: Address; badge: Address } | null> => {
    if (!publicClient) return null;
    setIsPending(true);
    setError(null);
    try {
      await publicClient.simulateContract({
        address:      FACTORY,
        abi:          NFTProverFactoryABI,
        functionName: "deployProver",
        args:         [collection],
      });
      const hash = await writeContractAsync({
        address:      FACTORY,
        abi:          NFTProverFactoryABI,
        functionName: "deployProver",
        args:         [collection],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") throw new Error("Transaction reverted");
      return { prover: "0x" as Address, badge: "0x" as Address };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsPending(false);
    }
  }, [writeContractAsync, publicClient]);

  return { deploy, isPending, error };
}

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { type Address } from "viem";
import { generateProof, toContractArgs, type GrothProof } from "../lib/prover";
import { getMerkleProof, getMerkleRoot } from "../lib/merkle";
import { nullifierHash } from "../lib/poseidon";
import { NFTProverABI } from "../abis/NFTProver";

export type ProverStep =
  | "idle"
  | "generating"
  | "ready"
  | "confirming"
  | "mining"
  | "done"
  | "error";

export function useProver(proverAddress: Address | undefined) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [step,    setStep]    = useState<ProverStep>("idle");
  const [error,   setError]   = useState<string | null>(null);
  const [proof,   setProof]   = useState<GrothProof | null>(null);
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [txHash,  setTxHash]  = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync } = useWriteContract();

  const generateAndStoreProof = useCallback(
    async (walletBAddress: Address, collection: Address) => {
      if (!address) return;
      setStep("generating");
      setError(null);

      try {
        const walletAField = BigInt(address);
        const walletBField = BigInt(walletBAddress);

        const [{ path, indices }, merkleRoot, nullifier] = await Promise.all([
          getMerkleProof(address, collection),
          getMerkleRoot(collection),
          nullifierHash(walletAField),
        ]);

        const generated = await generateProof({
          wallet_a:       walletAField,
          merkle_path:    path,
          merkle_indices: indices,
          wallet_b:       walletBField,
          merkle_root:    merkleRoot,
          nullifier_hash: nullifier,
        });

        setProof(generated);
        setStep("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    },
    [address]
  );

  const mintBadge = useCallback(async (collection: Address) => {
    if (!proof || !address || !publicClient || !proverAddress) return;
    setError(null);

    try {
      const onChainRoot = await publicClient.readContract({
        address:      proverAddress,
        abi:          NFTProverABI,
        functionName: "merkleRoot",
      }) as bigint;
      const localRoot = await getMerkleRoot(collection);
      if (onChainRoot !== localRoot) {
        throw new Error(
          `On-chain merkle root does not match local tree for this collection. ` +
          `Run: tsx scripts/update-merkle.ts`
        );
      }

      const { pA, pB, pC, pubSignals } = toContractArgs(proof);
      const mintArgs = [
        pA         as [bigint, bigint],
        pB         as [[bigint, bigint], [bigint, bigint]],
        pC         as [bigint, bigint],
        pubSignals as [bigint, bigint, bigint],
      ] as const;

      await publicClient.simulateContract({
        address:      proverAddress,
        abi:          NFTProverABI,
        functionName: "mint",
        args:         mintArgs,
        account:      address as Address,
      });

      setStep("confirming");
      const hash = await writeContractAsync({
        address:      proverAddress,
        abi:          NFTProverABI,
        functionName: "mint",
        args:         mintArgs,
      });

      setTxHash(hash);
      setStep("mining");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(undefined);
      if (receipt.status === "reverted") {
        setError("Transaction reverted — proof may be invalid or nullifier already used.");
        setStep("error");
      } else {
        setTokenId(0n);
        setStep("done");
      }
    } catch (err) {
      setTxHash(undefined);
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [proof, address, writeContractAsync, publicClient, proverAddress]);

  const cancelMint = useCallback(() => {
    setStep("ready");
    setError(null);
    setTxHash(undefined);
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setProof(null);
    setTokenId(null);
    setTxHash(undefined);
  }, []);

  return { step, error, proof, tokenId, txHash, generateAndStoreProof, mintBadge, cancelMint, reset };
}

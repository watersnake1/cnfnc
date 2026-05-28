import { useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { type Address } from "viem";
import { generateProof, toContractArgs, type GrothProof } from "../lib/prover";
import { getMerkleProof, getMerkleRoot } from "../lib/merkle";
import { nullifierHash } from "../lib/poseidon";
import { NFTProverABI } from "../abis/NFTProver";
import deployments from "../deployments.json";

export type ProverStep =
  | "idle"
  | "generating"
  | "ready"          // proof generated, waiting to connect wallet_B
  | "confirming"     // waiting for wallet popup approval
  | "mining"         // tx submitted, waiting for on-chain confirmation
  | "done"
  | "error";

export function useProver() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [step,    setStep]    = useState<ProverStep>("idle");
  const [error,   setError]   = useState<string | null>(null);
  const [proof,   setProof]   = useState<GrothProof | null>(null);
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [txHash,  setTxHash]  = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync } = useWriteContract();

  const generateAndStoreProof = useCallback(
    async (walletBAddress: Address) => {
      if (!address) return;
      setStep("generating");
      setError(null);

      try {
        const walletAField = BigInt(address);
        const walletBField = BigInt(walletBAddress);

        const [{ path, indices }, merkleRoot, nullifier] = await Promise.all([
          getMerkleProof(address),
          getMerkleRoot(),
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

  const mintBadge = useCallback(async () => {
    if (!proof || !address || !publicClient) return;
    setError(null);

    try {
      // Pre-flight 1: verify on-chain merkle root matches the tree used to generate the proof
      const onChainRoot = await publicClient.readContract({
        address:      deployments.nftProver as Address,
        abi:          NFTProverABI,
        functionName: "merkleRoot",
      }) as bigint;
      const localRoot = await getMerkleRoot();
      if (onChainRoot !== localRoot) {
        throw new Error(
          `On-chain merkle root (${onChainRoot}) does not match merkle.json (${localRoot}). ` +
          `Run: tsx scripts/update-merkle.ts`
        );
      }

      // Pre-flight 2: simulate the call so any revert (InvalidProof, NullifierAlreadyUsed…)
      // surfaces as a readable error before the wallet popup ever opens.
      const { pA, pB, pC, pubSignals } = toContractArgs(proof);
      const mintArgs = [
        pA         as [bigint, bigint],
        pB         as [[bigint, bigint], [bigint, bigint]],
        pC         as [bigint, bigint],
        pubSignals as [bigint, bigint, bigint],
      ] as const;

      await publicClient.simulateContract({
        address:      deployments.nftProver as Address,
        abi:          NFTProverABI,
        functionName: "mint",
        args:         mintArgs,
        account:      address as Address,
      });

      setStep("confirming");
      const hash = await writeContractAsync({
        address:      deployments.nftProver as Address,
        abi:          NFTProverABI,
        functionName: "mint",
        args:         mintArgs,
      });

      setTxHash(hash);
      setStep("mining");

      // Await the receipt directly — no hook needed. The ProverFlow component stays
      // mounted (CSS display:none on the tab) so this callback is never dropped.
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(undefined);
      if (receipt.status === "reverted") {
        setError("Transaction reverted — proof may be invalid or nullifier already used.");
        setStep("error");
      } else {
        setTokenId(receipt.logs.length > 0 ? 0n : 0n);
        setStep("done");
      }
    } catch (err) {
      setTxHash(undefined);
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [proof, address, writeContractAsync, publicClient]);

  const cancelMint = useCallback(() => {
    // Back to connect-B without losing the proof — no need to regenerate
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

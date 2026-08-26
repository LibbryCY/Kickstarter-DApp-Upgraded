import { useState } from "react";
import { ethers } from "ethers";

export function useCampaignActions(
  contract: ethers.Contract | null,
  campaignId: number,
  onComplete: () => void
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function withTx(action: () => Promise<ethers.ContractTransactionResponse>) {
    if (!contract) return;
    setBusy(true);
    setError("");
    try {
      const tx = await action();
      await tx.wait();
      setTimeout(onComplete, 1500);
    } catch (err) {
      console.error(err);
      setError("Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  const vote = (amountEth: string) =>
    withTx(() => contract!.vote(campaignId, { value: ethers.parseEther(amountEth) }));

  const unvote = () => withTx(() => contract!.unvote(campaignId));

  const closeCampaign = () => withTx(() => contract!.creatorOnlyCloseCampaign(campaignId));

  const refund = () => withTx(() => contract!.refund(campaignId));


  return { vote, unvote, closeCampaign, refund, busy, error };
}
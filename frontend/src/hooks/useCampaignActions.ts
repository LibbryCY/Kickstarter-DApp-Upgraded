import { useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

export function useCampaignActions(
  contract: ethers.Contract | null,
  campaignId: number,
  onComplete: () => void
) {
  const [busy, setBusy] = useState(false);
  //const [error, setError] = useState("");

  async function withTx(action: () => Promise<ethers.ContractTransactionResponse>, successMessage: string = "Transaction successful") {
    if (!contract) return;
    setBusy(true);
    const toastId = toast.loading("Confirm the transaction in your wallet...");  //setError("");
    try {
      const tx = await action();
      toast.loading("Waiting for confirmation...", { id: toastId });
      await tx.wait();
      toast.success(successMessage, { id: toastId });

      setTimeout(onComplete, 1500);
    } catch (err) {
      console.error(err);
      const message = "Transaction failed";
      toast.error(message, { id: toastId }); //setError("Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  const vote = (amountEth: string) =>
    withTx(() => contract!.vote(campaignId, { value: ethers.parseEther(amountEth) }));

  const unvote = () => withTx(() => contract!.unvote(campaignId));

  const closeCampaign = () => withTx(() => contract!.creatorOnlyCloseCampaign(campaignId));

  const refund = () => withTx(() => contract!.refund(campaignId));


  return { vote, unvote, closeCampaign, refund, busy };
}
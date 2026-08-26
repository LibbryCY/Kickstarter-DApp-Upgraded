import { useState } from "react";
import { ethers, LogDescription } from "ethers";
import { updateCampaignMetadata } from "../utils/apiCall";

interface Props {
  contract: ethers.Contract | null;
  onClose: () => void;
  onCreated: () => void;
}

const QUICK_AMOUNTS = ["1", "5", "10"];

export function CreateCampaignModal({ contract, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [flexibleFunding, setFlexibleFunding] = useState(false);


  async function handleSubmit() {
    if (!contract) return;
    if (!name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (!ethers.isAddress(beneficiary)) {
      setError("Invalid beneficiary address");
      return;
    }
    if (!threshold || Number(threshold) <= 0) {
      setError("Enter a valid ETH goal");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const tx = await contract.createCampaign(ethers.parseEther(threshold), beneficiary, flexibleFunding);
      const receipt = await tx.wait();

      // Pull the campaignId assigned on-chain from the emitted event
      const parsedEvent = receipt?.logs
        .map((log: ethers.Log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: LogDescription | null) => parsed?.name === "CampaignCreated");

      const campaignId = parsedEvent?.args?.campaignId;

      if (campaignId !== undefined) {
        await updateCampaignMetadata(Number(campaignId), name.trim(), description.trim());
      }

      setTimeout(() => {
        onCreated();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Campaign creation failed");
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>New Campaign</h2>

        <label>Campaign name</label>
        <input
          type="text"
          placeholder="e.g. Solar-Powered Water Pump"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>Description</label>
        <textarea
          placeholder="What is this campaign about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <label>Goal (ETH)</label>
        <input
          type="number"
          placeholder="e.g. 1.5"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          min="0"
          step="0.001"
        />
        <div className="quick-amounts">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`quick-amount-btn ${threshold === amount ? "quick-amount-active" : ""}`}
              onClick={() => setThreshold(amount)}
            >
              {amount} ETH
            </button>
          ))}
        </div>

        <label>Beneficiary address</label>
        <input
          type="text"
          placeholder="0x..."
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
        />

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={flexibleFunding}
            onChange={(e) => setFlexibleFunding(e.target.checked)}
          />
          Flexible funding — release funds at 80%+ even if the goal isn't fully reached
        </label>

        {error && <p className="card-error">{error}</p>}

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="create-btn" onClick={handleSubmit} disabled={busy}>
            {busy ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
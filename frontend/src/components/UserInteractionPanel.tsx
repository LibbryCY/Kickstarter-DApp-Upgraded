import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { JsonRpcApiProvider } from "ethers";
import "../styles/UserInteractionPanel.css";
import { getAllCampaigns } from "../utils/apiCall";

interface UserInteractionProps {
  contract: ethers.Contract | null;
  address: string;
  provider: JsonRpcApiProvider | null;
  setCampaigns: (campaigns: any[]) => void;
  isConnected: boolean;
}

const UserInteraction: React.FC<UserInteractionProps> = ({
  contract,
  address,
  setCampaigns,
  isConnected,
}) => {
  const [amount, setAmount] = useState("0.1");
  const [campaignIdVote, setCampaignIdVote] = useState(1);
  const [campaignIdClose, setCampaignIdClose] = useState(1);
  const [threshold, setThreshold] = useState("0");
  const [beneficiary, setBeneficiary] = useState("");
  const [fundsToClaim, setFundsToClaim] = useState("0");

  const getFundsToClaim = async () => {
    try {
      if (!contract) {
        console.warn("Contract not initialized yet.");
        return;
      }
      const funds = await contract?.getFundsToClaim();
      console.log("Funds to claim:", funds);
      setFundsToClaim(funds.toString().trim());
    } catch (error) {
      console.error("Error getFundsToClaim:", error);
    }
  };

  useEffect(() => {
    const fetchFundsToClaim = async () => {
      await getFundsToClaim();
    };
    fetchFundsToClaim();
  }, [contract]);

  const handleVote = async () => {
    if (!isConnected) return;

    if (!amount || !campaignIdVote) {
      alert("Please enter a valid amount and campaign ID");
      return;
    }

    try {
      const tx = await contract?.vote(campaignIdVote, {
        value: ethers.parseEther(amount),
      });
      await tx.wait();

      const response = await getAllCampaigns();
      setCampaigns(response);
      console.log("Vote successful:", tx);
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleUnvote = async () => {
    if (!isConnected) return;

    if (!amount || !campaignIdVote) {
      alert("Please enter a valid amount and campaign ID");
      return;
    }

    try {
      const tx = await contract?.unvote(campaignIdVote);
      await tx.wait();

      const response = await getAllCampaigns();
      setCampaigns(response);
      console.log("Unvote successful:", tx);
    } catch (error) {
      console.error("Error unvoting:", error);
    }
  };

  const handleCreateCampaign = async () => {
    if (!isConnected) return;

    if (!beneficiary) {
      alert("Please enter a beneficiary address");
      return;
    }
    if (!threshold) {
      alert("Please enter a threshold amount");
      return;
    }

    try {
      const tx = await contract?.createCampaign(threshold, beneficiary);
      await tx.wait();

      const response = await getAllCampaigns();
      setCampaigns(response);
      console.log("Campaign created successfully:", tx);
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  const handleCloseCampaign = async () => {
    if (!isConnected) return;

    if (!campaignIdClose) {
      alert("Please enter a campaign ID");
      return;
    }

    try {
      const tx = await contract?.creatorOnlyCloseCampaign(campaignIdClose);
      await tx.wait();

      const response = await getAllCampaigns();
      setCampaigns(response);
      await getFundsToClaim();
      console.log("Campaign closed successfully:", tx);
    } catch (error) {
      console.error("Error closing campaign:", error);
    }
  };

  async function handleClaimFunds() {
    if (!isConnected) return;

    try {
      const tx = await contract?.claimFunds();
      await tx.wait();

      const response = await getAllCampaigns();
      setCampaigns(response);

      await getFundsToClaim();
      console.log("Funds claimed newFundsToClaim:", fundsToClaim);
      console.log("Funds claimed tx:", tx);
    } catch (error) {
      console.error("Error claiming funds:", error);
    }
  }

  return (
    <div className="user-interaction">
      <h2>User Actions</h2>
      <div className="action-section">
        <h3>Create Campaign</h3>
        <input
          type="text"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Target ETH Wei Amount"
        />
        <input
          type="text"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="Beneficiary Address"
        />
        <button onClick={handleCreateCampaign}>Create Campaign</button>
      </div>

      <div className="action-section">
        <h3>Vote/Unvote</h3>
        <input
          type="number"
          value={campaignIdVote}
          onChange={(e) => setCampaignIdVote(Number(e.target.value))}
          placeholder="Campaign ID"
        />
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="ETH Amount"
        />
        <button onClick={handleVote}>Vote</button>
        <button onClick={handleUnvote}>Unvote</button>
      </div>

      <div className="action-section">
        <h3>Close Campaign</h3>
        <input
          value={campaignIdClose}
          onChange={(e) => setCampaignIdClose(Number(e.target.value))}
          placeholder="Campaign ID"
        />
        <button onClick={handleCloseCampaign}>Close Campaign</button>
      </div>
      {address == import.meta.env.VITE_CONTRACT_OWNER && (
        <div className="action-section">
          <h3>Claim Funds</h3>
          <p>{fundsToClaim} Wei</p>
          <button
            onClick={handleClaimFunds}
            disabled={fundsToClaim === "0".trim()}
            className={`px-4 py-2 rounded text-white ${
              fundsToClaim === "0"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Claim Funds
          </button>
        </div>
      )}
    </div>
  );
};

export default UserInteraction;

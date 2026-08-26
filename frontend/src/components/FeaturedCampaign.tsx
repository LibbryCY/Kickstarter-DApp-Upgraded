import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { Campaign } from "./CampainCard";

export function FeaturedCampaign({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const balanceEth = ethers.formatEther(campaign.balance);
  const thresholdEth = ethers.formatEther(campaign.threshold);
  const progress = Math.min((Number(campaign.balance) / Number(campaign.threshold)) * 100, 100);

  return (
    <div className="featured-banner" onClick={() => navigate(`/campaign/${campaign.id}`)}>
      <span className="featured-label">🏆 Your top campaign</span>
      <h3>{campaign.name?.trim() || `Campaign #${campaign.id}`}</h3>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="campaign-numbers">
        <strong>{balanceEth} ETH</strong> raised of {thresholdEth} ETH goal
      </p>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

export interface Campaign {
  id: number;
  creator: string;
  threshold: string;
  balance: string;
  beneficiary: string;
  numberOfVotes: number;
  closed: boolean;
  name?: string;
  description?: string;
  goalReached: boolean;
  flexibleFunding: boolean;
}

interface Props {
  campaign: Campaign;
  myContribution?: string; // wei, opciono samo u "My Contributions" tabu
}

export function CampaignCard({ campaign , myContribution}: Props) {
  const navigate = useNavigate();

  const balanceEth = ethers.formatEther(campaign.balance);
  const thresholdEth = ethers.formatEther(campaign.threshold);
  const progress = Math.min((Number(campaign.balance) / Number(campaign.threshold)) * 100, 100);

  const title = campaign.name?.trim() || `Campaign #${campaign.id}`;
  const snippet = campaign.description?.trim()
    ? campaign.description.length > 90
      ? campaign.description.slice(0, 90) + "..."
      : campaign.description
    : "No description provided.";

  return (
    <div className="campaign-card" onClick={() => navigate(`/campaign/${campaign.id}`)}>
      <div className="campaign-card-top">
        <span className="campaign-id">#{campaign.id}</span>
        <span className={`status-badge ${campaign.closed ? "status-closed" : "status-active"}`}>
          {campaign.closed ? "Closed" : "Active"}
        </span>
      </div>

      <h3 className="campaign-title">{title}</h3>
      <p className="campaign-snippet">{snippet}</p>

      <div className="campaign-stats">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="campaign-numbers">
          <strong>{balanceEth} ETH</strong>
          <span> / {thresholdEth} ETH goal</span>
        </div>
      </div>

      <p className="campaign-votes">🗳 {campaign.numberOfVotes} votes</p>

      {myContribution && (
        <p className="my-contribution-badge">
           You contributed: {ethers.formatEther(myContribution)} ETH
        </p>
      )}
    </div>
  );
}
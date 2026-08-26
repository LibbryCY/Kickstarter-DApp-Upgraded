import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { getCampaignById } from "../utils/apiCall";
import { useCampaignActions } from "../hooks/useCampaignActions";
import { Campaign } from "../components/CampainCard";
import "../styles/CampaignDetails.css";

export function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contract, address } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteAmount, setVoteAmount] = useState("");

  async function loadCampaign() {
    if (!id) return;
    try {
      const data = await getCampaignById(Number(id));
      setCampaign(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const { vote, unvote, closeCampaign, refund, busy, error } = useCampaignActions(
    contract,
    Number(id),
    loadCampaign
  );

  const [copied, setCopied] = useState(false);

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="loading-text">Loading campaign...</p>;
  if (!campaign) return <p className="loading-text">Campaign not found.</p>;

  const balanceEth = ethers.formatEther(campaign.balance);
  const thresholdEth = ethers.formatEther(campaign.threshold);
  const progress = Math.min((Number(campaign.balance) / Number(campaign.threshold)) * 100, 100);
  const isCreator = campaign.creator.toLowerCase() === address.toLowerCase();
  const title = campaign.name?.trim() || `Campaign #${campaign.id}`;

  return (
    <div className="details-page">
      <button className="back-btn" onClick={() => navigate("/home")}>
        ← Back to campaigns
      </button>

      <div className="details-card">
        <div className="details-top">
          <span className={`status-badge ${campaign.closed ? "status-closed" : "status-active"}`}>
            {campaign.closed ? "Closed" : "Active"}
          </span>
          

          <span className="campaign-id">
            #{campaign.id}
            </span>
          
        </div>

        {campaign.flexibleFunding && !campaign.closed && (
          <span className="flexible-badge">Flexible funding enabled</span>
        )}

        <h1>{title}</h1>
        <p className="details-description">
          {campaign.description?.trim() || "No description provided."}
        </p>

        <div className="details-stats">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="campaign-numbers">
            <strong>{balanceEth} ETH</strong> raised of <strong>{thresholdEth} ETH</strong> goal
          </div>
        </div>

        <div className="details-meta">
          <p> <strong className="to-bold">Creator: </strong> {campaign.creator}</p>
          <p> <strong className="to-bold">Beneficiary: </strong> {campaign.beneficiary}</p>
          <h4> <strong className="to-bold ">{campaign.numberOfVotes} </strong> votes</h4>
          
          
        </div>

      
        {!campaign.closed ? (
          <div className="details-actions">
            {
              (
                <div className="details-actions">
                  <input
                    type="number"
                    placeholder="ETH amount"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    disabled={busy}
                    min="0"
                    step="0.001"
                  />
                  <div className="details-action-buttons">
                    <button
                      className="vote-btn"
                      disabled={busy || !contract || !voteAmount}
                      onClick={() => vote(voteAmount)}
                    >
                      Vote
                    </button>
                    <button className="unvote-btn" disabled={busy || !contract} onClick={unvote}>
                      Unvote
                    </button>
                  </div>
                  {isCreator && (
                    <button className="close-btn" disabled={busy} onClick={closeCampaign}>
                      Close campaign
                    </button>
                  )}

                  <div className="details-action-buttons">
                    <button className="share-btn" onClick={handleShare}>
                      {copied ? "✓ Copied" : " Share"}
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        ) : campaign.goalReached ? (
          <p className="outcome-success">🎉 Goal reached — funds were sent to the beneficiary.</p>
        ) : (
          <div className="details-actions">
            <p className="outcome-failed">
               Goal wasn't reached. If you contributed, you can claim a refund below.
            </p>
            <button className="unvote-btn" disabled={busy || isCreator} onClick={refund}>
              Claim refund
            </button>
          </div>
        )}


        {error && <p className="card-error">{error}</p>}
      </div>
    </div>
  );
}
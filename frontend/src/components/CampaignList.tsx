import React from "react";
import "../styles/CampaignList.css";

export interface Campaign {
  id: number;
  creator: string;
  threshold: string;
  balance: number;
  beneficiary: string;
  numberOfVotes: number;
  closed: boolean;
}

interface CampaignListProps {
  campaigns: Campaign[];
}

const CampaignList: React.FC<CampaignListProps> = ({ campaigns }) => {
  return (
    <div className="campaignlist-container">
      <ul className="campaign-list">
        {campaigns.length === 0 && <p>No campaigns available.</p>}
        {campaigns.length > 0 &&
          campaigns.map((campaign) => (
            <li
              className="campaign-card"
              key={campaign.id}
              style={{
                marginBottom: "1rem",
                border: "1px solid #ccc",
                padding: "1rem",
              }}
            >
              <p>
                <strong>ID:</strong> {campaign.id}
              </p>
              <p>
                <strong>Creator:</strong> {campaign.creator}
              </p>
              <p>
                <strong>Threshold:</strong> {campaign.threshold} wei
              </p>
              <p>
                <strong>Balance:</strong> {campaign.balance} wei
              </p>
              <p>
                <strong>Beneficiary:</strong> {campaign.beneficiary}
              </p>
              <p>
                <strong>Number of Votes:</strong> {campaign.numberOfVotes}
              </p>
              <p>
                <strong>Status:</strong> {campaign.closed ? "Closed" : "Open"}
                {campaign.closed ? (
                  <span
                    className="span1"
                    data-status={campaign.closed ? "Closed" : "Open"}
                  ></span>
                ) : (
                  <span
                    className="span2"
                    data-status={campaign.closed ? "Closed" : "Open"}
                  ></span>
                )}
              </p>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default CampaignList;

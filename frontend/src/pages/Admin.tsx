/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { getAllCampaigns, getAllUsers, getStatistics } from "../utils/apiCall";
import "../styles/Admin.css";

type AdminTab = "stats" | "campaigns" | "users";

export function Admin() {
  const { contract, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("stats");

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [claimableWei, setClaimableWei] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadAll() {
    const [campaignData, userData, statsData] = await Promise.all([
      getAllCampaigns(),
      getAllUsers(),
      getStatistics(),
    ]);
    setCampaigns(campaignData);
    setUsers(userData);
    setStats(statsData);

    if (contract) {
      const claimable = await contract.getFundsToClaim();
      setClaimableWei(claimable);
    }
  }

  useEffect(() => {
    loadAll();
  }, [contract]);

  async function handleClaimFunds() {
    if (!contract) return;
    setBusy(true);
    setError("");
    try {
      const tx = await contract.claimFunds();
      await tx.wait();
      await loadAll();
    } catch (err: any) {
      console.error(err);
      setError(err?.reason || err?.message || "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="home-header">
        <h1>Admin Panel</h1>
        <div className="header-right">
          <button className="logout-btn" onClick={() => navigate("/home")}>
            Back to app
          </button>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab-btn ${tab === "stats" ? "tab-active" : ""}`} onClick={() => setTab("stats")}>
          Statistics
        </button>
        <button className={`tab-btn ${tab === "campaigns" ? "tab-active" : ""}`} onClick={() => setTab("campaigns")}>
          All Campaigns
        </button>
        <button className={`tab-btn ${tab === "users" ? "tab-active" : ""}`} onClick={() => setTab("users")}>
          All Users
        </button>
      </div>

      {tab === "stats" && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Campaigns</span>
            <span className="stat-value">{stats.totalCampaigns}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active</span>
            <span className="stat-value">{stats.activeCampaigns}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Successful</span>
            <span className="stat-value">{stats.successfulCampaigns}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Failed</span>
            <span className="stat-value">{stats.failedCampaigns}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Unique Contributors</span>
            <span className="stat-value">{stats.uniqueContributors}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Raised (successful)</span>
            <span className="stat-value">{ethers.formatEther(stats.totalRaisedWei)} ETH</span>
          </div>
          <div className="stat-card claim-card">
            <span className="stat-label">Platform Fees Available</span>
            <span className="stat-value">{ethers.formatEther(claimableWei)} ETH</span>
            <button className="create-btn" onClick={handleClaimFunds} disabled={busy || claimableWei === 0n}>
              {busy ? "Claiming..." : "Claim Funds"}
            </button>
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Creator</th>
              <th>Goal</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/campaign/${c.id}`)}>
                <td>#{c.id}</td>
                <td>{c.name || "—"}</td>
                <td>{c.creator.slice(0, 6)}...{c.creator.slice(-4)}</td>
                <td>{ethers.formatEther(c.threshold)} ETH</td>
                <td>{ethers.formatEther(c.balance)} ETH</td>
                <td>{c.closed ? (c.goalReached ? "Success" : "Failed") : "Active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "users" && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.address}>
                <td>{u.address}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="card-error">{error}</p>}
    </div>
  );
}
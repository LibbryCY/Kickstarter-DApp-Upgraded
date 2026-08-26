import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAllCampaigns, getMyContributions } from "../utils/apiCall";
import { CampaignCard, Campaign } from "../components/CampainCard";
import { FeaturedCampaign } from "../components/FeaturedCampaign";
import { CreateCampaignModal } from "../components/CreateCampaignModal";
import "../styles/Home.css";
import { useNavigate } from "react-router-dom";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 6;

type Tab = "all" | "mine" | "contributions";
type StatusFilter = "all" | "active" | "closed";
type SortOption = "newest" | "oldest" | "progress" | "contribution";

interface ContributionEntry {
  campaign: Campaign;
  myContribution: string;
}

export function Home() {
  const { address, contract, isOwner, logout } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contributions, setContributions] = useState<ContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [tab, setTab] = useState<Tab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const [page, setPage] = useState(1);


  async function refreshAll() {
    try {
      const [campaignData, contributionData] = await Promise.all([
        getAllCampaigns(),
        getMyContributions(address),
      ]);
      setCampaigns(campaignData);
      setContributions(contributionData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (address) refreshAll();
  }, [address]);


  const myCampaigns = useMemo(
    () => campaigns.filter((c) => c.creator.toLowerCase() === address.toLowerCase()),
    [campaigns, address]
  );

  const topOwnCampaign = useMemo(() => {
    if (myCampaigns.length === 0) return null;
    return [...myCampaigns].sort((a, b) => Number(b.balance) - Number(a.balance))[0];
  }, [myCampaigns]);

  const matchesSearch = (name: string | undefined, id: number) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (name || "").toLowerCase().includes(query) || String(id).includes(query);
  };

  const visibleCampaigns = useMemo(() => {
    const source = tab === "mine" ? myCampaigns : campaigns;
    let result = source.filter((c) => matchesSearch(c.name, c.id));

    if (statusFilter === "active") result = result.filter((c) => !c.closed);
    else if (statusFilter === "closed") result = result.filter((c) => c.closed);

    if (sortBy === "newest") result.sort((a, b) => b.id - a.id);
    else if (sortBy === "oldest") result.sort((a, b) => a.id - b.id);
    else if (sortBy === "progress") {
      result.sort((a, b) => Number(b.balance) / Number(b.threshold) - Number(a.balance) / Number(a.threshold));
    }

    return result;
  }, [campaigns, myCampaigns, tab, statusFilter, sortBy, search]);

  const visibleContributions = useMemo(() => {
    let result = contributions.filter((c) => c.campaign && matchesSearch(c.campaign.name, c.campaign.id));

    if (statusFilter === "active") result = result.filter((c) => !c.campaign.closed);
    else if (statusFilter === "closed") result = result.filter((c) => c.campaign.closed);

    if (sortBy === "newest") result.sort((a, b) => b.campaign.id - a.campaign.id);
    else if (sortBy === "oldest") result.sort((a, b) => a.campaign.id - b.campaign.id);
    else if (sortBy === "contribution") {
      result.sort((a, b) => Number(b.myContribution) - Number(a.myContribution));
    }

    return result;
  }, [contributions, statusFilter, sortBy, search]);


   // Pagination
   useEffect(() => {
    setPage(1);
  }, [tab, statusFilter, sortBy, search]);
  
  const paginatedCampaigns = useMemo(
    () => visibleCampaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleCampaigns, page]
  );

  const campaignTotalPages = Math.max(1, Math.ceil(visibleCampaigns.length / PAGE_SIZE));

  const paginatedContributions = useMemo(
    () => visibleContributions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleContributions, page]
  );
  const contributionTotalPages = Math.max(1, Math.ceil(visibleContributions.length / PAGE_SIZE));

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Kickstarter DApp</h1>
        <div className="header-right">
        {isOwner && (
          <button className="logout-btn" onClick={() => navigate("/admin")}>
            Admin Panel
          </button>
        )}
          <span className="address-pill">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="home-toolbar">
        <div className="tabs">
          <button className={`tab-btn ${tab === "all" ? "tab-active" : ""}`} onClick={() => setTab("all")}>
            All Campaigns
          </button>
          <button className={`tab-btn ${tab === "mine" ? "tab-active" : ""}`} onClick={() => setTab("mine")}>
            My Campaigns
          </button>
          <button
            className={`tab-btn ${tab === "contributions" ? "tab-active" : ""}`}
            onClick={() => setTab("contributions")}
          >
            My Contributions
          </button>
        </div>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          + New Campaign
        </button>
      </div>

      {tab === "mine" && topOwnCampaign && <FeaturedCampaign campaign={topOwnCampaign} />}

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by campaign name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          {tab !== "contributions" && <option value="progress">Most funded</option>}
          {tab === "contributions" && <option value="contribution">Highest contribution</option>}
        </select>
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : tab === "contributions" ? (
        visibleContributions.length === 0 ? (
          <p className="loading-text">You haven't contributed to any campaigns yet.</p>
        ) : (
          <>
              <div className="campaign-grid">
                {paginatedContributions.map((c) => (
                  <CampaignCard key={c.campaign.id} campaign={c.campaign} myContribution={c.myContribution} />
                ))}
              </div>
              <Pagination currentPage={page} totalPages={contributionTotalPages} onPageChange={setPage} />
          </>
        )
      ) : visibleCampaigns.length === 0 ? (
        <p className="loading-text">
          {tab === "mine" ? "You haven't created any campaigns yet." : "No campaigns match your filters."}
        </p>
      ) : (
        <>
          <div className="campaign-grid">
            {paginatedCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={campaignTotalPages} onPageChange={setPage} />
        </>
      )}

      {showCreateModal && (
        <CreateCampaignModal contract={contract} onClose={() => setShowCreateModal(false)} onCreated={refreshAll} />
      )}
    </div>
  );
}
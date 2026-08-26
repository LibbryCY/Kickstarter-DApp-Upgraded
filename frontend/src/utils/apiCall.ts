import axios from "axios";

export interface Campaign {
    id:number;
    creator: string;
    threshold: string;
    balance: number;
    beneficiary: string;
    numberOfVotes: number;
    closed: boolean;
  }

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
    
  export const getAllCampaigns = async()=>{
    try {
          const response = await axios.get(`${API_URL}/campaign`, {});
          console.log("API Response in apiCall:", response);
          return response?.data
      } catch (err) {
          console.error("API Error:", err);
          return null
      }
  }

  export async function getCampaignById(id: number) {
    try {
      const response = await axios.get(`${API_URL}/campaign/${id}`);
      return response.data;
    } catch (err) {
      console.error("Error fetching campaign:", err);
      throw new Error("Campaign not found");
    }
  }
  
  export async function updateCampaignMetadata(id: number, name: string, description: string) {
    try {
      const response = await axios.patch(`${API_URL}/campaign/${id}/metadata`, {
        name,
        description,
      });
      return response.data;
    } catch (err) {
      console.error("Error updating campaign metadata:", err);
      throw new Error("Failed to save campaign metadata");
    }
  }

  export async function getMyContributions(address: string) {
    const res = await fetch(`${API_URL}/campaign/contributions/mine?address=${address}`);
    if (!res.ok) throw new Error("Failed to load contributions");
    return res.json();
  }


  export async function getStatistics() {
    const res = await fetch(`${API_URL}/campaign/stats/summary`);
    if (!res.ok) throw new Error("Failed to load statistics");
    return res.json();
  }
  
  export async function getAllUsers() {
    const res = await fetch(`${API_URL}/auth/users`);
    if (!res.ok) throw new Error("Failed to load users");
    return res.json();
  }
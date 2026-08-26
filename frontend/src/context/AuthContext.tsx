import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { ABI } from "../utils/abi";

interface AuthContextType {
  provider: ethers.BrowserProvider | null;
  contract: ethers.Contract | null;
  address: string;
  isConnected: boolean;
  isLoggedIn: boolean;
  isOwner: boolean;
  connectAndLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "http://localhost:3000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [address, setAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("jwt"));

  const [isOwner, setIsOwner] = useState(false);

  async function checkOwner(contractInstance: ethers.Contract, userAddress: string) {
    try {
      const ownerAddress: string = await contractInstance.owner();
      setIsOwner(ownerAddress.toLowerCase() === userAddress.toLowerCase());
    } catch (err) {
      console.error("Failed to check contract owner:", err);
    }
  }

  async function connectAndLogin() {
    if (!window.ethereum) {
      alert("Install MetaMask!");
      return;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send("eth_requestAccounts", []);
    const signer = await browserProvider.getSigner();
    const userAddress = await signer.getAddress();

    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
    const contractInstance = new ethers.Contract(contractAddress, ABI, signer);

    checkOwner(contractInstance, userAddress);

    setProvider(browserProvider);
    setAddress(userAddress);
    setContract(contractInstance);
    setIsConnected(true);

    // SIWE login
    const nonceRes = await fetch(`${API_URL}/auth/nonce?address=${userAddress}`);
    const { nonce } = await nonceRes.json();

    const message = `Prijava na Kickstarter DApp. Nonce: ${nonce}`;
    const signature = await signer.signMessage(message);

    const verifyRes = await fetch(`${API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: userAddress, signature }),
    });

    if (!verifyRes.ok) throw new Error("Login neuspešan");

    const { access_token } = await verifyRes.json();
    localStorage.setItem("jwt", access_token);
    localStorage.setItem("address", userAddress);
    setIsLoggedIn(true);
  }

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("address");
    setIsLoggedIn(false);
    setIsConnected(false);
    setAddress("");
    setContract(null);
    setProvider(null);
    setIsOwner(false);
  }

  // Ako je korisnik ranije bio ulogovan (jwt postoji), pokušaj tiho da povežeš wallet ponovo
  useEffect(() => {
    const tryRestoreConnection = async () => {
      const savedJwt = localStorage.getItem("jwt");
      if (!savedJwt || !window.ethereum) return;

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_accounts", []);
      if (accounts.length === 0) return;

      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

      const contractInstance = new ethers.Contract(contractAddress, ABI, signer);
      checkOwner(contractInstance, userAddress);

      setProvider(browserProvider);
      setAddress(userAddress);
      setContract(new ethers.Contract(contractAddress, ABI, signer));
      setIsConnected(true);
    };

    tryRestoreConnection();
  }, []);

  return (
    <AuthContext.Provider
      value={{ provider, contract, address, isConnected, isLoggedIn, isOwner, connectAndLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti unutar AuthProvider-a");
  return ctx;
}
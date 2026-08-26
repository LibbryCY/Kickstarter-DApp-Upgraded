import { useState } from "react";
import { ethers } from "ethers";
import { ABI } from "../utils/abi";

interface Props {
  setProvider: (
    provider: ethers.BrowserProvider | ethers.JsonRpcProvider
  ) => void;
  setContract: (contract: ethers.Contract) => void;
  setAddress: (address: string) => void;
  setIsConnected: (isConnected: boolean) => void;
  setShowConnectForm: (showConnectForm: boolean) => void;
}

const RPC_URL = import.meta.env.VITE_JSON_RPC_URL;
const CONTRACT_ADDR = import.meta.env.VITE_CONTRACT_ADDRESS;
// Test network
const PR_KEY = import.meta.env.VITE_PRIVATE_KEY;

function ConnectWalletForm({
  setProvider,
  setContract,
  setAddress,
  setIsConnected,
  setShowConnectForm,
}: Props) {
  const [privateKey, setPrivateKey] = useState("");

  const handleConnect = async () => {
    try {
      // Kreiranje novčanika koristeći privatni ključ
      const wallet = new ethers.Wallet(privateKey);

      // Povezivanje novčanika sa provajderom
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const walletWithProvider = wallet.connect(provider);

      // Postavljanje providera i adrese u stanje
      setProvider(provider);
      setContract(new ethers.Contract(CONTRACT_ADDR, ABI, walletWithProvider));
      setAddress(wallet.address);

      setIsConnected(true);
      setShowConnectForm(false);
    } catch (error) {
      console.error("Error connecting wallet: ", error);
    }
  };

  return (
    <div>
      <button onClick={handleConnect}>Connect Wallet</button>
    </div>
  );
}

export default ConnectWalletForm;

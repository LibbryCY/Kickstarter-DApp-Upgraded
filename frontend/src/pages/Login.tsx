import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import "../styles/Login.css";

export function Login() {
  const { connectAndLogin, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      await connectAndLogin();
      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Login was unsuccessful. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isLoggedIn) {
    navigate("/home");
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-badge">⛓ Web3 Crowdfunding</div>
        <h1>Kickstarter DApp</h1>
        <p>
         
          Create or support campaigns directly on the blockchain. Connect your wallet to continue.
        </p>
        <button className="connect-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Connecting..." : " Connect Wallet"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
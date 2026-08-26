import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isOwner } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (!isOwner) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
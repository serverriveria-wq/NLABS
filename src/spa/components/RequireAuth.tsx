import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/spa/hooks/useAuth";
import { BrandLoader } from "@/spa/components/BrandLoader";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <BrandLoader />
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
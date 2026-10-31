import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/spa/hooks/useAuth";
import { BrandLoader } from "@/spa/components/BrandLoader";

/** Segundos extra que se mantiene la pantalla de carga (solo la primera vez que abres la app). */
const EXTRA_SPLASH_MS = 2000;
let splashDone = false;

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hold, setHold] = useState(!splashDone);

  useEffect(() => {
    if (loading || !hold) return;
    const t = setTimeout(() => { splashDone = true; setHold(false); }, EXTRA_SPLASH_MS);
    return () => clearTimeout(t);
  }, [loading, hold]);

  if (loading || hold) {
    return (
      <BrandLoader />
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

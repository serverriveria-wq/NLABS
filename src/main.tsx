import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./spa/App";
import "./styles.css";
import { applyTheme, getStoredTheme } from "@/spa/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

applyTheme(getStoredTheme());

// Dynamic favicon from site_settings — non-blocking.
(async () => {
  try {
    const { data } = await supabase
      .from("site_settings" as never)
      .select("favicon_url")
      .eq("id", true)
      .maybeSingle();
    const url = (data as { favicon_url?: string | null } | null)?.favicon_url;
    if (!url) return;
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  } catch {
    /* ignore */
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
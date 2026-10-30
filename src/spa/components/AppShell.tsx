import { useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, Users, UserCircle, FlaskConical, Plus, Menu, LogOut, Search, MoreHorizontal, Link2,
  UserPlus, Trophy, Mail, Megaphone, MessageSquare, Terminal, Newspaper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSiteSettings, useSiteText, gradientStyle } from "@/lib/site-branding";
import { RequireAuth } from "@/spa/components/RequireAuth";
import { NotificationsBell } from "@/spa/components/NotificationsBell";
import { PushGate } from "@/spa/components/PushGate";
import { useMe } from "@/spa/hooks/useMe";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Proyectos", icon: FolderKanban },
  { to: "/account", label: "Perfil", icon: UserCircle },
  { to: "/createcolab", label: "Crear", icon: Plus },
  { to: "/members", label: "Miembros", icon: Users },
  { to: "/notify", label: "Noticias", icon: Newspaper },
  { to: "/linked", label: "Links", icon: Link2 },
  { to: "/shell", label: "Shell", icon: Terminal },
  { to: "/room", label: "Room", icon: MessageSquare },
  { to: "/request", label: "Entrar", icon: UserPlus },
  { to: "/mail", label: "Correo", icon: Mail },
  { to: "/trophies", label: "Trofeos", icon: Trophy },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const site = useSiteSettings();
  const brand = useSiteText("brand.name", "NLabs");
  const tagline = useSiteText("brand.tagline", "Collab Studio");
  const me = useMe();
  const isMember = !!me.data?.profile?.badge_label;
  const items = nav.filter((i) => !(i.to === "/request" && isMember));
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <Link to="/dashboard" onClick={onNavigate} className="mb-4 flex items-center gap-2 px-2">
        {site.data?.logo_url ? (
          <img src={site.data.logo_url} alt="Logo" className="h-9 w-9 rounded-xl object-cover" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">N</div>
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-bold tracking-tight" style={gradientStyle(brand.gradient) ?? undefined}>{brand.text}</span>
          <span className="text-xs text-muted-foreground" style={gradientStyle(tagline.gradient) ?? undefined}>{tagline.text}</span>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border bg-card p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">NLabs · [NLX]</p>
        <p className="mt-1">Plataforma privada para equipos de Geometry Dash.</p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    sessionStorage.removeItem("nlab_admin_gate");
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
        <SidebarContent />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex flex-1 items-center gap-2">
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Buscar proyectos, miembros…"
                className="w-full rounded-lg border bg-secondary/50 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-background" />
            </div>
          </div>
          <NotificationsBell />
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Salir</span>
          </Button>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function ProtectedLayout() {
  return (
    <RequireAuth>
      <PushGate>
        <Shell>
          <Outlet />
        </Shell>
      </PushGate>
    </RequireAuth>
  );
}
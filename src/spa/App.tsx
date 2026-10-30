import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/spa/hooks/useAuth";
import { ProtectedLayout } from "@/spa/components/AppShell";
import IndexRedirect from "@/spa/pages/IndexRedirect";
import AuthPage from "@/spa/pages/Auth";
import NotFound from "@/spa/pages/NotFound";
import Placeholder from "@/spa/pages/Placeholder";
import Dashboard from "@/spa/pages/Dashboard";
import Account from "@/spa/pages/Account";
import Members from "@/spa/pages/Members";
import MembersAll from "@/spa/pages/MembersAll";
import Projects from "@/spa/pages/Projects";
import CreateColab from "@/spa/pages/CreateColab";
import { ProjectByIdPage, ProjectBySlugPage } from "@/spa/pages/ProjectDetail";
import Admin from "@/spa/pages/Admin";
import RoomPage from "@/spa/pages/Room";
import ColabStudio from "@/spa/pages/ColabStudio";
import ArtStudio from "@/spa/pages/ArtStudio";
import MusicStudio from "@/spa/pages/MusicStudio";
import OAuthConsent from "@/spa/pages/OAuthConsent";
import EditProject from "@/spa/pages/EditProject";
import More from "@/spa/pages/More";
import Linked from "@/spa/pages/Linked";
import RequestPage from "@/spa/pages/Request";
import TrophiesPage from "@/spa/pages/Trophies";
import DocsPage from "@/spa/pages/Docs";
import MailPage from "@/spa/pages/Mail";
import NotifyPage from "@/spa/pages/Notify";
import PasswordRecovery from "@/spa/pages/PasswordRecovery";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Routes>
              {/* Public */}
              <Route path="/" element={<IndexRedirect />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/recovery" element={<PasswordRecovery />} />
              <Route path="/oauth/consent" element={<OAuthConsent />} />

              {/* Protected app (con AppShell) */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/account" element={<Account />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectByIdPage />} />
                <Route path="/projects/:id/edit" element={<EditProject />} />
                <Route path="/createcolab" element={<CreateColab />} />
                <Route path="/members" element={<Members />} />
                <Route path="/membersall" element={<MembersAll />} />
                <Route path="/more" element={<More />} />
                <Route path="/linked" element={<Linked />} />
                <Route path="/request" element={<RequestPage />} />
                <Route path="/mail" element={<MailPage />} />
                <Route path="/notify" element={<NotifyPage />} />
                <Route path="/trophies" element={<TrophiesPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/docs/:slug" element={<DocsPage />} />
                <Route path="/shell" element={<Admin />} />
                <Route path="/admin" element={<Navigate to="/shell" replace />} />
                <Route path="/labs" element={<Navigate to="/shell" replace />} />
                <Route path="/room" element={<RoomPage />} />
                <Route path="/studio" element={<ColabStudio />} />
                <Route path="/studio/arte" element={<ArtStudio />} />
                <Route path="/studio/musica" element={<MusicStudio />} />
                <Route path="/projects/:id/studio" element={<ColabStudio />} />
                <Route path="/p/:slug" element={<ProjectBySlugPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
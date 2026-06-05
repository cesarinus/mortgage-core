import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Screening from "@/pages/Screening";
import People from "@/pages/contacts/People";
import Companies from "@/pages/contacts/Companies";
import Pipeline from "@/pages/Pipeline";
import SettingsPage from "@/pages/SettingsPage";
import BlogIndex from "@/pages/BlogIndex";
import BlogPost from "@/pages/BlogPost";
import BlogAdmin from "@/pages/BlogAdmin";
import RateDecision from "@/pages/RateDecision";
import Book from "@/pages/Book";
import AdminSocialMedia from "@/pages/AdminSocialMedia";
import Subscribers from "@/pages/Subscribers";
import EmailTemplates from "@/pages/EmailTemplates";
import NotFound from "@/pages/NotFound";
import RecordWorkspace from "@/pages/crm/RecordWorkspace";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalAccept from "@/pages/portal/PortalAccept";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalDocuments from "@/pages/portal/PortalDocuments";
import PortalScenarios from "@/pages/portal/PortalScenarios";
import PortalMessages from "@/pages/portal/PortalMessages";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/book" element={<Book />} />
              <Route path="/portal/login" element={<PortalLogin />} />
              <Route path="/portal/accept" element={<PortalAccept />} />
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="documents" element={<PortalDocuments />} />
                <Route path="scenarios" element={<PortalScenarios />} />
                <Route path="messages" element={<PortalMessages />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/screening" element={<Screening />} />
                <Route path="/contacts" element={<Navigate to="/contacts/people" replace />} />
                <Route path="/contacts/people" element={<People />} />
                <Route path="/contacts/companies" element={<Companies />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/pipeline/kanban" element={<Pipeline />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/blog-admin" element={<BlogAdmin />} />
                <Route path="/rate-decision" element={<RateDecision />} />
                <Route path="/admin/social-media" element={<AdminSocialMedia />} />
                <Route path="/email/subscribers" element={<Subscribers />} />
                <Route path="/email/templates" element={<EmailTemplates />} />
                <Route path="/crm/leads/:id" element={<RecordWorkspace kind="lead" />} />
                <Route path="/crm/contacts/:id" element={<RecordWorkspace kind="contact" />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

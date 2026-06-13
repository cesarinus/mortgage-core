import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/lib/theme";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import People from "@/pages/contacts/People";
import Companies from "@/pages/contacts/Companies";
import Pipeline from "@/pages/Pipeline";
import SettingsPage from "@/pages/SettingsPage";
import SettingsLayout from "@/pages/settings/SettingsLayout";
import ProfileSection from "@/pages/settings/sections/ProfileSection";
import AppearanceSection from "@/pages/settings/sections/AppearanceSection";
import AiAssistantSection from "@/pages/settings/sections/AiAssistantSection";
import CalendarSection from "@/pages/settings/sections/CalendarSection";
import EmailSection from "@/pages/settings/sections/EmailSection";
import ZapierSection from "@/pages/settings/sections/ZapierSection";
import AriveSection from "@/pages/settings/sections/AriveSection";
import ComingSoonSection from "@/pages/settings/sections/ComingSoonSection";
import CrmFieldBuilder from "@/pages/settings/CrmFieldBuilder";
import CrmLayoutDesigner from "@/pages/settings/CrmLayoutDesigner";
import LeadSourcesManager from "@/pages/settings/LeadSourcesManager";
import PipelineStagesManager from "@/pages/settings/PipelineStagesManager";
import NotificationCenter from "@/pages/settings/NotificationCenter";
import ImportArive from "@/pages/settings/ImportArive";
import LosIntegrationLogs from "@/pages/settings/LosIntegrationLogs";
import AriveFieldMappings from "@/pages/settings/AriveFieldMappings";
import AriveExportMappings from "@/pages/settings/AriveExportMappings";
import LosPayloadTester from "@/pages/settings/LosPayloadTester";
import SchemaGapReport from "@/pages/settings/SchemaGapReport";
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
import AskHub from "@/pages/crm/AskHub";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalAccept from "@/pages/portal/PortalAccept";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalDocuments from "@/pages/portal/PortalDocuments";
import PortalScenarios from "@/pages/portal/PortalScenarios";
import PortalMessages from "@/pages/portal/PortalMessages";
import PortalIncome from "@/pages/portal/PortalIncome";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
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
                <Route path="income" element={<PortalIncome />} />
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
                <Route path="/contacts" element={<Navigate to="/contacts/people" replace />} />
                <Route path="/contacts/people" element={<People />} />
                <Route path="/contacts/companies" element={<Companies />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/pipeline/kanban" element={<Pipeline />} />
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="/settings/profile" replace />} />
                  <Route path="profile" element={<ProfileSection />} />
                  <Route path="appearance" element={<AppearanceSection />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="calendar" element={<CalendarSection />} />
                  <Route path="ai-assistant" element={<AiAssistantSection />} />
                  <Route path="digital-twin" element={<ComingSoonSection title="Digital Twin" />} />
                  <Route path="ai-agents" element={<ComingSoonSection title="AI Agents" />} />
                  <Route path="automations" element={<ComingSoonSection title="Automations" />} />
                  <Route path="predictions" element={<ComingSoonSection title="Predictions" />} />
                  <Route path="crm-fields" element={<CrmFieldBuilder />} />
                  <Route path="crm-layout" element={<CrmLayoutDesigner />} />
                  <Route path="loan-settings" element={<ComingSoonSection title="Loan Settings" />} />
                  <Route path="pipeline-stages" element={<PipelineStagesManager />} />
                  <Route path="lead-sources" element={<LeadSourcesManager />} />
                  <Route path="los-mappings" element={<AriveFieldMappings />} />
                  <Route path="arive-export-map" element={<AriveExportMappings />} />
                  <Route path="compliance" element={<ComingSoonSection title="Compliance" />} />
                  <Route path="company" element={<ComingSoonSection title="Company" />} />
                  <Route path="team" element={<ComingSoonSection title="Team" />} />
                  <Route path="billing" element={<ComingSoonSection title="Billing" />} />
                  <Route path="security" element={<ComingSoonSection title="Security" />} />
                  <Route path="integrations/arive" element={<AriveSection />} />
                  <Route path="integrations/twilio" element={<ComingSoonSection title="Twilio" />} />
                  <Route path="integrations/openai" element={<ComingSoonSection title="OpenAI" />} />
                  <Route path="integrations/supabase" element={<ComingSoonSection title="Supabase" />} />
                  <Route path="integrations/zapier" element={<ZapierSection />} />
                  <Route path="integrations/email" element={<EmailSection />} />
                  <Route path="integrations/google" element={<ComingSoonSection title="Google" />} />
                  <Route path="integrations/outlook" element={<ComingSoonSection title="Outlook" />} />
                  <Route path="health" element={<ComingSoonSection title="Health Center" />} />
                  <Route path="los-logs" element={<LosIntegrationLogs />} />
                  <Route path="backups" element={<ComingSoonSection title="Backups" />} />
                  <Route path="import-arive" element={<ImportArive />} />
                  <Route path="los-tester" element={<LosPayloadTester />} />
                  <Route path="los-gap-report" element={<SchemaGapReport />} />
                  <Route path="legacy" element={<SettingsPage />} />
                </Route>
                <Route path="/blog-admin" element={<BlogAdmin />} />
                <Route path="/rate-decision" element={<RateDecision />} />
                <Route path="/admin/social-media" element={<AdminSocialMedia />} />
                <Route path="/email/subscribers" element={<Subscribers />} />
                <Route path="/email/templates" element={<EmailTemplates />} />
                <Route path="/crm/leads/:id" element={<RecordWorkspace kind="lead" />} />
                <Route path="/crm/contacts/:id" element={<RecordWorkspace kind="contact" />} />
                <Route path="/ask" element={<AskHub />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CoursePlayer from "./pages/CoursePlayer";
import Dashboard from "./pages/Dashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import CreateCourse from "./pages/CreateCourse";
import EditCourse from "./pages/EditCourse";
import Wishlist from "./pages/Wishlist";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import BecomeInstructor from "./pages/BecomeInstructor";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import RefRedirect from "./pages/RefRedirect";
import AffiliateLanding from "./pages/affiliate/AffiliateLanding";
import AffiliateShell from "./pages/affiliate/AffiliateShell";
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";
import AffiliateLinks from "./pages/affiliate/AffiliateLinks";
import AffiliateAnalytics from "./pages/affiliate/AffiliateAnalytics";
import AffiliateCommissions from "./pages/affiliate/AffiliateCommissions";
import AffiliatePayouts from "./pages/affiliate/AffiliatePayouts";

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
   const hideNavbar = location.pathname.startsWith("/learn/") || location.pathname.startsWith("/ref/");

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/course/:slug" element={<CourseDetail />} />
        <Route path="/learn/:slug" element={<CoursePlayer />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
        <Route path="/instructor/create-course" element={<CreateCourse />} />
        <Route path="/instructor/edit-course/:courseId" element={<EditCourse />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/become-instructor" element={<BecomeInstructor />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
          <Route path="/ref/:code" element={<RefRedirect />} />
          <Route path="/affiliate" element={<AffiliateLanding />} />
          <Route path="/affiliate" element={<AffiliateShell />}>
          <Route path="dashboard" element={<AffiliateDashboard />} />
          <Route path="links" element={<AffiliateLinks />} />
          <Route path="analytics" element={<AffiliateAnalytics />} />
          <Route path="commissions" element={<AffiliateCommissions />} />
          <Route path="payouts" element={<AffiliatePayouts />} />
         </Route>
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

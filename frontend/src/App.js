import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "./components/ui/sonner";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import PS5Terms from "./pages/PS5Terms";
import PS5Register from "./pages/PS5Register";
import Predict from "./pages/Predict";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Bracket from "./pages/Bracket";
import FAQ from "./pages/FAQ";
import Admin from "./pages/Admin";

function Splash() {
    return (
        <div className="min-h-screen bg-cream flex items-center justify-center">
            <div className="font-heading text-4xl uppercase animate-pulse text-ink">TechnoKick…</div>
        </div>
    );
}

function RequireUser({ children }) {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading) return <Splash />;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
    return children;
}

function RequireAdmin({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Splash />;
    if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace />;
    return children;
}

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
    return null;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <ScrollToTop />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/bracket" element={<Bracket />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/ps5/terms" element={<PS5Terms />} />
                    <Route path="/ps5/register" element={<RequireUser><PS5Register /></RequireUser>} />
                    <Route path="/predict" element={<RequireUser><Predict /></RequireUser>} />
                    <Route path="/dashboard" element={<RequireUser><Dashboard /></RequireUser>} />
                    <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster position="top-center" richColors closeButton />
            </BrowserRouter>
        </AuthProvider>
    );
}

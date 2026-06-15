import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "./Home";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/api";

export default function AdminLogin() {
    const { loginAdmin } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await loginAdmin(email, password);
            navigate("/admin", { replace: true });
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                        <span className="stamp stamp-ink">Committee Access</span>
                        <h1 className="font-heading text-5xl mt-3 uppercase">Admin <span className="text-brick">Console</span></h1>
                    </div>
                    <form onSubmit={submit} className="retro-card p-6 md:p-8 bg-white" data-testid="admin-login-form">                        <div className="space-y-4">
                            <div>
                                <label className="label-retro">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-retro" data-testid="admin-email-input" />
                            </div>
                            <div>
                                <label className="label-retro">Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-retro" data-testid="admin-password-input" />
                            </div>
                            {err && <div className="bg-brick text-white p-3 border-2 border-ink font-bold text-sm" data-testid="admin-login-error">{err} — double-check your full email (e.g. admin@technokick.com) and password.</div>}
                            <button disabled={loading} className="btn-retro btn-ink w-full" data-testid="admin-login-submit">
                                {loading ? "Authenticating…" : "Enter Console →"}
                            </button>
                            <div className="bg-cream border-2 border-ink p-3 font-body text-xs" data-testid="admin-login-hint">
                                Committee access only. Trouble logging in? Contact <a href="mailto:hr@mav-s.com" className="underline font-bold">hr@mav-s.com</a>.
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
}

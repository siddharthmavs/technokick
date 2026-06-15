import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "./Home";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/api";

export default function Login() {
    const { loginUser } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/dashboard";
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            await loginUser(phone.trim(), name.trim(), company.trim());
            navigate(next, { replace: true });
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
                        <span className="stamp stamp-brick">Player Sign-In</span>
                        <h1 className="font-heading text-5xl mt-3 uppercase">Get In <span className="underline-wiggle">The Game</span></h1>
                        <p className="font-body opacity-70 mt-2">No password. Just your phone + name. We'll auto-create your account.</p>
                    </div>

                    <form onSubmit={submit} className="ticket p-6 md:p-8" data-testid="user-login-form">
                        <div className="space-y-4">
                            <div>
                                <label className="label-retro">Phone Number</label>
                                <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-retro" placeholder="9876543210" data-testid="login-phone-input" />
                            </div>
                            <div>
                                <label className="label-retro">Your Name</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} required className="input-retro" placeholder="Rohan K" data-testid="login-name-input" />
                            </div>
                            <div>
                                <label className="label-retro">Company</label>
                                <input value={company} onChange={(e) => setCompany(e.target.value)} required className="input-retro" placeholder="MAV-S / UST / TCS …" data-testid="login-company-input" />
                            </div>
                            {err && <div className="bg-brick text-white p-3 border-2 border-ink font-bold text-sm" data-testid="login-error">{err}</div>}
                            <button disabled={loading} className="btn-retro btn-brick w-full" data-testid="login-submit-btn">
                                {loading ? "Kicking off…" : "Sign In & Play →"}
                            </button>
                        </div>
                    </form>

                    <div className="text-center mt-6">
                        <Link to="/admin/login" className="font-mono text-xs uppercase tracking-widest underline opacity-70 hover:opacity-100" data-testid="admin-login-from-user">Admin? Sign in here</Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

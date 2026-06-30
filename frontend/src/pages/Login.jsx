import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "./Home";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/api";

const validatePhone = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "Phone number is required";
    if (!/^[6-9]\d{9}$/.test(cleaned)) return "Enter a valid 10-digit mobile number";
    return "";
};

const validateName = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Name is required";
    if (trimmed.length < 2) return "Name must be at least 2 characters";
    if (trimmed.length > 60) return "Name is too long";
    if (!/^[A-Za-z][A-Za-z.\s'-]*$/.test(trimmed)) return "Name can only contain letters, spaces, and . ' -";
    return "";
};

const validateCompany = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Company is required";
    if (trimmed.length < 2) return "Company name must be at least 2 characters";
    if (trimmed.length > 80) return "Company name is too long";
    return "";
};

const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
};

export default function Login() {
    const { loginUser, signupUser } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const next = params.get("next") || "/dashboard";

    const [mode, setMode] = useState("login"); // 'login' | 'signup'

    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [fieldErrors, setFieldErrors] = useState({ phone: "", name: "", company: "", password: "", confirmPassword: "" });
    const [touched, setTouched] = useState({ phone: false, name: false, company: false, password: false, confirmPassword: false });

    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const switchMode = (m) => {
        setMode(m);
        setErr("");
        setFieldErrors({ phone: "", name: "", company: "", password: "", confirmPassword: "" });
        setTouched({ phone: false, name: false, company: false, password: false, confirmPassword: false });
    };

    const handlePhoneChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
        setPhone(digitsOnly);
        if (touched.phone) setFieldErrors((prev) => ({ ...prev, phone: validatePhone(digitsOnly) }));
    };

    const handleNameChange = (e) => {
        const value = e.target.value;
        setName(value);
        if (touched.name) setFieldErrors((prev) => ({ ...prev, name: validateName(value) }));
    };

    const handleCompanyChange = (e) => {
        const value = e.target.value;
        setCompany(value);
        if (touched.company) setFieldErrors((prev) => ({ ...prev, company: validateCompany(value) }));
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (touched.password) setFieldErrors((prev) => ({ ...prev, password: validatePassword(value) }));
        if (mode === "signup" && touched.confirmPassword) {
            setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmPassword !== value ? "Passwords don't match" : "" }));
        }
    };

    const handleConfirmPasswordChange = (e) => {
        const value = e.target.value;
        setConfirmPassword(value);
        if (touched.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: value !== password ? "Passwords don't match" : "" }));
    };

    const handleBlur = (field, value, validator) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setFieldErrors((prev) => ({ ...prev, [field]: validator(value) }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setErr("");

        const errors = {
            phone: validatePhone(phone),
            password: validatePassword(password),
            name: mode === "signup" ? validateName(name) : "",
            company: mode === "signup" ? validateCompany(company) : "",
            confirmPassword: mode === "signup" ? (confirmPassword !== password ? "Passwords don't match" : "") : "",
        };
        setFieldErrors(errors);
        setTouched({ phone: true, name: true, company: true, password: true, confirmPassword: true });

        if (Object.values(errors).some(Boolean)) return;

        setLoading(true);
        try {
            if (mode === "signup") {
                await signupUser(phone.trim(), name.trim(), company.trim(), password);
            } else {
                await loginUser(phone.trim(), password);
            }
            navigate(next, { replace: true });
        } catch (e2) {
            setErr(formatApiError(e2.response?.data?.detail) || e2.message);
        } finally {
            setLoading(false);
        }
    };

    const hasErrors = Boolean(
        fieldErrors.phone || fieldErrors.password ||
        (mode === "signup" && (fieldErrors.name || fieldErrors.company || fieldErrors.confirmPassword))
    );

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                        <span className="stamp stamp-brick">Player Sign-In</span>
                        <h1 className="font-heading text-5xl mt-3 uppercase">Get In <span className="underline-wiggle">The Game</span></h1>
                        <p className="font-body opacity-70 mt-2">{mode === "signup" ? "Create your account to get started." : "Welcome back — sign in to continue."}</p>
                    </div>

                    <div className="inline-flex border-2 border-ink shadow-retro-sm mb-6 w-full" data-testid="auth-mode-toggle">
                        <button type="button" onClick={() => switchMode("login")} className={`flex-1 px-4 py-2.5 font-heading text-sm uppercase tracking-wider ${mode === "login" ? "bg-ink text-mustard" : "bg-white hover:bg-mustard/30"}`} data-testid="mode-login-btn">
                            Login
                        </button>
                        <button type="button" onClick={() => switchMode("signup")} className={`flex-1 px-4 py-2.5 font-heading text-sm uppercase tracking-wider border-l-2 border-ink ${mode === "signup" ? "bg-ink text-mustard" : "bg-white hover:bg-mustard/30"}`} data-testid="mode-signup-btn">
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={submit} className="ticket p-6 md:p-8" data-testid="user-login-form" noValidate>
                        <div className="space-y-4">
                            <div>
                                <label className="label-retro" htmlFor="login-phone">Phone Number</label>
                                <input
                                    id="login-phone"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    onBlur={() => handleBlur("phone", phone, validatePhone)}
                                    required
                                    inputMode="numeric"
                                    maxLength={10}
                                    className="input-retro"
                                    placeholder="9876543210"
                                    data-testid="login-phone-input"
                                    aria-invalid={Boolean(fieldErrors.phone)}
                                    aria-describedby="login-phone-error"
                                />
                                {fieldErrors.phone && (
                                    <p id="login-phone-error" className="text-brick text-sm font-bold mt-1" data-testid="login-phone-error">
                                        {fieldErrors.phone}
                                    </p>
                                )}
                            </div>

                            {mode === "signup" && (
                                <>
                                    <div>
                                        <label className="label-retro" htmlFor="login-name">Your Name</label>
                                        <input
                                            id="login-name"
                                            value={name}
                                            onChange={handleNameChange}
                                            onBlur={() => handleBlur("name", name, validateName)}
                                            required
                                            maxLength={60}
                                            className="input-retro"
                                            placeholder="Rohan K"
                                            data-testid="login-name-input"
                                            aria-invalid={Boolean(fieldErrors.name)}
                                            aria-describedby="login-name-error"
                                        />
                                        {fieldErrors.name && (
                                            <p id="login-name-error" className="text-brick text-sm font-bold mt-1" data-testid="login-name-error">
                                                {fieldErrors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="label-retro" htmlFor="login-company">Company</label>
                                        <input
                                            id="login-company"
                                            value={company}
                                            onChange={handleCompanyChange}
                                            onBlur={() => handleBlur("company", company, validateCompany)}
                                            required
                                            maxLength={80}
                                            className="input-retro"
                                            placeholder="MAV-S / UST / TCS …"
                                            data-testid="login-company-input"
                                            aria-invalid={Boolean(fieldErrors.company)}
                                            aria-describedby="login-company-error"
                                        />
                                        {fieldErrors.company && (
                                            <p id="login-company-error" className="text-brick text-sm font-bold mt-1" data-testid="login-company-error">
                                                {fieldErrors.company}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="label-retro" htmlFor="login-password">Password</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    onBlur={() => handleBlur("password", password, validatePassword)}
                                    required
                                    className="input-retro"
                                    placeholder="••••••••"
                                    data-testid="login-password-input"
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    aria-describedby="login-password-error"
                                />
                                {fieldErrors.password && (
                                    <p id="login-password-error" className="text-brick text-sm font-bold mt-1" data-testid="login-password-error">
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            {mode === "signup" && (
                                <div>
                                    <label className="label-retro" htmlFor="login-confirm-password">Confirm Password</label>
                                    <input
                                        id="login-confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={handleConfirmPasswordChange}
                                        onBlur={() => handleBlur("confirmPassword", confirmPassword, (v) => (v !== password ? "Passwords don't match" : ""))}
                                        required
                                        className="input-retro"
                                        placeholder="••••••••"
                                        data-testid="login-confirm-password-input"
                                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                        aria-describedby="login-confirm-password-error"
                                    />
                                    {fieldErrors.confirmPassword && (
                                        <p id="login-confirm-password-error" className="text-brick text-sm font-bold mt-1" data-testid="login-confirm-password-error">
                                            {fieldErrors.confirmPassword}
                                        </p>
                                    )}
                                </div>
                            )}

                            {err && <div className="bg-brick text-white p-3 border-2 border-ink font-bold text-sm" data-testid="login-error">{err}</div>}

                            <button disabled={loading || hasErrors} className="btn-retro btn-brick w-full disabled:opacity-50 disabled:cursor-not-allowed" data-testid="login-submit-btn">
                                {loading ? "Kicking off…" : mode === "signup" ? "Create Account →" : "Sign In & Play →"}
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

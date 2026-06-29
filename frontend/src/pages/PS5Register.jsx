import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Header from "../components/Header";
import { Footer } from "./Home";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { PS5_REG_DEADLINE, useCountdown } from "../lib/time";

export default function PS5Register() {
    const { user } = useAuth();
    const [reg, setReg] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ player_name: "", company_name: "", contact: "" });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const regCd = useCountdown(PS5_REG_DEADLINE);

    const validate = (f) => {
        const e = {};
        if (!f.player_name.trim()) e.player_name = "Player name is required.";
        else if (f.player_name.trim().length < 2) e.player_name = "Must be at least 2 characters.";
        if (!f.company_name.trim()) e.company_name = "Company name is required.";
        if (!f.contact.trim()) e.contact = "Contact number is required.";
        else if (!/^\d{10}$/.test(f.contact.trim())) e.contact = "Enter a valid 10-digit mobile number.";
        return e;
    };

    useEffect(() => {
        api.get("/ps5/registrations/mine")
            .then((r) => {
                setReg(r.data);
                if (r.data) setForm({ player_name: r.data.player_name, company_name: r.data.company_name, contact: r.data.contact });
                else setForm({ player_name: user?.name || "", company_name: user?.company || "", contact: user?.phone || "" });
            })
            .finally(() => setLoaded(true));
    }, [user]);

    const submit = async (e) => {
        e.preventDefault();
        const errs = validate(form);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        const trimmed = { player_name: form.player_name.trim(), company_name: form.company_name.trim(), contact: form.contact.trim() };
        setSaving(true);
        try {
            if (reg) {
                const r = await api.put("/ps5/registrations/mine", trimmed);
                setReg(r.data);
                setEditing(false);
                toast.success("Registration updated!");
            } else {
                const r = await api.post("/ps5/registrations", trimmed);
                setReg(r.data);
                toast.success("You're in! Pay ₹100 at the committee desk to confirm your spot.");
            }
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        } finally {
            setSaving(false);
        }
    };

    const onBlur = (field) => {
        const errs = validate(form);
        setErrors((prev) => ({ ...prev, [field]: errs[field] }));
    };

    const withdraw = async () => {
        if (!window.confirm("Withdraw from the PS5 tournament? This removes your registration.")) return;
        try {
            await api.delete("/ps5/registrations/mine");
            setReg(null);
            setEditing(false);
            setForm({ player_name: user?.name || "", company_name: user?.company || "", contact: user?.phone || "" });
            toast.success("Registration withdrawn.");
        } catch (err) {
            toast.error(formatApiError(err.response?.data?.detail));
        }
    };

    if (!loaded) return <div className="App min-h-screen bg-cream"><Header /><div className="py-24 text-center font-heading text-3xl animate-pulse uppercase">Loading…</div></div>;

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="max-w-xl mx-auto">
                    <div className="text-center mb-8">
                        <span className="stamp stamp-teal">Step 2 of 2 · Solo Entry</span>
                        <h1 className="font-heading text-5xl md:text-6xl mt-3 uppercase">{reg ? "Your" : "Join The"} <span className="text-brick">{reg ? "Ticket" : "Draw"}</span></h1>
                        <p className="font-body opacity-70 mt-2">Individual 1v1 tournament. You'll be drawn into a group — World Cup style.</p>
                    </div>

                    {regCd.expired && !reg ? (
                        <div className="ticket p-8 text-center" data-testid="reg-closed-card">
                            <span className="stamp stamp-brick text-xl">Registration Closed</span>
                            <p className="font-body mt-4 opacity-70">The PS5 FIFA World Cup registration window ended on <strong>5 July 2026</strong>. New entries are no longer accepted.</p>
                            <p className="font-body text-sm mt-3 opacity-60">Questions? Mail the committee: <a href="mailto:hr@mav-s.com" className="underline">hr@mav-s.com</a></p>
                        </div>
                    ) : reg && !editing ? (
                        <div className="ticket p-6 md:p-8" data-testid="registration-ticket">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Player Pass · PS5 FIFA World Cup</span>
                                <span className={`stamp ${reg.payment_status === "confirmed" ? "stamp-teal" : "stamp-brick"}`} data-testid="payment-status-stamp">
                                    {reg.payment_status === "confirmed" ? "PAID ✓" : "PAYMENT PENDING"}
                                </span>
                            </div>
                            <div className="font-heading text-4xl uppercase leading-none" data-testid="ticket-player-name">{reg.player_name}</div>
                            <div className="font-mono text-xs uppercase tracking-widest opacity-70 mt-1">{reg.company_name} · {reg.contact}</div>

                            <div className="mt-6 border-t-2 border-dashed border-ink/30 pt-5 flex items-center justify-between">
                                <div>
                                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Your Group</div>
                                    {reg.group ? (
                                        <div className="font-heading text-5xl text-brick" data-testid="ticket-group">GROUP {reg.group}</div>
                                    ) : (
                                        <div className="font-heading text-2xl opacity-60" data-testid="ticket-group">Awaiting the draw…</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">Entry Fee</div>
                                    <div className="font-heading text-3xl">₹100</div>
                                </div>
                            </div>

                            {reg.payment_status !== "confirmed" && (
                                <div className="mt-5 bg-mustard border-2 border-ink p-3 font-body text-sm font-bold" data-testid="payment-instructions">
                                    💰 Pay ₹100 at the committee desk (Kabani Building 2nd floor MAV-S Innovations). Your stamp flips to PAID once confirmed. Questions? Mail the committee: <a href="mailto:hr@mav-s.com" className="underline">hr@mav-s.com</a>
                                </div>
                            )}

                            <div className="mt-6 flex gap-3">
                                <button onClick={() => setEditing(true)} className="btn-retro btn-ink !text-sm flex-1" data-testid="edit-registration-btn">Edit Details</button>
                                <button onClick={withdraw} className="btn-retro !text-sm flex-1" data-testid="withdraw-registration-btn">Withdraw</button>
                            </div>
                            <div className="text-center mt-4">
                                <Link to="/dashboard" className="font-mono text-xs uppercase tracking-widest underline opacity-70 hover:opacity-100" data-testid="goto-dashboard-link">Go to my dashboard →</Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="ticket p-6 md:p-8" data-testid="registration-form">
                            <div className="space-y-4">
                                <div>
                                    <label className="label-retro">Player Name</label>
                                    <input value={form.player_name} onChange={(e) => setForm({ ...form, player_name: e.target.value })} onBlur={() => onBlur("player_name")} className={`input-retro ${errors.player_name ? "border-brick" : ""}`} placeholder="Your in-game identity" data-testid="reg-player-name-input" />
                                    {errors.player_name && <p className="font-mono text-[11px] text-brick mt-1" data-testid="err-player-name">{errors.player_name}</p>}
                                </div>
                                <div>
                                    <label className="label-retro">Company</label>
                                    <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} onBlur={() => onBlur("company_name")} className={`input-retro ${errors.company_name ? "border-brick" : ""}`} placeholder="Infosys / UST / TCS …" data-testid="reg-company-input" />
                                    {errors.company_name && <p className="font-mono text-[11px] text-brick mt-1" data-testid="err-company-name">{errors.company_name}</p>}
                                </div>
                                <div>
                                    <label className="label-retro">Contact Number</label>
                                    <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} onBlur={() => onBlur("contact")} className={`input-retro ${errors.contact ? "border-brick" : ""}`} placeholder="9876543210" maxLength={10} data-testid="reg-contact-input" />
                                    {errors.contact && <p className="font-mono text-[11px] text-brick mt-1" data-testid="err-contact">{errors.contact}</p>}
                                </div>
                                <div className="bg-cream border-2 border-ink p-3 font-body text-xs">
                                    ⚽ <strong>How it works:</strong> Register solo → committee draws groups (like the World Cup) → round-robin in your group → top 2 advance to knockouts.
                                </div>
                                <div className="flex gap-3">
                                    <button disabled={saving} className="btn-retro btn-brick flex-1" data-testid="reg-submit-btn">
                                        {saving ? "Saving…" : reg ? "Save Changes" : "Register · ₹100"}
                                    </button>
                                    {editing && (
                                        <button type="button" onClick={() => setEditing(false)} className="btn-retro" data-testid="reg-cancel-btn">Cancel</button>
                                    )}
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}

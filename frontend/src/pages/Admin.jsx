import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import Header from "../components/Header";
import { Footer } from "./Home";
import api, { formatApiError } from "../lib/api";

const TABS = ["Overview", "Registrations", "Matches", "Fixtures", "Questions", "Announcements", "Settings"];
const ROUNDS = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H", "Round of 16", "Quarterfinal", "Semifinal", "Third Place", "Final"];
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const err = (e) => toast.error(formatApiError(e.response?.data?.detail) || "Something went wrong");

export default function Admin() {
    const [tab, setTab] = useState("Overview");
    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="admin-panel">
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <span className="stamp stamp-ink">Committee Console</span>
                    <h1 className="font-heading text-4xl md:text-5xl uppercase">Admin <span className="text-brick">Panel</span></h1>
                </div>

                <div className="flex flex-wrap border-2 border-ink shadow-retro-sm mb-8 bg-white overflow-x-auto">
                    {TABS.map((t, i) => (
                        <button key={t} onClick={() => setTab(t)} data-testid={`admin-tab-${t.toLowerCase()}`}
                            className={`px-4 py-2.5 font-heading text-sm uppercase tracking-wider whitespace-nowrap ${i > 0 ? "border-l-2 border-ink" : ""} ${tab === t ? "bg-ink text-mustard" : "hover:bg-mustard/30"}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {tab === "Overview" && <OverviewTab />}
                {tab === "Registrations" && <RegistrationsTab />}
                {tab === "Matches" && <MatchesTab />}
                {tab === "Fixtures" && <FixturesTab />}
                {tab === "Questions" && <QuestionsTab />}
                {tab === "Announcements" && <AnnouncementsTab />}
                {tab === "Settings" && <SettingsTab />}
            </div>
            <Footer />
        </div>
    );
}

/* ---------------- OVERVIEW ---------------- */
function OverviewTab() {
    const [stats, setStats] = useState(null);
    useEffect(() => { api.get("/admin/dashboard-stats").then((r) => setStats(r.data)).catch(err); }, []);
    if (!stats) return <Loading />;
    const items = [
        { label: "PS5 Registrations", value: stats.registrations, accent: "text-brick" },
        { label: "Payments Pending", value: stats.payments_pending, accent: "text-brick" },
        { label: "Payments Confirmed", value: stats.payments_confirmed, accent: "text-teal" },
        { label: "Total Matches", value: stats.matches, accent: "text-ink" },
        { label: "Live Now", value: stats.matches_live, accent: "text-brick" },
        { label: "Completed", value: stats.matches_completed, accent: "text-teal" },
        { label: "Questions", value: stats.questions, accent: "text-ink" },
        { label: "Users", value: stats.users, accent: "text-teal" },
        { label: "Predictions In", value: stats.predictions, accent: "text-brick" },
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="admin-stats-grid">
            {items.map((it) => (
                <div key={it.label} className="retro-card bg-white p-5">
                    <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">{it.label}</div>
                    <div className={`font-heading text-5xl mt-1 ${it.accent}`}>{it.value}</div>
                </div>
            ))}
        </div>
    );
}

/* ---------------- REGISTRATIONS ---------------- */
function RegistrationsTab() {
    const [regs, setRegs] = useState(null);
    const [size, setSize] = useState(4);
    const load = () => api.get("/admin/registrations").then((r) => setRegs(r.data)).catch(err);
    useEffect(() => { load(); }, []);

    const setPayment = async (id, v) => {
        try { await api.patch(`/admin/registrations/${id}/payment`, { payment_status: v }); toast.success("Payment updated"); load(); } catch (e) { err(e); }
    };
    const setGroup = async (id, g) => {
        try { await api.patch(`/admin/registrations/${id}/group`, { group: g }); toast.success(g ? `Moved to Group ${g}` : "Removed from group"); load(); } catch (e) { err(e); }
    };
    const autoAssign = async () => {
        if (!window.confirm(`Run the draw? Players will be shuffled into groups of ${size}. Existing group assignments will be replaced.`)) return;
        try {
            const r = await api.post("/admin/groups/auto-assign", { group_size: Number(size) });
            toast.success(`🎉 Draw complete: ${r.data.players} players → ${r.data.groups} groups`);
            load();
        } catch (e) { err(e); }
    };
    const exportXlsx = async () => {
        try {
            const r = await api.get("/admin/registrations/export", { responseType: "blob" });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement("a");
            a.href = url; a.download = "ps5_registrations.xlsx"; a.click();
            URL.revokeObjectURL(url);
            toast.success("Export downloaded");
        } catch (e) { err(e); }
    };

    if (!regs) return <Loading />;
    return (
        <div className="space-y-5">
            <div className="retro-card bg-mustard p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-heading uppercase text-lg">World Cup Draw:</span>
                    <span className="font-mono text-xs uppercase">Players per group</span>
                    <input type="number" min="2" max="8" value={size} onChange={(e) => setSize(e.target.value)} className="input-retro !w-16 text-center" data-testid="group-size-input" />
                    <button onClick={autoAssign} className="btn-retro btn-brick !text-xs !py-2 !px-3" data-testid="auto-assign-btn">🎲 Run the Draw</button>
                </div>
                <button onClick={exportXlsx} className="btn-retro btn-ink !text-xs !py-2 !px-3" data-testid="export-regs-btn">⬇ Export Excel</button>
            </div>

            <div className="retro-card bg-white overflow-x-auto" data-testid="admin-regs-table">
                <table className="w-full font-body text-sm">
                    <thead className="bg-ink text-mustard">
                        <tr className="text-left">
                            {["Player", "Company", "Contact", "Payment", "Group", "Registered"].map((h) => (
                                <th key={h} className="px-3 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {regs.map((r) => (
                            <tr key={r.id} className="border-t-2 border-ink/10">
                                <td className="px-3 py-2 font-bold">{r.player_name}</td>
                                <td className="px-3 py-2 font-mono text-xs uppercase">{r.company_name}</td>
                                <td className="px-3 py-2 font-mono text-xs">{r.contact}</td>
                                <td className="px-3 py-2">
                                    <select value={r.payment_status} onChange={(e) => setPayment(r.id, e.target.value)} className={`border-2 border-ink px-2 py-1 font-bold text-xs uppercase ${r.payment_status === "confirmed" ? "bg-teal text-white" : "bg-mustard"}`} data-testid={`payment-select-${r.id}`}>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                    </select>
                                </td>
                                <td className="px-3 py-2">
                                    <select value={r.group || ""} onChange={(e) => setGroup(r.id, e.target.value)} className="border-2 border-ink px-2 py-1 font-bold text-xs uppercase bg-white" data-testid={`group-select-${r.id}`}>
                                        <option value="">— No group</option>
                                        {GROUP_LETTERS.map((g) => <option key={g} value={g}>{`Group ${g}`}</option>)}
                                    </select>
                                </td>
                                <td className="px-3 py-2 font-mono text-[10px] opacity-60">{new Date(r.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {regs.length === 0 && <tr><td colSpan="6" className="px-3 py-6 text-center opacity-60">No registrations yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ---------------- MATCHES ---------------- */
function MatchesTab() {
    const [matches, setMatches] = useState(null);
    const [regs, setRegs] = useState([]);
    const empty = { player_a: "", player_a_company: "", player_b: "", player_b_company: "", round_label: "Group A", station: "Station 1", scheduled_at: "" };
    const [form, setForm] = useState(empty);

    const load = () => api.get("/ps5/matches").then((r) => setMatches(r.data)).catch(err);
    useEffect(() => { load(); api.get("/admin/registrations").then((r) => setRegs(r.data)).catch(() => {}); }, []);

    const fillCompany = (field, name) => {
        const reg = regs.find((x) => x.player_name === name);
        const companyField = field === "player_a" ? "player_a_company" : "player_b_company";
        setForm((f) => ({ ...f, [field]: name, ...(reg ? { [companyField]: reg.company_name } : {}) }));
    };

    const create = async (e) => {
        e.preventDefault();
        try {
            await api.post("/admin/matches", { ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
            toast.success("Match scheduled!");
            setForm(empty);
            load();
        } catch (e2) { err(e2); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this match?")) return;
        try { await api.delete(`/admin/matches/${id}`); toast.success("Match deleted"); load(); } catch (e) { err(e); }
    };

    if (!matches) return <Loading />;
    return (
        <div className="space-y-6">
            <form onSubmit={create} className="retro-card bg-white p-5" data-testid="create-match-form">
                <h3 className="font-heading text-2xl uppercase mb-4">Schedule a <span className="text-brick">Match</span></h3>
                <datalist id="players-list">
                    {regs.map((r) => <option key={r.id} value={r.player_name} />)}
                </datalist>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><label className="label-retro">Player A</label><input list="players-list" required value={form.player_a} onChange={(e) => fillCompany("player_a", e.target.value)} className="input-retro" data-testid="match-player-a" /></div>
                    <div><label className="label-retro">Company A</label><input required value={form.player_a_company} onChange={(e) => setForm({ ...form, player_a_company: e.target.value })} className="input-retro" data-testid="match-company-a" /></div>
                    <div><label className="label-retro">Player B</label><input list="players-list" required value={form.player_b} onChange={(e) => fillCompany("player_b", e.target.value)} className="input-retro" data-testid="match-player-b" /></div>
                    <div><label className="label-retro">Company B</label><input required value={form.player_b_company} onChange={(e) => setForm({ ...form, player_b_company: e.target.value })} className="input-retro" data-testid="match-company-b" /></div>
                    <div>
                        <label className="label-retro">Round</label>
                        <select value={form.round_label} onChange={(e) => setForm({ ...form, round_label: e.target.value })} className="input-retro" data-testid="match-round-select">
                            {ROUNDS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                    </div>
                    <div><label className="label-retro">Station</label><input required value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} className="input-retro" data-testid="match-station" /></div>
                    <div><label className="label-retro">Kickoff</label><input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="input-retro" data-testid="match-datetime" /></div>
                    <div className="flex items-end"><button className="btn-retro btn-brick w-full !text-sm" data-testid="match-create-btn">+ Schedule</button></div>
                </div>
            </form>

            <div className="space-y-3" data-testid="admin-matches-list">
                {matches.map((m) => <AdminMatchRow key={m.id} m={m} onSaved={load} onDelete={() => remove(m.id)} />)}
                {matches.length === 0 && <div className="ticket p-6 text-center opacity-60">No matches scheduled yet.</div>}
            </div>
        </div>
    );
}

function AdminMatchRow({ m, onSaved, onDelete }) {
    const [score, setScore] = useState({ score_a: m.score_a, score_b: m.score_b, status: m.status, player_of_match: m.player_of_match || "" });
    const save = async () => {
        try {
            await api.patch(`/admin/matches/${m.id}/score`, { ...score, score_a: Number(score.score_a), score_b: Number(score.score_b), player_of_match: score.player_of_match || null });
            toast.success("Score updated");
            onSaved();
        } catch (e) { err(e); }
    };
    return (
        <div className="retro-card bg-white p-4 flex flex-wrap items-center gap-3 justify-between" data-testid={`admin-match-${m.id}`}>
            <div className="min-w-[220px]">
                <div className="font-heading text-lg leading-none">{m.player_a} <span className="text-brick">vs</span> {m.player_b}</div>
                <div className="font-mono text-[10px] uppercase opacity-60 mt-1">{m.round_label} · {m.station} · {new Date(m.scheduled_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <input type="number" min="0" value={score.score_a} onChange={(e) => setScore({ ...score, score_a: e.target.value })} className="input-retro !w-16 text-center font-mono" data-testid={`score-a-${m.id}`} />
                <span className="font-heading">:</span>
                <input type="number" min="0" value={score.score_b} onChange={(e) => setScore({ ...score, score_b: e.target.value })} className="input-retro !w-16 text-center font-mono" data-testid={`score-b-${m.id}`} />
                <select value={score.status} onChange={(e) => setScore({ ...score, status: e.target.value })} className="border-2 border-ink px-2 py-2 font-bold text-xs uppercase bg-white" data-testid={`status-select-${m.id}`}>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                </select>
                <input placeholder="MOTM (optional)" value={score.player_of_match} onChange={(e) => setScore({ ...score, player_of_match: e.target.value })} className="input-retro !w-36 !text-xs" data-testid={`motm-${m.id}`} />
                <button onClick={save} className="btn-retro btn-teal !text-xs !py-2 !px-3" data-testid={`save-score-${m.id}`}>Save</button>
                <button onClick={onDelete} className="btn-retro !text-xs !py-2 !px-3" data-testid={`delete-match-${m.id}`}>✕</button>
            </div>
        </div>
    );
}

/* ---------------- FIXTURES ---------------- */
function FixturesTab() {
    const [fixtures, setFixtures] = useState(null);
    const empty = { team_a: "", team_a_flag: "", team_b: "", team_b_flag: "", kickoff_at: "", venue: "", stage: "Group A" };
    const [form, setForm] = useState(empty);
    const load = () => api.get("/fixtures").then((r) => setFixtures(r.data)).catch(err);
    useEffect(() => { load(); }, []);

    const create = async (e) => {
        e.preventDefault();
        try {
            await api.post("/admin/fixtures", { ...form, kickoff_at: new Date(form.kickoff_at).toISOString() });
            toast.success("Fixture added!");
            setForm(empty);
            load();
        } catch (e2) { err(e2); }
    };
    const remove = async (id) => {
        if (!window.confirm("Delete fixture? Its questions will be deleted too.")) return;
        try { await api.delete(`/admin/fixtures/${id}`); toast.success("Fixture deleted"); load(); } catch (e) { err(e); }
    };

    if (!fixtures) return <Loading />;
    return (
        <div className="space-y-6">
            <form onSubmit={create} className="retro-card bg-white p-5" data-testid="create-fixture-form">
                <h3 className="font-heading text-2xl uppercase mb-1">Add a <span className="text-brick">World Cup Fixture</span></h3>
                <p className="font-body text-xs opacity-60 mb-4">Real WC matches that daily prediction questions attach to.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><label className="label-retro">Team A</label><input required value={form.team_a} onChange={(e) => setForm({ ...form, team_a: e.target.value })} className="input-retro" placeholder="Argentina" data-testid="fixture-team-a" /></div>
                    <div><label className="label-retro">Flag A (emoji)</label><input value={form.team_a_flag} onChange={(e) => setForm({ ...form, team_a_flag: e.target.value })} className="input-retro" placeholder="🇦🇷" data-testid="fixture-flag-a" /></div>
                    <div><label className="label-retro">Team B</label><input required value={form.team_b} onChange={(e) => setForm({ ...form, team_b: e.target.value })} className="input-retro" placeholder="Brazil" data-testid="fixture-team-b" /></div>
                    <div><label className="label-retro">Flag B (emoji)</label><input value={form.team_b_flag} onChange={(e) => setForm({ ...form, team_b_flag: e.target.value })} className="input-retro" placeholder="🇧🇷" data-testid="fixture-flag-b" /></div>
                    <div><label className="label-retro">Kickoff</label><input type="datetime-local" required value={form.kickoff_at} onChange={(e) => setForm({ ...form, kickoff_at: e.target.value })} className="input-retro" data-testid="fixture-kickoff" /></div>
                    <div><label className="label-retro">Venue</label><input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="input-retro" placeholder="MetLife Stadium" data-testid="fixture-venue" /></div>
                    <div><label className="label-retro">Stage</label><input required value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="input-retro" placeholder="Group A / QF / Final" data-testid="fixture-stage" /></div>
                    <div className="flex items-end"><button className="btn-retro btn-brick w-full !text-sm" data-testid="fixture-create-btn">+ Add Fixture</button></div>
                </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="admin-fixtures-list">
                {fixtures.map((f) => (
                    <div key={f.id} className="retro-card bg-white p-4 flex items-center justify-between gap-3">
                        <div>
                            <div className="font-heading text-lg">{f.team_a_flag} {f.team_a} <span className="text-brick">vs</span> {f.team_b} {f.team_b_flag}</div>
                            <div className="font-mono text-[10px] uppercase opacity-60">{f.stage} · {f.venue} · {new Date(f.kickoff_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
                        </div>
                        <button onClick={() => remove(f.id)} className="btn-retro !text-xs !py-2 !px-3" data-testid={`delete-fixture-${f.id}`}>✕</button>
                    </div>
                ))}
                {fixtures.length === 0 && <div className="ticket p-6 text-center opacity-60 md:col-span-2">No fixtures yet.</div>}
            </div>
        </div>
    );
}

/* ---------------- QUESTIONS ---------------- */
function QuestionsTab() {
    const [questions, setQuestions] = useState(null);
    const [fixtures, setFixtures] = useState([]);
    const today = new Date().toISOString().slice(0, 10);
    const empty = { date: today, fixture_id: "", text: "", type: "dropdown", options: "", points: 10, order: 1 };
    const [form, setForm] = useState(empty);

    const load = () => api.get("/admin/questions").then((r) => setQuestions(r.data)).catch(err);
    useEffect(() => { load(); api.get("/fixtures").then((r) => setFixtures(r.data)).catch(() => {}); }, []);

    const create = async (e) => {
        e.preventDefault();
        if (!form.fixture_id) { toast.error("Pick a fixture first"); return; }
        try {
            await api.post("/admin/questions", {
                ...form,
                points: Number(form.points),
                order: Number(form.order),
                options: form.type === "numeric_score" ? [] : form.options.split(",").map((s) => s.trim()).filter(Boolean),
            });
            toast.success("Question published!");
            setForm({ ...empty, fixture_id: form.fixture_id });
            load();
        } catch (e2) { err(e2); }
    };
    const remove = async (id) => {
        if (!window.confirm("Delete question? All its submissions will be deleted too.")) return;
        try { await api.delete(`/admin/questions/${id}`); toast.success("Question deleted"); load(); } catch (e) { err(e); }
    };

    if (!questions) return <Loading />;
    return (
        <div className="space-y-6">
            <form onSubmit={create} className="retro-card bg-white p-5" data-testid="create-question-form">
                <h3 className="font-heading text-2xl uppercase mb-4">Publish a <span className="text-brick">Question</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div><label className="label-retro">Date</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-retro" data-testid="question-date" /></div>
                    <div>
                        <label className="label-retro">Fixture</label>
                        <select required value={form.fixture_id} onChange={(e) => setForm({ ...form, fixture_id: e.target.value })} className="input-retro" data-testid="question-fixture-select">
                            <option value="">— Select fixture —</option>
                            {fixtures.map((f) => <option key={f.id} value={f.id}>{f.team_a} vs {f.team_b} ({f.stage})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label-retro">Type</label>
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-retro" data-testid="question-type-select">
                            <option value="dropdown">Dropdown (single pick)</option>
                            <option value="radio">Yes / No (radio)</option>
                            <option value="numeric_score">Exact Scoreline</option>
                            <option value="multi_select">Multi-select (scorers)</option>
                        </select>
                    </div>
                    <div className="md:col-span-2"><label className="label-retro">Question Text</label><input required value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="input-retro" placeholder="Who will win Argentina vs Brazil?" data-testid="question-text" /></div>
                    {form.type !== "numeric_score" && (
                        <div className="md:col-span-2 lg:col-span-1"><label className="label-retro">Options (comma separated)</label><input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} className="input-retro" placeholder="Argentina, Draw, Brazil" data-testid="question-options" /></div>
                    )}
                    <div><label className="label-retro">Points</label><input type="number" min="1" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className="input-retro" data-testid="question-points" /></div>
                    <div><label className="label-retro">Order</label><input type="number" min="0" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="input-retro" data-testid="question-order" /></div>
                    <div className="flex items-end"><button className="btn-retro btn-brick w-full !text-sm" data-testid="question-create-btn">+ Publish</button></div>
                </div>
            </form>

            <div className="space-y-3" data-testid="admin-questions-list">
                {questions.map((q) => <AdminQuestionRow key={q.id} q={q} onChanged={load} onDelete={() => remove(q.id)} />)}
                {questions.length === 0 && <div className="ticket p-6 text-center opacity-60">No questions yet.</div>}
            </div>
        </div>
    );
}

function AdminQuestionRow({ q, onChanged, onDelete }) {
    const [open, setOpen] = useState(false);
    const [choice, setChoice] = useState("");
    const [scoreAns, setScoreAns] = useState({ a: "", b: "" });
    const [multi, setMulti] = useState([]);

    const declare = async () => {
        let correct;
        if (q.type === "numeric_score") {
            if (scoreAns.a === "" || scoreAns.b === "") { toast.error("Enter the full-time score"); return; }
            correct = { a: Number(scoreAns.a), b: Number(scoreAns.b) };
        } else if (q.type === "multi_select") {
            if (!multi.length) { toast.error("Pick at least one correct option"); return; }
            correct = multi;
        } else {
            if (!choice) { toast.error("Pick the correct answer"); return; }
            correct = choice;
        }
        try {
            const r = await api.patch(`/admin/questions/${q.id}/result`, { correct_answer: correct });
            toast.success(`Result declared — ${r.data.scored} submissions scored! 🏆`);
            setOpen(false);
            onChanged();
        } catch (e) { err(e); }
    };

    return (
        <div className="retro-card bg-white p-4" data-testid={`admin-question-${q.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-bold font-body">{q.text}</div>
                    <div className="font-mono text-[10px] uppercase opacity-60 mt-1">{q.date} · {q.type} · {q.points} pts</div>
                </div>
                <div className="flex items-center gap-2">
                    {q.results_entered ? (
                        <span className="stamp stamp-teal !text-[10px]" data-testid={`result-declared-${q.id}`}>RESULT: {Array.isArray(q.correct_answer) ? q.correct_answer.join(", ") : typeof q.correct_answer === "object" && q.correct_answer ? `${q.correct_answer.a}-${q.correct_answer.b}` : String(q.correct_answer)}</span>
                    ) : (
                        <button onClick={() => setOpen(!open)} className="btn-retro btn-ink !text-xs !py-2 !px-3" data-testid={`declare-result-btn-${q.id}`}>Declare Result</button>
                    )}
                    <button onClick={onDelete} className="btn-retro !text-xs !py-2 !px-3" data-testid={`delete-question-${q.id}`}>✕</button>
                </div>
            </div>

            {open && !q.results_entered && (
                <div className="mt-4 border-t-2 border-ink/10 pt-4 flex flex-wrap items-center gap-3" data-testid={`result-editor-${q.id}`}>
                    {q.type === "numeric_score" ? (
                        <>
                            <input type="number" min="0" value={scoreAns.a} onChange={(e) => setScoreAns({ ...scoreAns, a: e.target.value })} className="input-retro !w-16 text-center font-mono" placeholder="0" data-testid={`result-score-a-${q.id}`} />
                            <span className="font-heading">:</span>
                            <input type="number" min="0" value={scoreAns.b} onChange={(e) => setScoreAns({ ...scoreAns, b: e.target.value })} className="input-retro !w-16 text-center font-mono" placeholder="0" data-testid={`result-score-b-${q.id}`} />
                        </>
                    ) : q.type === "multi_select" ? (
                        q.options.map((opt) => (
                            <button key={opt} type="button" onClick={() => setMulti(multi.includes(opt) ? multi.filter((o) => o !== opt) : [...multi, opt])}
                                className={`px-3 py-1.5 border-2 border-ink font-body font-bold text-xs ${multi.includes(opt) ? "bg-teal text-white" : "bg-white"}`}>
                                {multi.includes(opt) ? "✓ " : ""}{opt}
                            </button>
                        ))
                    ) : (
                        q.options.map((opt) => (
                            <button key={opt} type="button" onClick={() => setChoice(opt)}
                                className={`px-3 py-1.5 border-2 border-ink font-body font-bold text-xs ${choice === opt ? "bg-ink text-mustard" : "bg-white"}`}>
                                {opt}
                            </button>
                        ))
                    )}
                    <button onClick={declare} className="btn-retro btn-brick !text-xs !py-2 !px-3" data-testid={`confirm-result-${q.id}`}>Confirm & Score All</button>
                </div>
            )}
        </div>
    );
}

/* ---------------- ANNOUNCEMENTS ---------------- */
function AnnouncementsTab() {
    const [list, setList] = useState(null);
    const [form, setForm] = useState({ title: "", body: "" });
    const load = () => api.get("/announcements").then((r) => setList(r.data)).catch(err);
    useEffect(() => { load(); }, []);

    const create = async (e) => {
        e.preventDefault();
        try { await api.post("/admin/announcements", form); toast.success("Announcement is live on the marquee!"); setForm({ title: "", body: "" }); load(); } catch (e2) { err(e2); }
    };
    const remove = async (id) => {
        try { await api.delete(`/admin/announcements/${id}`); toast.success("Announcement removed"); load(); } catch (e) { err(e); }
    };

    if (!list) return <Loading />;
    return (
        <div className="space-y-6">
            <form onSubmit={create} className="retro-card bg-white p-5" data-testid="create-announcement-form">
                <h3 className="font-heading text-2xl uppercase mb-4">Broadcast an <span className="text-brick">Announcement</span></h3>
                <div className="space-y-3">
                    <div><label className="label-retro">Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-retro" placeholder="🏆 Finals tonight!" data-testid="announcement-title" /></div>
                    <div><label className="label-retro">Body</label><textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input-retro !h-24" placeholder="Main Arena, 7 PM. Be there." data-testid="announcement-body" /></div>
                    <button className="btn-retro btn-brick !text-sm" data-testid="announcement-create-btn">📣 Publish</button>
                </div>
            </form>
            <div className="space-y-3" data-testid="admin-announcements-list">
                {list.map((a) => (
                    <div key={a.id} className="retro-card bg-white p-4 flex items-start justify-between gap-3">
                        <div>
                            <div className="font-heading text-lg">{a.title}</div>
                            <div className="font-body text-sm opacity-80">{a.body}</div>
                            <div className="font-mono text-[10px] opacity-50 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                        </div>
                        <button onClick={() => remove(a.id)} className="btn-retro !text-xs !py-2 !px-3" data-testid={`delete-announcement-${a.id}`}>✕</button>
                    </div>
                ))}
                {list.length === 0 && <div className="ticket p-6 text-center opacity-60">Nothing on the marquee yet.</div>}
            </div>
        </div>
    );
}

/* ---------------- SETTINGS ---------------- */
function SettingsTab() {
    const [content, setContent] = useState("");
    const [loaded, setLoaded] = useState(false);
    useEffect(() => { api.get("/settings/tnc").then((r) => { setContent(r.data.content); setLoaded(true); }).catch(err); }, []);

    const save = async () => {
        try { await api.put("/admin/settings/tnc", { content }); toast.success("Terms & Conditions updated"); } catch (e) { err(e); }
    };

    if (!loaded) return <Loading />;
    return (
        <div className="retro-card bg-white p-5" data-testid="settings-tnc">
            <h3 className="font-heading text-2xl uppercase mb-1">Tournament <span className="text-brick">Rulebook</span></h3>
            <p className="font-body text-xs opacity-60 mb-4">Shown to players on the PS5 terms page. Use **bold** for emphasis.</p>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="input-retro !h-96 font-mono !text-xs" data-testid="tnc-textarea" />
            <button onClick={save} className="btn-retro btn-brick !text-sm mt-4" data-testid="tnc-save-btn">Save Rulebook</button>
        </div>
    );
}

function Loading() {
    return <div className="ticket p-8 text-center font-heading text-2xl animate-pulse uppercase">Loading…</div>;
}

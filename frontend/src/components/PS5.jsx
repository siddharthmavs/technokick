import React from "react";

const KNOCKOUT_ORDER = ["Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "Third Place", "Final"];

export function roundCompare(a, b) {
    const aG = a.startsWith("Group"), bG = b.startsWith("Group");
    if (aG && bG) return a.localeCompare(b);
    if (aG !== bG) return aG ? -1 : 1;
    const ai = KNOCKOUT_ORDER.indexOf(a), bi = KNOCKOUT_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
}

function PlayerRow({ name, company, score, winner, done, showScore }) {
    return (
        <div className={`flex items-center justify-between py-1 ${done && !winner && name !== "Draw" ? "opacity-50" : ""}`}>
            <div className="min-w-0">
                <div className="font-heading text-lg leading-none truncate">{name}{winner && <span className="ml-2 text-brick">★</span>}</div>
                <div className="font-mono text-[10px] uppercase opacity-60 truncate">{company}</div>
            </div>
            {showScore && <span className="font-mono font-bold text-xl tabular-nums">{score}</span>}
        </div>
    );
}

export function MatchCard({ m }) {
    const statusColors = { live: "stamp-brick", completed: "stamp-ink", upcoming: "" };
    const isBigRound = ["Semifinal", "Final", "Third Place"].includes(m.round_label);
    const isTBD = m.player_a === "TBD" || m.player_b === "TBD";
    const showScore = m.status !== "upcoming";
    return (
        <div
            className={`retro-card retro-card-hover p-4 anim-scroll ${m.status === "live" ? "bg-mustard" : "bg-white"} ${isBigRound ? "match-card-big" : ""} ${isTBD ? "match-card-tbd" : ""}`}
            data-testid={`match-card-${m.id}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{m.station}</span>
                <span className={`stamp ${statusColors[m.status]} !text-[10px] !py-0.5 !px-2`}>{m.status === "live" ? <><span className="live-dot" />LIVE</> : m.status}</span>
            </div>
            <PlayerRow name={m.player_a} company={m.player_a_company} score={m.score_a} winner={m.winner === m.player_a} done={m.status === "completed"} showScore={showScore} />
            <div className="text-center my-1 font-mono text-xs opacity-50">vs</div>
            <PlayerRow name={m.player_b} company={m.player_b_company} score={m.score_b} winner={m.winner === m.player_b} done={m.status === "completed"} showScore={showScore} />
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-mono opacity-70">
                <span>{new Date(m.scheduled_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                {m.player_of_match && <span className="text-brick font-bold truncate">★ MOTM: {m.player_of_match}</span>}
            </div>
        </div>
    );
}

export function BracketView({ matches }) {
    if (!matches.length) {
        return <div className="ticket p-8 text-center font-body opacity-70" data-testid="bracket-empty">Fixtures coming soon. Stay tuned!</div>;
    }
    const groups = {};
    matches.forEach((m) => {
        const k = m.round_label || "Group";
        groups[k] = groups[k] || [];
        groups[k].push(m);
    });
    const rounds = Object.keys(groups).sort(roundCompare);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="bracket-grid">
            {rounds.map((r) => (
                <div key={r} className="space-y-4">
                    <h3 className="font-heading text-2xl uppercase border-b-2 border-ink pb-1">{r}</h3>
                    {groups[r].map((m) => <MatchCard key={m.id} m={m} />)}
                </div>
            ))}
        </div>
    );
}

export function GroupStandings({ standings }) {
    if (!standings.length) {
        return <div className="ticket p-8 text-center opacity-70" data-testid="standings-empty">The group draw hasn't happened yet. Stay tuned for the big reveal!</div>;
    }
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="group-standings">
            {standings.map(({ group, rows }) => (
                <div key={group} className="retro-card overflow-hidden bg-white">
                    <div className="bg-ink text-mustard px-4 py-2 flex items-center justify-between">
                        <span className="font-heading text-2xl uppercase tracking-wider">{group}</span>
                        <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">Top 2 advance</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full font-body text-sm">
                            <thead>
                                <tr className="text-left border-b-2 border-ink">
                                    {["#", "Player", "P", "W", "D", "L", "GD", "PTS"].map((h) => (
                                        <th key={h} className="px-3 py-2 font-heading uppercase tracking-wider text-xs">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={r.player} className={`border-t border-ink/10 ${i < 2 ? "bg-teal/10" : ""}`} data-testid={`standing-row-${group.replace(/\s/g, "-")}-${i}`}>
                                        <td className="px-3 py-2 font-mono font-bold">{i + 1}{i < 2 && <span className="ml-1 text-teal">▲</span>}</td>
                                        <td className="px-3 py-2">
                                            <div className="font-bold leading-tight">{r.player}</div>
                                            <div className="font-mono text-[10px] uppercase opacity-60">{r.company}</div>
                                        </td>
                                        <td className="px-3 py-2 font-mono">{r.played}</td>
                                        <td className="px-3 py-2 font-mono">{r.won}</td>
                                        <td className="px-3 py-2 font-mono">{r.drawn}</td>
                                        <td className="px-3 py-2 font-mono">{r.lost}</td>
                                        <td className="px-3 py-2 font-mono">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                                        <td className="px-3 py-2 font-mono font-bold text-brick">{r.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Footer } from "./Home";
import { BracketView, GroupStandings } from "../components/PS5";
import api from "../lib/api";

export default function Bracket() {
    const [matches, setMatches] = useState([]);
    const [standings, setStandings] = useState([]);
    const [groups, setGroups] = useState(null);
    const [tab, setTab] = useState("groups"); // 'groups' | 'knockout'

    useEffect(() => {
        api.get("/ps5/matches").then((r) => setMatches(r.data)).catch(() => {});
        api.get("/ps5/points-table").then((r) => setStandings(r.data)).catch(() => {});
        api.get("/ps5/groups").then((r) => setGroups(r.data)).catch(() => {});
    }, []);

    const groupMatches = matches.filter((m) => (m.round_label || "").startsWith("Group"));
    const knockoutMatches = matches.filter((m) => !(m.round_label || "").startsWith("Group"));

    return (
        <div className="App min-h-screen bg-cream">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="text-center mb-8">
                    <span className="stamp stamp-brick">PS5 FIFA World Cup · Technopark</span>
                    <h1 className="font-heading text-5xl md:text-7xl mt-3 uppercase">The Road to <span className="text-brick">Glory</span></h1>
                    <p className="font-body opacity-70 mt-2">Group stage first — World Cup style. Top 2 from each group hit the knockouts.</p>
                </div>

                <div className="flex justify-center mb-10">
                    <div className="inline-flex border-2 border-ink shadow-retro-sm">
                        <button onClick={() => setTab("groups")} data-testid="tab-groups" className={`px-5 py-2 font-heading text-sm uppercase tracking-wider ${tab === "groups" ? "bg-ink text-mustard" : "bg-white"}`}>Group Stage</button>
                        <button onClick={() => setTab("knockout")} data-testid="tab-knockout" className={`px-5 py-2 font-heading text-sm uppercase tracking-wider border-l-2 border-ink ${tab === "knockout" ? "bg-ink text-mustard" : "bg-white"}`}>Knockouts</button>
                    </div>
                </div>

                {tab === "groups" ? (
                    <div className="space-y-12">
                        <section>
                            <h2 className="font-heading text-3xl md:text-4xl uppercase mb-5">Group <span className="text-teal">Standings</span></h2>
                            <GroupStandings standings={standings} />
                        </section>
                        <section>
                            <h2 className="font-heading text-3xl md:text-4xl uppercase mb-5">Group <span className="text-brick">Matches</span></h2>
                            <BracketView matches={groupMatches} />
                        </section>
                        {groups?.unassigned?.length > 0 && (
                            <section data-testid="unassigned-players">
                                <h2 className="font-heading text-2xl uppercase mb-3 opacity-70">In the Draw Pot</h2>
                                <div className="flex flex-wrap gap-2">
                                    {groups.unassigned.map((p) => (
                                        <span key={p.player_name} className="px-3 py-1.5 border-2 border-dashed border-ink/40 font-body text-sm font-bold bg-white">
                                            {p.player_name} <span className="font-mono text-[10px] uppercase opacity-60">· {p.company_name}</span>
                                        </span>
                                    ))}
                                </div>
                                <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-2">These players are waiting for the committee's group draw.</p>
                            </section>
                        )}
                    </div>
                ) : (
                    <section>
                        <h2 className="font-heading text-3xl md:text-4xl uppercase mb-5">Knockout <span className="text-brick">Bracket</span></h2>
                        <BracketView matches={knockoutMatches} />
                    </section>
                )}
            </div>
            <Footer />
        </div>
    );
}

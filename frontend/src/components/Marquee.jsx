import React from "react";

export default function Marquee({ items }) {
    const repeated = [...items, ...items];
    return (
        <div className="marquee bg-ink text-mustard border-y-2 border-ink py-2 relative z-10">
            <div className="marquee-inner gap-12 px-8">
                {repeated.map((t, i) => (
                    <span key={i} className="font-mono text-xs uppercase tracking-widest flex items-center gap-3">
                        <span className="text-brick">⚽</span> {t}
                    </span>
                ))}
            </div>
        </div>
    );
}

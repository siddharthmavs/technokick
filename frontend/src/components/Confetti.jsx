import React, { useMemo } from "react";

const COLORS = ["#B33A2B", "#1F8A82", "#E8B33D", "#2D2A26", "#5B8C5A", "#4A6FA5"];
const SHAPES = ["circle", "square", "triangle"];

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

/** Slow, sparse, decorative confetti falling from the top. Purely visual — pointer-events disabled. */
export default function Confetti({ count = 16 }) {
    const pieces = useMemo(
        () =>
            Array.from({ length: count }, (_, i) => ({
                id: i,
                left: rand(0, 100),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: rand(6, 11),
                duration: rand(10, 18),
                delay: rand(0, 12),
                shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
            })),
        [count]
    );

    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden="true" data-testid="confetti-overlay">
            {pieces.map((p) => (
                <span
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: `${p.left}%`,
                        width: p.shape === "triangle" ? 0 : p.size,
                        height: p.shape === "triangle" ? 0 : p.size,
                        backgroundColor: p.shape === "triangle" ? "transparent" : p.color,
                        borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : 0,
                        borderLeft: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : undefined,
                        borderRight: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : undefined,
                        borderBottom: p.shape === "triangle" ? `${p.size}px solid ${p.color}` : undefined,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
            <style>{`
                .confetti-piece {
                    position: absolute;
                    top: -20px;
                    opacity: 0.75;
                    animation-name: confetti-fall;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }
                @keyframes confetti-fall {
                    0% { transform: translateY(-20px) translateX(0) rotate(0deg); }
                    50% { transform: translateY(55vh) translateX(14px) rotate(180deg); }
                    100% { transform: translateY(115vh) translateX(-10px) rotate(360deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .confetti-piece { animation: none; display: none; }
                }
            `}</style>
        </div>
    );
}

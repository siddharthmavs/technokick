import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const loc = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (path) => path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(path);
    const navClass = (path) =>
        `font-body uppercase font-bold text-xs tracking-wider px-3 py-2 border-2 transition-colors ${
            isActive(path)
                ? "bg-ink text-cream border-ink shadow-retro-sm"
                : "border-transparent text-ink hover:text-brick hover:border-ink/20"
        }`;

    const navLinks = [
        { to: "/", label: "Home", testId: "nav-home" },
        { to: "/bracket", label: "Bracket", testId: "nav-bracket" },
        { to: "/leaderboard", label: "Leaderboard", testId: "nav-leaderboard" },
        { to: "/fan", label: "Fan Fight 🔥", testId: "nav-fan" },
        { to: "/faq", label: "FAQ", testId: "nav-faq" },
    ];

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="border-b-2 border-ink bg-cream relative z-50" data-testid="site-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link" onClick={closeMenu}>
                    <div className="w-11 h-11 bg-brick border-2 border-ink shadow-retro-sm flex items-center justify-center text-white font-heading text-2xl rotate-[-4deg]">
                        TK
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="font-heading text-xl md:text-3xl text-ink leading-none">TECHNOKICK</div>
                            <img src="/mavs-logo.png" alt="MAV-S" className="h-8 w-[90px] md:h-10 md:w-[120px] object-cover object-left border-2 border-cream/30" data-testid="logo-trophy-img" />
                        </div>
                        <div className="font-mono text-[9px] md:text-[10px] tracking-widest text-teal">2026 · WORLD CUP · BY MAV-S INNOVATIONS</div>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map(({ to, label, testId }) => (
                        <Link key={to} to={to} className={navClass(to)} data-testid={testId} aria-current={isActive(to) ? "page" : undefined}>
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop auth buttons */}
                <div className="hidden md:flex items-center gap-2">
                    {user ? (
                        <>
                            {user.role === "admin" ? (
                                <Link to="/admin" className="btn-retro btn-ink !text-xs !py-2 !px-3" data-testid="nav-admin">Admin Panel</Link>
                            ) : (
                                <Link to="/dashboard" className="btn-retro btn-teal !text-xs !py-2 !px-3" data-testid="nav-dashboard">My Dashboard</Link>
                            )}
                            <button onClick={() => { logout(); navigate("/"); }} className="btn-retro !text-xs !py-2 !px-3" data-testid="logout-btn">
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="btn-retro btn-brick !text-xs !py-2 !px-3" data-testid="login-btn">Login</Link>
                    )}
                </div>

                {/* Mobile: hamburger */}
                <button
                    className="md:hidden flex flex-col justify-center items-center w-10 h-10 border-2 border-ink bg-cream gap-[5px] flex-shrink-0"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="Toggle menu"
                    data-testid="mobile-menu-btn"
                >
                    <span className={`block w-5 h-0.5 bg-ink transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
                    <span className={`block w-5 h-0.5 bg-ink transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
                    <span className={`block w-5 h-0.5 bg-ink transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
                </button>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t-2 border-ink bg-cream" data-testid="mobile-menu">
                    <nav className="flex flex-col px-4 py-3 gap-1">
                        {navLinks.map(({ to, label, testId }) => (
                            <Link
                                key={to}
                                to={to}
                                className={navClass(to)}
                                data-testid={testId}
                                aria-current={isActive(to) ? "page" : undefined}
                                onClick={closeMenu}
                            >
                                {label}
                            </Link>
                        ))}
                        <div className="border-t-2 border-ink/10 mt-2 pt-2 flex flex-col gap-1">
                            {user ? (
                                <>
                                    {user.role === "admin" ? (
                                        <Link to="/admin" className="btn-retro btn-ink !text-xs !py-2 !px-3 text-center" data-testid="nav-admin-mobile" onClick={closeMenu}>Admin Panel</Link>
                                    ) : (
                                        <Link to="/dashboard" className="btn-retro btn-teal !text-xs !py-2 !px-3 text-center" data-testid="nav-dashboard-mobile" onClick={closeMenu}>My Dashboard</Link>
                                    )}
                                    <button
                                        onClick={() => { logout(); navigate("/"); closeMenu(); }}
                                        className="btn-retro !text-xs !py-2 !px-3"
                                        data-testid="logout-btn-mobile"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link to="/login" className="btn-retro btn-brick !text-xs !py-2 !px-3 text-center" data-testid="login-btn-mobile" onClick={closeMenu}>Login</Link>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}

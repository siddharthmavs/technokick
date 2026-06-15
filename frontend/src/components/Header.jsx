import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const loc = useLocation();
    const onAdmin = loc.pathname.startsWith("/admin");

    const isActive = (path) => path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(path);
    const navClass = (path) =>
        `font-body uppercase font-bold text-xs tracking-wider px-3 py-2 border-2 transition-colors ${
            isActive(path)
                ? "bg-ink text-cream border-ink shadow-retro-sm"
                : "border-transparent text-ink hover:text-brick hover:border-ink/20"
        }`;

    return (
        <header className="border-b-2 border-ink bg-cream relative z-10" data-testid="site-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
                    <div className="w-11 h-11 bg-brick border-2 border-ink shadow-retro-sm flex items-center justify-center text-white font-heading text-2xl rotate-[-4deg]">
                        TK
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                        <div className="font-heading text-2xl md:text-3xl text-ink leading-none">TECHNOKICK</div>
                        <img src="/mavs-logo.png"  alt="The World Cup trophy" className="h-10 w-[120px] object-cover object-left border-2 border-cream/30" data-testid="logo-trophy-img" />
                        </div>
                        <div className="font-mono text-[10px] tracking-widest text-teal">2026 · WORLD CUP · BY MAV-S INNOVATIONS</div>
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                    <Link to="/" className={navClass("/")} data-testid="nav-home" aria-current={isActive("/") ? "page" : undefined}>Home</Link>
                    <Link to="/bracket" className={navClass("/bracket")} data-testid="nav-bracket" aria-current={isActive("/bracket") ? "page" : undefined}>Bracket</Link>
                    <Link to="/leaderboard" className={navClass("/leaderboard")} data-testid="nav-leaderboard" aria-current={isActive("/leaderboard") ? "page" : undefined}>Leaderboard</Link>
                    <Link to="/faq" className={navClass("/faq")} data-testid="nav-faq" aria-current={isActive("/faq") ? "page" : undefined}>FAQ</Link>
                </nav>

                <div className="flex items-center gap-2">
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
                        <>
                            <Link to="/login" className="btn-retro btn-brick !text-xs !py-2 !px-3" data-testid="login-btn">Login</Link>
                            {!onAdmin && (
                                <Link to="/admin/login" className="btn-retro !text-xs !py-2 !px-3 hidden sm:inline-flex" data-testid="admin-login-link">Admin</Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

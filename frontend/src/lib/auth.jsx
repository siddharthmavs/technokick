import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("tk_token");
        if (!token) {
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => {
                localStorage.removeItem("tk_token");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const loginUser = async (phone, name, company) => {
        const r = await api.post("/auth/user/login", { phone, name, company });
        localStorage.setItem("tk_token", r.data.token);
        setUser(r.data.user);
        return r.data.user;
    };

    const loginAdmin = async (email, password) => {
        const r = await api.post("/auth/admin/login", { email, password });
        localStorage.setItem("tk_token", r.data.token);
        setUser(r.data.user);
        return r.data.user;
    };

    const logout = () => {
        localStorage.removeItem("tk_token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, loginAdmin, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

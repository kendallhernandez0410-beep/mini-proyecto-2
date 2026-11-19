import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("puravida_token");
    const savedUser = localStorage.getItem("puravida_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("puravida_token");
        localStorage.removeItem("puravida_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data.success) {
      const { token: jwtToken, usuario } = res.data;
      setToken(jwtToken);
      setUser(usuario);
      localStorage.setItem("puravida_token", jwtToken);
      localStorage.setItem("puravida_user", JSON.stringify(usuario));
      return { success: true, usuario };
    }
    return { success: false, error: res.data.error };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("puravida_token");
    localStorage.removeItem("puravida_user");
  };

  const isRRHH = user?.rol === "rrhh";
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isRRHH,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}


import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(null);

  async function login(email, password) {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    const newToken = response.data.token;

    if (!newToken) {
      throw new Error("Login response did not contain a token.");
    }

    localStorage.setItem("token", newToken);
    setToken(newToken);

    try {
      const userResponse = await api.get("/api/auth/me");
      setUser(userResponse.data.user || userResponse.data);
    } catch {
      setUser(response.data.user || null);
    }

    return response.data;
  }

  async function register(name, email, password) {
    const response = await api.post("/api/auth/register", {
      name,
      email,
      password,
    });

    return response.data;
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

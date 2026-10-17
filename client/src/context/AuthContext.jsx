
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(null);

  // Load the logged-in user's information, including after refresh.
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let isActive = true;

    async function fetchUser() {
      try {
        const response = await api.get("/api/auth/me");

        if (isActive) {
          setUser(response.data.user || response.data);
        }
      } catch (error) {
        if (isActive) {
          setUser(null);
        }
      }
    }

    fetchUser();

    return () => {
      isActive = false;
    };
  }, [token]);

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
    setUser(response.data.user || null);

    // Refresh the user details from the authenticated endpoint.
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

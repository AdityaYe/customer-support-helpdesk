import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "helpdesk_user";

function getStoredUser() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function extractUser(response) {
  return (
    response?.data?.data?.user ||
    response?.data?.user ||
    response?.data?.data ||
    null
  );
}

function saveUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const response = await api.get("/auth/me");
        const currentUser = extractUser(response);

        if (mounted && currentUser) {
          setUser(currentUser);
          saveUser(currentUser);
        }
      } catch {
        if (mounted) {
          setUser(null);
          saveUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async ({ email, password }) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const currentUser = extractUser(response);

    if (!currentUser) {
      throw new Error("Login succeeded but no user was returned.");
    }

    setUser(currentUser);
    saveUser(currentUser);

    return currentUser;
  };

  const register = async ({ name, email, password }) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    const registeredUser = extractUser(response);

    if (registeredUser) {
      setUser(registeredUser);
      saveUser(registeredUser);
    }

    return registeredUser;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      saveUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

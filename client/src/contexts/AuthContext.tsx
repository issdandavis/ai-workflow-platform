/**
 * Auth Context - Manages authentication state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "../lib/api";

interface User {
  id: string;
  email: string;
  role: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await auth.me();
      setUser(userData);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const userData = await auth.login(email, password);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    setError(null);
    try {
      const userData = await auth.signup(email, password);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || "Signup failed");
      throw err;
    }
  };

  const loginAsGuest = async () => {
    setError(null);
    try {
      const userData = await auth.guest();
      setUser({ ...userData, isGuest: true });
    } catch (err: any) {
      setError(err.message || "Guest login failed");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (err) {
      // Ignore logout errors
    }
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginAsGuest, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

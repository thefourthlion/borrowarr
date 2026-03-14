"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface UserPermissions {
  admin: boolean;
  manage_users: boolean;
  request: boolean;
  auto_approve: boolean;
  manage_requests: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  permissions?: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Get tokens from localStorage
  const getTokens = () => {
    if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
    };
  };

  // Set tokens in localStorage
  const setTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    }
  };

  // Clear tokens from localStorage
  const clearTokens = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  };

  // Shared refresh promise so concurrent 401s don't each trigger a refresh
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  // Set up axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const isAuthEndpoint =
          originalRequest?.url?.includes("/api/auth/refresh") ||
          originalRequest?.url?.includes("/api/auth/verify");

        // Never retry refresh/verify with another refresh (stops 401 loop)
        if (isAuthEndpoint) {
          if (originalRequest?.url?.includes("/api/auth/refresh")) {
            clearTokens();
            setUser(null);
          }
          return Promise.reject(error);
        }

        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;

        const { refreshToken: token } = getTokens();
        if (!token) {
          clearTokens();
          setUser(null);
          return Promise.reject(error);
        }

        try {
          // One refresh at a time: reuse in-flight refresh promise
          if (!refreshPromiseRef.current) {
            refreshPromiseRef.current = axios
              .post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken: token })
              .then((res) => {
                const newAccess = res.data?.accessToken;
                if (newAccess) setTokens(newAccess, token);
                return newAccess;
              })
              .catch((err) => {
                clearTokens();
                setUser(null);
                return null;
              })
              .finally(() => {
                refreshPromiseRef.current = null;
              });
          }
          const newAccessToken = await refreshPromiseRef.current;
          if (!newAccessToken) return Promise.reject(error);
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Set up axios interceptor to add token to requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const { accessToken } = getTokens();
        if (accessToken) {
          config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { accessToken } = getTokens();
        if (!accessToken) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password,
      });

      const { user, accessToken, refreshToken } = response.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Login failed");
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username,
        email,
        password,
      });

      const { user, accessToken, refreshToken } = response.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Registration failed");
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const refreshToken = async () => {
    try {
      const { refreshToken: token } = getTokens();
      if (!token) {
        throw new Error("No refresh token");
      }

      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken: token,
      });

      const { accessToken } = response.data;
      setTokens(accessToken, token);
    } catch (error: any) {
      clearTokens();
      setUser(null);
      throw new Error(error.response?.data?.error || "Token refresh failed");
    }
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      const { accessToken } = getTokens();
      const response = await axios.put(
        `${API_BASE_URL}/api/auth/profile`,
        data,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Update failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshToken, updateUser }}
    >
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


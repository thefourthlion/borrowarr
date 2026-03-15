"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

/** Normalize title+year for matching (must match server) */
export const normalizePlexKey = (
  title: string,
  year: number | string | undefined,
  type: "movie" | "tv"
) => {
  const t = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const plexType = type === "tv" ? "show" : "movie";
  const y = year ? String(year) : "";
  return `${plexType}:${t}:${y}`;
};

export function usePlexLibrary() {
  const { user } = useAuth();
  const [plexKeys, setPlexKeys] = useState<Set<string>>(new Set());
  const [hasConnection, setHasConnection] = useState(false);
  const [loading, setLoading] = useState(true);

  const isInPlex = useCallback(
    (title: string, year?: number | string, type: "movie" | "tv" = "movie") => {
      if (!hasConnection || !user) return false;
      const key = normalizePlexKey(title, year, type);
      return plexKeys.has(key);
    },
    [hasConnection, user, plexKeys]
  );

  useEffect(() => {
    if (!user) {
      setPlexKeys(new Set());
      setHasConnection(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const [connRes, keysRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/PlexConnection`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/PlexConnection/library-keys`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (cancelled) return;

        const connected =
          connRes.data?.connected && connRes.data?.isConnected;
        setHasConnection(!!connected);

        if (keysRes.data?.success && keysRes.data?.keys) {
          setPlexKeys(new Set(keysRes.data.keys));
        } else {
          setPlexKeys(new Set());
        }
      } catch {
        if (!cancelled) {
          setHasConnection(false);
          setPlexKeys(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    hasConnection,
    plexKeys,
    isInPlex,
    loading,
  };
}

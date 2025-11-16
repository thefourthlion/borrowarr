"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@nextui-org/input";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Search as SearchIcon, Download, Link as LinkIcon, Check, X } from "lucide-react";
import axios, { CancelTokenSource } from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParams } from "next/navigation";
import "../../../styles/Search.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCached(key: string, data: any, ttl: number = CACHE_TTL) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

interface SearchResult {
  id: string;
  protocol: "torrent" | "nzb";
  age: number;
  ageFormatted: string;
  title: string;
  indexer: string;
  indexerId: number;
  size: number;
  sizeFormatted: string;
  seeders: number | null;
  leechers: number | null;
  downloadUrl: string;
}

interface Indexer {
  id: number;
  name: string;
  protocol: "torrent" | "nzb";
  enabled: boolean;
}

const Search = () => {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [selectedIndexers, setSelectedIndexers] = useState<Set<string>>(new Set());
  const [grabbing, setGrabbing] = useState<Set<string>>(new Set());
  const [grabSuccess, setGrabSuccess] = useState<Set<string>>(new Set());
  const [grabError, setGrabError] = useState<Map<string, string>>(new Map());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const isInitialMount = useRef(true);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const fetchIndexers = useCallback(async () => {
    // Only fetch indexers if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      setIndexers([]);
      return;
    }

    const cacheKey = "indexers";
    const cached = getCached(cacheKey);
    if (cached) {
      const enabledIndexers = cached.filter((idx: Indexer) => idx.enabled);
      setIndexers(enabledIndexers);
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });
      const enabledIndexers = (response.data.data || []).filter(
        (idx: Indexer) => idx.enabled
      );
      setIndexers(enabledIndexers);
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      setCached(cacheKey, response.data.data || [], 5 * 60 * 1000);
    } catch (error: any) {
      if (axios.isCancel(error)) return;
      console.error("Error fetching indexers:", error);
      setIndexers([]);
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) return;

    const cacheKey = `search:${debouncedQuery.trim()}:${Array.from(selectedIndexers).sort().join(",")}`;
    const cached = getCached(cacheKey);
    if (cached) {
      let results = cached.results || [];
      // Backend already handles search filtering, so we just sort by seeders
      results.sort((a: SearchResult, b: SearchResult) => {
        const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
        const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
        return bSeeders - aSeeders;
      });
      console.log(`[Search] Using cached results: ${results.length}`);
      setResults(results);
      setLoading(false);
      return;
    }

    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("New search initiated");
    }

    const cancelToken = axios.CancelToken.source();
    cancelTokenRef.current = cancelToken;

    try {
      setLoading(true);
      const params: any = {
        query: debouncedQuery.trim(),
        sortBy: "seeders",
        sortOrder: "desc",
        limit: 1000,
        offset: 0,
      };

      if (selectedIndexers.size > 0) {
        params.indexerIds = Array.from(selectedIndexers);
      }

      const response = await axios.get(`${API_BASE_URL}/api/Search`, {
        params,
        cancelToken: cancelToken.token,
        timeout: 30000,
      });

      if (response.data) {
        let results = response.data.results || [];
        
        console.log(`[Search] Received ${results.length} results from API`);
        if (results.length > 0) {
          console.log(`[Search] First result:`, {
            title: results[0].title,
            indexer: results[0].indexer,
            seeders: results[0].seeders,
            downloadUrl: results[0].downloadUrl?.substring(0, 50)
          });
        }

        // Backend already handles search filtering, so we just sort by seeders
        results.sort((a: SearchResult, b: SearchResult) => {
          const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
          const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
          return bSeeders - aSeeders;
        });

        console.log(`[Search] Setting ${results.length} results to state`);
        setResults(results);
        setCached(cacheKey, { results }, 2 * 60 * 1000);
      } else {
        console.log(`[Search] No data in response:`, response.data);
        setResults([]);
      }
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return;
      }
      console.error("Error performing search:", error);
      setResults([]);
    } finally {
      setLoading(false);
      cancelTokenRef.current = null;
    }
  }, [debouncedQuery, selectedIndexers]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchIndexers().catch((err) => {
        console.error("Error fetching indexers:", err);
      });
    }
  }, [fetchIndexers]);

  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      setSearchQuery(urlQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel("Component unmounting");
      }
    };
  }, []);

  useEffect(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("New search initiated");
    }

    if (debouncedQuery.trim()) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, selectedIndexers, performSearch]);

  const handleSearch = useCallback(() => {
    setSearchQuery(query);
  }, [query]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);

  const toggleIndexer = useCallback((indexerId: string) => {
    setSelectedIndexers((prev) => {
      const next = new Set(prev);
      if (next.has(indexerId)) {
        next.delete(indexerId);
      } else {
        next.add(indexerId);
      }
      return next;
    });
  }, []);

  const removeIndexer = useCallback((indexerId: string) => {
    setSelectedIndexers((prev) => {
      const next = new Set(prev);
      next.delete(indexerId);
      return next;
    });
  }, []);


  const handleGrabRelease = useCallback(async (result: SearchResult) => {
    if (!result.downloadUrl) {
      alert("No download URL available for this release");
      return;
    }

    setGrabbing((prev) => new Set(prev).add(result.id));
    setGrabError((prev) => {
      const next = new Map(prev);
      next.delete(result.id);
      return next;
    });
    setGrabSuccess((prev) => {
      const next = new Set(prev);
      next.delete(result.id);
      return next;
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
        downloadUrl: result.downloadUrl,
      });

      if (response.data.success) {
        setGrabSuccess((prev) => new Set(prev).add(result.id));
        setTimeout(() => {
          setGrabSuccess((prev) => {
            const next = new Set(prev);
            next.delete(result.id);
            return next;
          });
        }, 3000);
      } else {
        throw new Error(response.data.error || "Failed to grab release");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to grab release";
      setGrabError((prev) => new Map(prev).set(result.id, errorMsg));
      setTimeout(() => {
        setGrabError((prev) => {
          const next = new Map(prev);
          next.delete(result.id);
          return next;
        });
      }, 5000);
    } finally {
      setGrabbing((prev) => {
        const next = new Set(prev);
        next.delete(result.id);
        return next;
      });
    }
  }, []);

  const handleCopyMagnetLink = useCallback(async (result: SearchResult) => {
    if (!result.downloadUrl) {
      alert("No download URL available for this release");
      return;
    }

    try {
      await navigator.clipboard.writeText(result.downloadUrl);
      setCopiedLink(result.id);
      setTimeout(() => {
        setCopiedLink(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link to clipboard");
    }
  }, []);


    return (
    <div className="Search page min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                Search Indexers
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                Search torrents across all your indexers
                  </p>
                </div>
              </div>
        </div>
      </div>
        
      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="container w-[95vw] sm:w-[92vw] md:w-[90vw] lg:w-[88vw] xl:w-[85vw] 2xl:w-[82vw] mx-auto space-y-4 sm:space-y-6">
          {/* Search Bar & Indexer Filter */}
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
          <div className="w-full">
                <Input
                  placeholder="Search torrents..."
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
              startContent={<SearchIcon size={20} className="text-secondary" />}
                  size="lg"
              classNames={{
                base: "w-full",
                inputWrapper: "w-full bg-content2 border border-secondary/20 hover:border-secondary/40 transition-colors",
              }}
            />
              </div>

          {/* Indexer Toggle Chips */}
          {indexers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {indexers.map((indexer) => {
                const isSelected = selectedIndexers.has(indexer.id.toString());
                return (
                  <Chip
                    key={indexer.id}
                    size="sm"
                    variant="bordered"
                    color={isSelected ? "secondary" : "default"}
                    onClose={isSelected ? () => removeIndexer(indexer.id.toString()) : undefined}
                    onClick={() => toggleIndexer(indexer.id.toString())}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? "border-secondary text-secondary" 
                        : "border-default-300 text-default-500 hover:border-default-400"
                    }`}
                  >
                    {indexer.name}
                  </Chip>
                );
              })}
                </div>
              )}
            </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : results.length > 0 ? (
          <div className="overflow-x-auto -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6">
            <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-divider">
                  <th key="title" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Title</th>
                  <th key="indexer" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold hidden sm:table-cell">Indexer</th>
                  <th key="size" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold hidden md:table-cell">Size</th>
                  <th key="seeders" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Seeders</th>
                  <th key="leechers" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold hidden lg:table-cell">Leechers</th>
                  <th key="age" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold hidden md:table-cell">Age</th>
                  <th key="actions" className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                {results.map((result, index) => (
                        <tr
                          key={`${result.id}-${index}`}
                          className="border-b border-divider hover:bg-content2 transition-colors"
                        >
                    <td className="p-3 sm:p-4 font-medium">
                            <div className="flex flex-col gap-1">
                        <span className="text-xs sm:text-sm break-words">{result.title}</span>
                        <div className="flex flex-wrap gap-2 sm:hidden text-xs text-default-500">
                          <span>{result.indexer}</span>
                          <span>{result.sizeFormatted}</span>
                          <span>{result.ageFormatted}</span>
                              </div>
                            </div>
                          </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm hidden sm:table-cell">{result.indexer}</td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm hidden md:table-cell">{result.sizeFormatted}</td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">
                            {result.seeders !== null && result.seeders !== undefined ? result.seeders.toLocaleString() : "-"}
                          </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm hidden lg:table-cell">
                            {result.leechers !== null && result.leechers !== undefined ? result.leechers.toLocaleString() : "-"}
                          </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm hidden md:table-cell">{result.ageFormatted}</td>
                    <td className="p-3 sm:p-4">
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={() => handleGrabRelease(result)}
                          disabled={!result.downloadUrl || grabbing.has(result.id)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-content3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={grabSuccess.has(result.id) ? "Grabbed successfully" : grabError.get(result.id) || "Grab release"}
                              >
                          {grabbing.has(result.id) ? (
                            <Spinner size="sm" />
                          ) : grabSuccess.has(result.id) ? (
                            <Check size={14} className="sm:w-4 sm:h-4 text-success" />
                                ) : (
                            <Download size={14} className="sm:w-4 sm:h-4 text-secondary" />
                                )}
                        </button>
                        <button
                          onClick={() => handleCopyMagnetLink(result)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-content3 transition-colors"
                                title={copiedLink === result.id ? "Copied!" : "Copy magnet link"}
                              >
                                {copiedLink === result.id ? (
                            <Check size={14} className="sm:w-4 sm:h-4 text-success" />
                                ) : (
                            <LinkIcon size={14} className="sm:w-4 sm:h-4 text-secondary" />
                                )}
                        </button>
                            </div>
                          </td>
                        </tr>
                ))}
                    </tbody>
                  </table>
                </div>
        ) : searchQuery ? (
              <div className="text-center py-12">
            <p className="text-default-500 text-sm sm:text-base">No results found for &quot;{searchQuery}&quot;</p>
                      </div>
        ) : null}
              </div>
            </div>
        </div>
    );
};

export default Search;

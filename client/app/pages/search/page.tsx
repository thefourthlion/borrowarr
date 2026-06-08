"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@nextui-org/input";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";
import {
  Search as SearchIcon,
  Download,
  Link as LinkIcon,
  Check,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from "lucide-react";
import axios, { CancelTokenSource } from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import { PageContent, PageHeader } from "@/components/page-header";
import "../../../styles/Search.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

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

const getStableRequestId = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
};

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
  categories?: number[]; // Category IDs: 2000=Movies, 5000=TV
}

interface Indexer {
  id: number;
  name: string;
  protocol: "torrent" | "nzb";
  enabled: boolean;
}

const Search = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [selectedIndexers, setSelectedIndexers] = useState<Set<string>>(
    new Set(),
  );
  const [grabbing, setGrabbing] = useState<Set<string>>(new Set());
  const [grabSuccess, setGrabSuccess] = useState<Set<string>>(new Set());
  const [grabError, setGrabError] = useState<Map<string, string>>(new Map());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [indexerSearchQuery, setIndexerSearchQuery] = useState("");
  const [fetchingIndexers, setFetchingIndexers] = useState(false);

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const isInitialMount = useRef(true);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const fetchIndexers = useCallback(async () => {
    // Only fetch indexers if user is authenticated
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    console.log(
      "[Search] Fetching indexers, user:",
      user ? "logged in" : "not logged in",
      "token:",
      accessToken ? "exists" : "missing",
    );

    if (!user || !accessToken) {
      console.log("[Search] No user or token, skipping indexer fetch");
      setIndexers([]);
      return;
    }

    const cacheKey = `indexers:${user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log("[Search] Using cached indexers:", cached.length);
      const enabledIndexers = cached.filter((idx: Indexer) => idx.enabled);
      setIndexers(enabledIndexers);
      setSelectedIndexers(
        new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())),
      );
      return;
    }

    try {
      setFetchingIndexers(true);
      console.log("[Search] Fetching indexers from API...");
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      console.log("[Search] Indexers response:", response.data);

      const allIndexers = response.data.data || [];
      const enabledIndexers = allIndexers.filter((idx: Indexer) => idx.enabled);

      console.log(
        "[Search] Total indexers:",
        allIndexers.length,
        "Enabled:",
        enabledIndexers.length,
      );

      setIndexers(enabledIndexers);
      setSelectedIndexers(
        new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())),
      );
      setCached(cacheKey, allIndexers, 5 * 60 * 1000);
    } catch (error: any) {
      if (axios.isCancel(error)) return;
      console.error(
        "[Search] Error fetching indexers:",
        error.response?.data || error.message,
      );
      setIndexers([]);
    } finally {
      setFetchingIndexers(false);
    }
  }, [user]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) return;

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    if (!user || !accessToken || selectedIndexers.size === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const cacheKey = `search:${debouncedQuery.trim()}:${Array.from(selectedIndexers).sort().join(",")}`;
    const cached = getCached(cacheKey);
    if (cached) {
      let results = cached.results || [];
      // Sort by indexer priority first (lower = higher priority), then by seeders descending
      results.sort((a: SearchResult, b: SearchResult) => {
        // First compare by indexer priority
        const aPriority = (a as any).indexerPriority ?? 25;
        const bPriority = (b as any).indexerPriority ?? 25;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Then sort by seeders (descending)
        const aSeeders =
          a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
        const bSeeders =
          b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
            downloadUrl: results[0].downloadUrl?.substring(0, 50),
          });
        }

        // Sort by indexer priority first (lower = higher priority), then by seeders descending
        results.sort((a: SearchResult, b: SearchResult) => {
          // First compare by indexer priority
          const aPriority = (a as any).indexerPriority ?? 25;
          const bPriority = (b as any).indexerPriority ?? 25;
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          // Then sort by seeders (descending)
          const aSeeders =
            a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
          const bSeeders =
            b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
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
  }, [debouncedQuery, selectedIndexers, user]);

  useEffect(() => {
    if (user) {
      console.log("[Search] User detected, fetching indexers...");
      fetchIndexers().catch((err) => {
        console.error("Error fetching indexers:", err);
      });
    } else {
      console.log("[Search] No user, clearing indexers");
      setIndexers([]);
      setSelectedIndexers(new Set());
    }
  }, [user, fetchIndexers]);

  useEffect(() => {
    const urlQuery = searchParams.get("q");
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

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

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
      const hasAutoApprove =
        user?.permissions?.auto_approve || user?.permissions?.admin;

      // Extract quality from title
      const titleLower = result.title.toLowerCase();
      let quality = "SD";
      if (
        titleLower.includes("2160p") ||
        titleLower.includes("4k") ||
        titleLower.includes("uhd")
      ) {
        quality = "2160p";
      } else if (titleLower.includes("1080p")) {
        quality = "1080p";
      } else if (titleLower.includes("720p")) {
        quality = "720p";
      }

      // Determine mediaType from categories (2xxx = movies, 5xxx = TV)
      // This must match category names in download client settings: 'movies', 'tv', 'universal'
      let mediaType: string | undefined = undefined;
      if (result.categories && result.categories.length > 0) {
        const categoryId = result.categories[0];
        if (categoryId >= 2000 && categoryId < 3000) {
          mediaType = "movies"; // Movie categories (2000-2999)
        } else if (categoryId >= 5000 && categoryId < 6000) {
          mediaType = "tv"; // TV categories (5000-5999)
        }
      }

      if (!hasAutoApprove) {
        const inferredMediaType =
          mediaType === "tv" ? "series" : "movie";
        const syntheticTmdbId = getStableRequestId(
          `${inferredMediaType}:${result.title.toLowerCase().trim()}`,
        );

        await axios.post(`${API_BASE_URL}/api/MediaRequests`, {
          mediaType: inferredMediaType,
          tmdbId: syntheticTmdbId,
          title: result.title,
          overview: null,
          posterPath: null,
          releaseDate: null,
          qualityProfile: "any",
          requestNote: `Requested from Search page. Release: ${result.title} | Indexer: ${result.indexer}`,
        });

        setGrabSuccess((prev) => new Set(prev).add(result.id));
        setTimeout(() => {
          setGrabSuccess((prev) => {
            const next = new Set(prev);
            next.delete(result.id);
            return next;
          });
        }, 3000);
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/DownloadClients/grab`,
        {
          downloadUrl: result.downloadUrl,
          protocol: result.protocol, // Pass protocol so backend selects correct client by priority
          mediaType: mediaType, // For category selection: 'movies', 'tv', or undefined
          // History information
          releaseName: result.title,
          indexer: result.indexer,
          indexerId: result.indexerId,
          size: result.size,
          sizeFormatted: result.sizeFormatted,
          seeders: result.seeders,
          leechers: result.leechers,
          quality: quality,
          source: "SearchPage",
        },
      );

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
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to grab release";
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
  }, [user]);

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

  const selectAllIndexers = useCallback(() => {
    setSelectedIndexers(new Set(indexers.map((idx) => idx.id.toString())));
  }, [indexers]);

  const selectNoneIndexers = useCallback(() => {
    setSelectedIndexers(new Set());
  }, []);

  const selectIndexersByProtocol = useCallback(
    (protocol: "torrent" | "nzb") => {
      const filteredIndexers = indexers
        .filter((idx) => idx.protocol === protocol)
        .map((idx) => idx.id.toString());
      setSelectedIndexers(new Set(filteredIndexers));
    },
    [indexers],
  );

  // Filter indexers based on search query
  const filteredIndexers = indexers.filter((indexer) =>
    indexer.name.toLowerCase().includes(indexerSearchQuery.toLowerCase()),
  );

  // Group indexers by protocol
  const torrentIndexers = filteredIndexers.filter(
    (idx) => idx.protocol === "torrent",
  );
  const nzbIndexers = filteredIndexers.filter((idx) => idx.protocol === "nzb");

  return (
    <div className="Search page min-h-screen bg-background">
      <PageHeader
        actions={
          <Button
            aria-label="Go back"
            className="flex-shrink-0"
            isIconOnly
            onPress={() => router.back()}
            size="sm"
            variant="light"
          >
            <ChevronLeft size={20} />
          </Button>
        }
        className="z-40"
        description={
          results.length > 0
            ? `${results.length} results found`
            : "Search torrents across all your indexers"
        }
        icon={<SearchIcon className="h-6 w-6" />}
        title={searchQuery ? `Search: "${searchQuery}"` : "Search Indexers"}
        width="wide"
      >
        <div className="w-full">
          <Input
            classNames={{
              base: "w-full",
              inputWrapper:
                "bg-content2 border border-secondary/20 hover:border-secondary/40 focus-within:border-secondary/60 transition-colors",
            }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            onKeyPress={handleKeyPress}
            placeholder="Search torrents (e.g., 'Shrek 2001', 'The Matrix')..."
            size="lg"
            startContent={<SearchIcon className="text-secondary" size={20} />}
            value={query}
          />
        </div>
      </PageHeader>

      {/* Content */}
      <PageContent width="wide">
        <div className="space-y-4 sm:space-y-6">
          {/* Indexer Filter Section */}
          {fetchingIndexers ? (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl p-6 text-center">
              <Spinner className="mb-2" size="sm" />
              <p className="text-sm text-foreground/60">
                Loading your indexers...
              </p>
            </div>
          ) : !user ? (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl p-6 text-center">
              <p className="text-sm text-foreground/60">
                Please log in to search indexers
              </p>
            </div>
          ) : indexers.length === 0 ? (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl p-6 text-center">
              <Filter className="text-foreground/40 mx-auto mb-3" size={32} />
              <p className="text-sm font-semibold text-foreground mb-1">
                No Indexers Found
              </p>
              <p className="text-xs text-foreground/60 mb-4">
                Add indexers in Settings to start searching
              </p>
              <Button
                as="a"
                color="secondary"
                href="/pages/indexers"
                size="sm"
                variant="flat"
              >
                Add Indexers
              </Button>
            </div>
          ) : (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl overflow-hidden">
              {/* Filter Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-content2 transition-colors"
                onClick={() => setShowFilters(!showFilters)}
              >
                <div className="flex items-center gap-3">
                  <Filter className="text-secondary" size={20} />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Filter by Indexers
                    </h3>
                    <p className="text-xs text-foreground/60">
                      {selectedIndexers.size} of {indexers.length} selected
                    </p>
                  </div>
                </div>
                {showFilters ? (
                  <ChevronUp className="text-foreground/60" size={20} />
                ) : (
                  <ChevronDown className="text-foreground/60" size={20} />
                )}
              </div>

              {/* Filter Content */}
              {showFilters && (
                <div className="border-t border-secondary/20 p-4 space-y-4">
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="text-xs"
                      color="secondary"
                      onClick={selectAllIndexers}
                      size="sm"
                      variant="flat"
                    >
                      Select All
                    </Button>
                    <Button
                      className="text-xs"
                      color="default"
                      onClick={selectNoneIndexers}
                      size="sm"
                      variant="flat"
                    >
                      Select None
                    </Button>
                    {torrentIndexers.length > 0 && (
                      <Button
                        className="text-xs"
                        color="secondary"
                        onClick={() => selectIndexersByProtocol("torrent")}
                        size="sm"
                        variant="flat"
                      >
                        Torrents Only
                      </Button>
                    )}
                    {nzbIndexers.length > 0 && (
                      <Button
                        className="text-xs"
                        color="secondary"
                        onClick={() => selectIndexersByProtocol("nzb")}
                        size="sm"
                        variant="flat"
                      >
                        NZB Only
                      </Button>
                    )}
                  </div>

                  {/* Search Indexers */}
                  {indexers.length > 5 && (
                    <Input
                      classNames={{
                        inputWrapper: "bg-content1 border border-secondary/20",
                      }}
                      onChange={(e) => setIndexerSearchQuery(e.target.value)}
                      placeholder="Search indexers..."
                      size="sm"
                      startContent={
                        <SearchIcon className="text-secondary" size={16} />
                      }
                      value={indexerSearchQuery}
                    />
                  )}

                  {/* Torrent Indexers */}
                  {torrentIndexers.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                        Torrent Indexers ({torrentIndexers.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {torrentIndexers.map((indexer) => {
                          const isSelected = selectedIndexers.has(
                            indexer.id.toString(),
                          );
                          return (
                            <Chip
                              className={`cursor-pointer transition-all ${
                                isSelected
                                  ? "border-secondary text-secondary"
                                  : "border-default-300 text-default-500 hover:border-default-400"
                              }`}
                              color={isSelected ? "secondary" : "default"}
                              key={indexer.id}
                              onClick={() =>
                                toggleIndexer(indexer.id.toString())
                              }
                              onClose={
                                isSelected
                                  ? () => removeIndexer(indexer.id.toString())
                                  : undefined
                              }
                              size="sm"
                              variant={isSelected ? "flat" : "bordered"}
                            >
                              {indexer.name}
                            </Chip>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* NZB Indexers */}
                  {nzbIndexers.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                        NZB Indexers ({nzbIndexers.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {nzbIndexers.map((indexer) => {
                          const isSelected = selectedIndexers.has(
                            indexer.id.toString(),
                          );
                          return (
                            <Chip
                              className={`cursor-pointer transition-all ${
                                isSelected
                                  ? "border-secondary text-secondary"
                                  : "border-default-300 text-default-500 hover:border-default-400"
                              }`}
                              color={isSelected ? "secondary" : "default"}
                              key={indexer.id}
                              onClick={() =>
                                toggleIndexer(indexer.id.toString())
                              }
                              onClose={
                                isSelected
                                  ? () => removeIndexer(indexer.id.toString())
                                  : undefined
                              }
                              size="sm"
                              variant={isSelected ? "flat" : "bordered"}
                            >
                              {indexer.name}
                            </Chip>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No Results Message */}
                  {filteredIndexers.length === 0 && indexerSearchQuery && (
                    <div className="text-center py-4 text-foreground/60 text-sm">
                      No indexers found matching &quot;{indexerSearchQuery}
                      &quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner color="secondary" size="lg" />
              <p className="text-foreground/60 mt-4">Searching indexers...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {/* Results Header */}
              <div className="flex items-center justify-between px-2">
                <p className="text-sm text-foreground/60">
                  Showing {results.length}{" "}
                  {results.length === 1 ? "result" : "results"}
                </p>
                <Chip color="secondary" size="sm" variant="flat">
                  {selectedIndexers.size} indexer
                  {selectedIndexers.size !== 1 ? "s" : ""} selected
                </Chip>
              </div>

              {/* Results List */}
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-xl p-4 hover:bg-content2 hover:border-secondary/40 transition-all duration-200 group"
                    key={`${result.id}-${index}`}
                  >
                    <div className="flex flex-col gap-3">
                      {/* Title Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 group-hover:text-secondary transition-colors">
                            {result.title}
                          </h3>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            className="hover:scale-110 transition-transform"
                            color="secondary"
                            disabled={
                              !result.downloadUrl || grabbing.has(result.id)
                            }
                            isIconOnly
                            onClick={() => handleGrabRelease(result)}
                            size="sm"
                            title={
                              grabSuccess.has(result.id)
                                ? user?.permissions?.auto_approve ||
                                  user?.permissions?.admin
                                  ? "Grabbed successfully"
                                  : "Request submitted"
                                : grabError.get(result.id) ||
                                  (user?.permissions?.auto_approve ||
                                  user?.permissions?.admin
                                    ? "Grab release"
                                    : "Request release")
                            }
                            variant="flat"
                          >
                            {grabbing.has(result.id) ? (
                              <Spinner color="white" size="sm" />
                            ) : grabSuccess.has(result.id) ? (
                              <Check className="text-success" size={16} />
                            ) : (
                              <Download size={16} />
                            )}
                          </Button>
                          <Button
                            className="hover:scale-110 transition-transform"
                            color="secondary"
                            isIconOnly
                            onClick={() => handleCopyMagnetLink(result)}
                            size="sm"
                            title={
                              copiedLink === result.id
                                ? "Copied!"
                                : "Copy magnet link"
                            }
                            variant="light"
                          >
                            {copiedLink === result.id ? (
                              <Check className="text-success" size={16} />
                            ) : (
                              <LinkIcon size={16} />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-foreground/70">
                        <Chip
                          className="text-xs"
                          color="secondary"
                          size="sm"
                          variant="flat"
                        >
                          {result.indexer}
                        </Chip>
                        <Chip className="text-xs" size="sm" variant="flat">
                          {result.sizeFormatted}
                        </Chip>
                        <Chip className="text-xs" size="sm" variant="flat">
                          {result.ageFormatted}
                        </Chip>
                        {result.protocol === "torrent" &&
                          result.seeders !== null &&
                          result.seeders !== undefined && (
                            <Chip
                              className="text-xs"
                              color={
                                result.seeders > 50
                                  ? "success"
                                  : result.seeders > 10
                                    ? "warning"
                                    : "default"
                              }
                              size="sm"
                              variant="flat"
                            >
                              🌱 {result.seeders.toLocaleString()}
                            </Chip>
                          )}
                        {result.protocol === "torrent" &&
                          result.leechers !== null &&
                          result.leechers !== undefined && (
                            <Chip
                              className="text-xs hidden sm:inline-flex"
                              size="sm"
                              variant="flat"
                            >
                              📥 {result.leechers.toLocaleString()}
                            </Chip>
                          )}
                        {result.protocol && (
                          <Chip
                            className="text-xs"
                            color={
                              result.protocol === "torrent"
                                ? "secondary"
                                : "primary"
                            }
                            size="sm"
                            variant="flat"
                          >
                            {result.protocol.toUpperCase()}
                          </Chip>
                        )}
                      </div>

                      {/* Error Message */}
                      {grabError.has(result.id) && (
                        <div className="text-xs text-danger bg-danger/10 px-3 py-2 rounded-lg">
                          {grabError.get(result.id)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="text-foreground/20 mb-4" size={48} />
              <p className="text-foreground/80 font-semibold text-lg mb-2">
                No results found
              </p>
              <p className="text-foreground/60 text-sm max-w-md">
                No torrents found for &quot;{searchQuery}&quot;. Try a different
                search term or select more indexers.
              </p>
            </div>
          ) : null}
        </div>
      </PageContent>
    </div>
  );
};

export default Search;

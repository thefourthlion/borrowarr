"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@nextui-org/input";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";
import { Search as SearchIcon, Download, Link as LinkIcon, Check, X, Filter, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";
import axios, { CancelTokenSource } from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
  const [selectedIndexers, setSelectedIndexers] = useState<Set<string>>(new Set());
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
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null;
    
    console.log('[Search] Fetching indexers, user:', user ? 'logged in' : 'not logged in', 'token:', accessToken ? 'exists' : 'missing');
    
    if (!user || !accessToken) {
      console.log('[Search] No user or token, skipping indexer fetch');
      setIndexers([]);
      return;
    }

    const cacheKey = `indexers:${user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[Search] Using cached indexers:', cached.length);
      const enabledIndexers = cached.filter((idx: Indexer) => idx.enabled);
      setIndexers(enabledIndexers);
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      return;
    }

    try {
      setFetchingIndexers(true);
      console.log('[Search] Fetching indexers from API...');
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });
      
      console.log('[Search] Indexers response:', response.data);
      
      const allIndexers = response.data.data || [];
      const enabledIndexers = allIndexers.filter((idx: Indexer) => idx.enabled);
      
      console.log('[Search] Total indexers:', allIndexers.length, 'Enabled:', enabledIndexers.length);
      
      setIndexers(enabledIndexers);
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      setCached(cacheKey, allIndexers, 5 * 60 * 1000);
    } catch (error: any) {
      if (axios.isCancel(error)) return;
      console.error("[Search] Error fetching indexers:", error.response?.data || error.message);
      setIndexers([]);
    } finally {
      setFetchingIndexers(false);
    }
  }, [user]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) return;

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

        // Sort by indexer priority first (lower = higher priority), then by seeders descending
        results.sort((a: SearchResult, b: SearchResult) => {
          // First compare by indexer priority
          const aPriority = (a as any).indexerPriority ?? 25;
          const bPriority = (b as any).indexerPriority ?? 25;
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          // Then sort by seeders (descending)
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
    if (user) {
      console.log('[Search] User detected, fetching indexers...');
      fetchIndexers().catch((err) => {
        console.error("Error fetching indexers:", err);
      });
    } else {
      console.log('[Search] No user, clearing indexers');
      setIndexers([]);
    }
  }, [user, fetchIndexers]);

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
      // Extract quality from title
      const titleLower = result.title.toLowerCase();
      let quality = 'SD';
      if (titleLower.includes('2160p') || titleLower.includes('4k') || titleLower.includes('uhd')) {
        quality = '2160p';
      } else if (titleLower.includes('1080p')) {
        quality = '1080p';
      } else if (titleLower.includes('720p')) {
        quality = '720p';
      }

      // Determine mediaType from categories (2xxx = movies, 5xxx = TV)
      // This must match category names in download client settings: 'movies', 'tv', 'universal'
      let mediaType: string | undefined = undefined;
      if (result.categories && result.categories.length > 0) {
        const categoryId = result.categories[0];
        if (categoryId >= 2000 && categoryId < 3000) {
          mediaType = 'movies'; // Movie categories (2000-2999)
        } else if (categoryId >= 5000 && categoryId < 6000) {
          mediaType = 'tv'; // TV categories (5000-5999)
        }
      }

      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
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
        source: 'SearchPage',
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

  const selectAllIndexers = useCallback(() => {
    setSelectedIndexers(new Set(indexers.map((idx) => idx.id.toString())));
  }, [indexers]);

  const selectNoneIndexers = useCallback(() => {
    setSelectedIndexers(new Set());
  }, []);

  const selectIndexersByProtocol = useCallback((protocol: "torrent" | "nzb") => {
    const filteredIndexers = indexers
      .filter((idx) => idx.protocol === protocol)
      .map((idx) => idx.id.toString());
    setSelectedIndexers(new Set(filteredIndexers));
  }, [indexers]);

  // Filter indexers based on search query
  const filteredIndexers = indexers.filter((indexer) =>
    indexer.name.toLowerCase().includes(indexerSearchQuery.toLowerCase())
  );

  // Group indexers by protocol
  const torrentIndexers = filteredIndexers.filter((idx) => idx.protocol === "torrent");
  const nzbIndexers = filteredIndexers.filter((idx) => idx.protocol === "nzb");


    return (
    <div className="Search page min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => router.back()}
                aria-label="Go back"
                className="flex-shrink-0"
              >
                <ChevronLeft size={20} />
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                  {searchQuery ? `Search: "${searchQuery}"` : 'Search Indexers'}
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  {results.length > 0 ? `${results.length} results found` : 'Search torrents across all your indexers'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        
      {/* Content */}
      <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* Search Bar */}
          <div className="w-full">
            <Input
              placeholder="Search torrents (e.g., 'Shrek 2001', 'The Matrix')..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              startContent={<SearchIcon size={20} className="text-secondary" />}
              size="lg"
              classNames={{
                base: "w-full",
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40 focus-within:border-secondary/60 transition-colors",
              }}
            />
          </div>

          {/* Indexer Filter Section */}
          {fetchingIndexers ? (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl p-6 text-center">
              <Spinner size="sm" className="mb-2" />
              <p className="text-sm text-foreground/60">Loading your indexers...</p>
            </div>
          ) : !user ? (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl p-6 text-center">
              <p className="text-sm text-foreground/60">Please log in to search indexers</p>
            </div>
          ) : indexers.length === 0 ? (
            <div className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-2xl p-6 text-center">
              <Filter size={32} className="text-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No Indexers Found</p>
              <p className="text-xs text-foreground/60 mb-4">Add indexers in Settings to start searching</p>
              <Button
                as="a"
                href="/pages/indexers"
                size="sm"
                color="secondary"
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
                  <Filter size={20} className="text-secondary" />
                  <div>
                    <h3 className="font-semibold text-foreground">Filter by Indexers</h3>
                    <p className="text-xs text-foreground/60">
                      {selectedIndexers.size} of {indexers.length} selected
                    </p>
                  </div>
                </div>
                {showFilters ? (
                  <ChevronUp size={20} className="text-foreground/60" />
                ) : (
                  <ChevronDown size={20} className="text-foreground/60" />
                )}
              </div>

              {/* Filter Content */}
              {showFilters && (
                <div className="border-t border-secondary/20 p-4 space-y-4">
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      onClick={selectAllIndexers}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="default"
                      onClick={selectNoneIndexers}
                      className="text-xs"
                    >
                      Select None
                    </Button>
                    {torrentIndexers.length > 0 && (
                      <Button
                        size="sm"
                        variant="flat"
                        color="secondary"
                        onClick={() => selectIndexersByProtocol("torrent")}
                        className="text-xs"
                      >
                        Torrents Only
                      </Button>
                    )}
                    {nzbIndexers.length > 0 && (
                      <Button
                        size="sm"
                        variant="flat"
                        color="secondary"
                        onClick={() => selectIndexersByProtocol("nzb")}
                        className="text-xs"
                      >
                        NZB Only
                      </Button>
                    )}
                  </div>

                  {/* Search Indexers */}
                  {indexers.length > 5 && (
                    <Input
                      placeholder="Search indexers..."
                      value={indexerSearchQuery}
                      onChange={(e) => setIndexerSearchQuery(e.target.value)}
                      size="sm"
                      startContent={<SearchIcon size={16} className="text-secondary" />}
                      classNames={{
                        inputWrapper: "bg-content1 border border-secondary/20",
                      }}
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
                          const isSelected = selectedIndexers.has(indexer.id.toString());
                          return (
                            <Chip
                              key={indexer.id}
                              size="sm"
                              variant={isSelected ? "flat" : "bordered"}
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
                          const isSelected = selectedIndexers.has(indexer.id.toString());
                          return (
                            <Chip
                              key={indexer.id}
                              size="sm"
                              variant={isSelected ? "flat" : "bordered"}
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
                    </div>
                  )}

                  {/* No Results Message */}
                  {filteredIndexers.length === 0 && indexerSearchQuery && (
                    <div className="text-center py-4 text-foreground/60 text-sm">
                      No indexers found matching &quot;{indexerSearchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner size="lg" color="secondary" />
            <p className="text-foreground/60 mt-4">Searching indexers...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {/* Results Header */}
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-foreground/60">
                Showing {results.length} {results.length === 1 ? 'result' : 'results'}
              </p>
              <Chip size="sm" variant="flat" color="secondary">
                {selectedIndexers.size} indexer{selectedIndexers.size !== 1 ? 's' : ''} selected
              </Chip>
            </div>

            {/* Results List */}
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={`${result.id}-${index}`}
                  className="bg-content2/50 backdrop-blur-sm border border-secondary/20 rounded-xl p-4 hover:bg-content2 hover:border-secondary/40 transition-all duration-200 group"
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
                          isIconOnly
                          size="sm"
                          color="secondary"
                          variant="flat"
                          onClick={() => handleGrabRelease(result)}
                          disabled={!result.downloadUrl || grabbing.has(result.id)}
                          title={grabSuccess.has(result.id) ? "Grabbed successfully" : grabError.get(result.id) || "Grab release"}
                          className="hover:scale-110 transition-transform"
                        >
                          {grabbing.has(result.id) ? (
                            <Spinner size="sm" color="white" />
                          ) : grabSuccess.has(result.id) ? (
                            <Check size={16} className="text-success" />
                          ) : (
                            <Download size={16} />
                          )}
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          color="secondary"
                          variant="light"
                          onClick={() => handleCopyMagnetLink(result)}
                          title={copiedLink === result.id ? "Copied!" : "Copy magnet link"}
                          className="hover:scale-110 transition-transform"
                        >
                          {copiedLink === result.id ? (
                            <Check size={16} className="text-success" />
                          ) : (
                            <LinkIcon size={16} />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-foreground/70">
                      <Chip size="sm" variant="flat" color="secondary" className="text-xs">
                        {result.indexer}
                      </Chip>
                      <Chip size="sm" variant="flat" className="text-xs">
                        {result.sizeFormatted}
                      </Chip>
                      <Chip size="sm" variant="flat" className="text-xs">
                        {result.ageFormatted}
                      </Chip>
                      {result.protocol === "torrent" && result.seeders !== null && result.seeders !== undefined && (
                        <Chip 
                          size="sm" 
                          variant="flat" 
                          color={result.seeders > 50 ? "success" : result.seeders > 10 ? "warning" : "default"}
                          className="text-xs"
                        >
                          🌱 {result.seeders.toLocaleString()}
                        </Chip>
                      )}
                      {result.protocol === "torrent" && result.leechers !== null && result.leechers !== undefined && (
                        <Chip size="sm" variant="flat" className="text-xs hidden sm:inline-flex">
                          📥 {result.leechers.toLocaleString()}
                        </Chip>
                      )}
                     {result.protocol && (
                       <Chip 
                         size="sm" 
                         variant="flat" 
                         color={result.protocol === "torrent" ? "secondary" : "primary"}
                         className="text-xs"
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
            <SearchIcon size={48} className="text-foreground/20 mb-4" />
            <p className="text-foreground/80 font-semibold text-lg mb-2">No results found</p>
            <p className="text-foreground/60 text-sm max-w-md">
              No torrents found for &quot;{searchQuery}&quot;. Try a different search term or select more indexers.
            </p>
          </div>
        ) : null}
              </div>
            </div>
        </div>
    );
};

export default Search;

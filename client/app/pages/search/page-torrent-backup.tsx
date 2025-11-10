"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { Chip } from "@nextui-org/chip";
import { Select, SelectItem } from "@nextui-org/select";
// Using native checkbox instead of NextUI Checkbox due to compatibility issues
import { Spinner } from "@nextui-org/spinner";
import {
  Search as SearchIcon,
  Grid3x3,
  ArrowUpDown,
  Filter,
  Download,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Copy,
} from "lucide-react";
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
  grabs: number;
  peers: string | null;
  seeders: number | null;
  leechers: number | null;
  categories: number[];
  publishDate: string;
  downloadUrl: string;
  guid: string;
}

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  type: string;
}

interface Indexer {
  id: number;
  name: string;
  protocol: "torrent" | "nzb";
  enabled: boolean;
}

interface IndexerSummary {
  id: number;
  name: string;
  protocol: "torrent" | "nzb";
  resultCount: number;
}

type SortField = "protocol" | "age" | "title" | "indexer" | "size" | "grabs" | "peers" | "seeders" | "leechers" | "category";
type SortOrder = "asc" | "desc";

const Search = () => {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [indexerSummaries, setIndexerSummaries] = useState<IndexerSummary[]>([]);
  const [selectedIndexers, setSelectedIndexers] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortField>("seeders");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [grabbing, setGrabbing] = useState<Set<string>>(new Set());
  const [grabSuccess, setGrabSuccess] = useState<Set<string>>(new Set());
  const [grabError, setGrabError] = useState<Map<string, string>>(new Map());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Request cancellation
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const lastSearchKeyRef = useRef<string>("");
  const isInitialMount = useRef(true);

  const debouncedQuery = useDebounce(searchQuery, 300); // Reduced from 500ms to 300ms

  // Memoized category grouping
  const groupedCategories = useMemo(() => {
    return categories.reduce((acc, cat) => {
      if (!cat.parentId) {
        acc[cat.type] = acc[cat.type] || [];
        acc[cat.type].push(cat);
      }
      return acc;
    }, {} as Record<string, Category[]>);
  }, [categories]);

  // Memoized subcategories getter
  const getSubCategories = useCallback((parentId: number): Category[] => {
    return categories.filter((c) => c.parentId === parentId);
  }, [categories]);

  // Memoized category name getter
  const getCategoryName = useCallback((categoryId: number): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : `Category ${categoryId}`;
  }, [categories]);

  // Memoized search key for deduplication
  const searchKey = useMemo(() => {
    return JSON.stringify({
      query: debouncedQuery.trim(),
      indexers: Array.from(selectedIndexers).sort().join(","),
      categories: Array.from(selectedCategories).sort().join(","),
      sortBy,
      sortOrder,
      page: currentPage,
      limit: resultsPerPage,
    });
  }, [debouncedQuery, selectedIndexers, selectedCategories, sortBy, sortOrder, currentPage, resultsPerPage]);

  // Define functions before using them in useEffect
  const fetchCategories = useCallback(async () => {
    const cacheKey = "categories";
    const cached = getCached(cacheKey);
    if (cached) {
      setCategories(cached);
      setServerConnected(true);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/Search/categories`, {
        timeout: 5000, // 5 second timeout
      });
      setCategories(response.data);
      setCached(cacheKey, response.data, 10 * 60 * 1000); // Cache for 10 minutes
      setServerConnected(true);
    } catch (error: any) {
      if (axios.isCancel(error)) return;
      console.error("Error fetching categories:", error);
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        console.warn("Backend server may not be running. Please start the server on port 3002.");
        setServerConnected(false);
      }
      setCategories([]);
    }
  }, []);

  const fetchIndexers = useCallback(async () => {
    const cacheKey = "indexers";
    const cached = getCached(cacheKey);
    if (cached) {
      const enabledIndexers = cached.filter((idx: Indexer) => idx.enabled);
      setIndexers(enabledIndexers);
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      setServerConnected(true);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`, {
        timeout: 5000, // 5 second timeout
      });
      const enabledIndexers = (response.data.data || []).filter(
        (idx: Indexer) => idx.enabled
      );
      setIndexers(enabledIndexers);
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      setCached(cacheKey, response.data.data || [], 5 * 60 * 1000); // Cache for 5 minutes
      setServerConnected(true);
    } catch (error: any) {
      if (axios.isCancel(error)) return;
      console.error("Error fetching indexers:", error);
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        console.warn("Backend server may not be running. Please start the server on port 3002.");
        setServerConnected(false);
      }
      setIndexers([]);
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) return;

    // Check cache first
    const cacheKey = `search:${searchKey}`;
    const cached = getCached(cacheKey);
    if (cached) {
      let results = cached.results || [];
      
      // Apply name filtering even for cached results
      if (debouncedQuery.trim()) {
        const queryLower = debouncedQuery.trim().toLowerCase();
        results = results.filter((result: SearchResult) => {
          return result.title.toLowerCase().includes(queryLower);
        });
      }

      // Sort by seeders (descending) - most seeders first
      results.sort((a: SearchResult, b: SearchResult) => {
        const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
        const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
        return bSeeders - aSeeders; // Descending order
      });

      setResults(results);
      setTotal(results.length);
      setIndexerSummaries(cached.indexers || []);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("New search initiated");
    }

    // Create new cancel token
    const cancelToken = axios.CancelToken.source();
    cancelTokenRef.current = cancelToken;

    try {
      setLoading(true);
      const offset = (currentPage - 1) * resultsPerPage;
      const params: any = {
        query: debouncedQuery.trim(),
        sortBy,
        sortOrder,
        limit: resultsPerPage,
        offset: offset,
      };

      if (selectedIndexers.size > 0) {
        params.indexerIds = Array.from(selectedIndexers);
      }

      if (selectedCategories.size > 0) {
        params.categoryIds = Array.from(selectedCategories);
      }

      const response = await axios.get(`${API_BASE_URL}/api/Search`, {
        params,
        cancelToken: cancelToken.token,
        timeout: 30000, // 30 second timeout
      });

      if (response.data) {
        let results = response.data.results || [];
        const indexers = response.data.indexers || [];

        // Filter results by name/title matching the search query (case-insensitive)
        if (debouncedQuery.trim()) {
          const queryLower = debouncedQuery.trim().toLowerCase();
          results = results.filter((result: SearchResult) => {
            return result.title.toLowerCase().includes(queryLower);
          });
        }

        // Sort by seeders (descending) - most seeders first
        results.sort((a: SearchResult, b: SearchResult) => {
          const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
          const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
          return bSeeders - aSeeders; // Descending order
        });

        const total = results.length;

        setResults(results);
        setTotal(total);
        setIndexerSummaries(indexers);

        // Cache the results
        setCached(cacheKey, { results, total, indexers }, 2 * 60 * 1000); // Cache for 2 minutes

        // Log indexer errors for debugging (only in dev)
        if (process.env.NODE_ENV === "development" && indexers) {
          indexers.forEach((idx: any) => {
            if (idx.error) {
              console.warn(`Indexer ${idx.name} error:`, idx.error);
            }
          });
        }
      }
    } catch (error: any) {
      if (axios.isCancel(error)) {
        // Request was cancelled, don't update state
        return;
      }
      console.error("Error performing search:", error);
      setResults([]);
      setTotal(0);
      setIndexerSummaries([]);

      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        setServerConnected(false);
      }
    } finally {
      setLoading(false);
      cancelTokenRef.current = null;
    }
  }, [debouncedQuery, selectedIndexers, selectedCategories, sortBy, sortOrder, currentPage, resultsPerPage, searchKey]);

  // Fetch categories and indexers in parallel on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      Promise.all([fetchCategories(), fetchIndexers()]).catch((err) => {
        console.error("Error fetching initial data:", err);
      });
    }
  }, [fetchCategories, fetchIndexers]);

  // Handle URL query parameters from navbar search
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const timestamp = searchParams.get('t');
    
    if (urlQuery) {
      // Set both query and searchQuery to trigger immediate search
      setQuery(urlQuery);
      setSearchQuery(urlQuery);
      // Reset to first page when new search comes from navbar
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Cleanup: cancel any pending requests on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel("Component unmounting");
      }
    };
  }, []);

  // Perform search when search key changes
  useEffect(() => {
    // Cancel previous request
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("New search initiated");
    }

    if (debouncedQuery.trim()) {
      // Reset to first page only if query or filters changed (not pagination)
      const queryChanged = lastSearchKeyRef.current && 
        !lastSearchKeyRef.current.startsWith(JSON.stringify({ query: debouncedQuery.trim() }));
      
      if (queryChanged) {
        setCurrentPage(1);
      }
      
      performSearch();
      lastSearchKeyRef.current = searchKey;
    } else {
      setResults([]);
      setTotal(0);
      setCurrentPage(1);
    }
  }, [searchKey, debouncedQuery, performSearch]);

  const handleSearch = useCallback(() => {
    setSearchQuery(query);
  }, [query]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);

  // Apply client-side filtering and sorting to results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // Filter by name/title matching the search query (case-insensitive)
    if (debouncedQuery.trim()) {
      const queryLower = debouncedQuery.trim().toLowerCase();
      filtered = filtered.filter((result) => {
        return result.title.toLowerCase().includes(queryLower);
      });
    }

    // Sort by seeders (descending) - most seeders first
    const sorted = [...filtered].sort((a, b) => {
      const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
      const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
      return bSeeders - aSeeders; // Descending order
    });

    return sorted;
  }, [results, debouncedQuery]);

  const toggleResultSelection = useCallback((resultId: string) => {
    setSelectedResults((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(resultId)) {
        newSelected.delete(resultId);
      } else {
        newSelected.add(resultId);
      }
      return newSelected;
    });
  }, []);

  const toggleAllResults = useCallback(() => {
    setSelectedResults((prev) => {
      if (prev.size === filteredAndSortedResults.length) {
        return new Set();
      } else {
        return new Set(filteredAndSortedResults.map((r) => r.id));
      }
    });
  }, [filteredAndSortedResults]);

  const handleSort = useCallback((field: SortField) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === field) {
        setSortOrder((prevOrder => (prevOrder === "asc" ? "desc" : "asc")));
        return prevSortBy;
      } else {
        setSortOrder("desc");
        return field;
      }
    });
  }, []);

  const totalPages = useMemo(() => {
    // Use the total from server (stored in state) rather than filtered results length
    // This ensures pagination works correctly with all results
    return Math.ceil(total / resultsPerPage) || 1;
  }, [total, resultsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

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

  const handleGrabSelected = useCallback(async () => {
    if (selectedResults.size === 0) return;

    const resultsToGrab = filteredAndSortedResults.filter((r) => selectedResults.has(r.id));
    
    for (const result of resultsToGrab) {
      if (result.downloadUrl) {
        await handleGrabRelease(result);
        // Small delay between grabs to avoid overwhelming the client
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }, [selectedResults, filteredAndSortedResults, handleGrabRelease]);

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

  const getPageNumbers = useMemo((): (number | string)[] => {
    const pageNumbers: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > maxPagesToShow - 2) {
        pageNumbers.push("...");
      }

      let startPage = Math.max(2, currentPage - Math.floor(maxPagesToShow / 2) + 1);
      let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPagesToShow / 2) - 1);

      if (currentPage <= Math.floor(maxPagesToShow / 2) + 1) {
        endPage = maxPagesToShow - 1;
      } else if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
        startPage = totalPages - maxPagesToShow + 2;
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - Math.floor(maxPagesToShow / 2)) {
        pageNumbers.push("...");
      }
      pageNumbers.push(totalPages);
    }
    return Array.from(new Set(pageNumbers));
  }, [totalPages, currentPage]);

    return (
    <div className="Search page min-h-screen bg-background p-3 sm:p-6">
      <div className="container max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
        {/* Server Connection Status */}
        {serverConnected === false && (
          <Card className="mb-4 border-warning">
            <CardBody>
              <div className="flex items-center gap-2 text-warning">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold">Backend server not connected</p>
                  <p className="text-sm text-default-500">
                    Please start the backend server by running: <code className="bg-content2 px-2 py-1 rounded">cd server && npm start</code>
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        
        {/* Top Search Bar & Filters */}
        <Card className="mb-6 w-full">
          <CardBody>
            <div className="flex flex-col gap-4">
              {/* Search Input */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Input
                  placeholder="Search torrents..."
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  startContent={<SearchIcon size={20} />}
                  className="flex-1"
                  size="lg"
                />
                <Button
                  color="primary"
                  onPress={handleSearch}
                  startContent={<SearchIcon size={16} />}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Search
                </Button>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col lg:flex-row gap-3">
                <Select
                  label="Indexers"
                  selectedKeys={selectedIndexers}
                  onSelectionChange={(keys: any) => {
                    const keyArray = Array.from(keys) as string[];
                    const keySet = new Set<string>(keyArray);
                    setSelectedIndexers(keySet);
                  }}
                  selectionMode="multiple"
                  className="flex-1"
                  placeholder="All Indexers"
                  startContent={<Filter size={16} />}
                >
                  {indexerSummaries.length > 0
                    ? indexerSummaries.map((idx) => (
                        <SelectItem key={idx.id.toString()} value={idx.id.toString()}>
                          {idx.name} ({idx.resultCount})
                        </SelectItem>
                      ))
                    : indexers.map((idx) => (
                        <SelectItem key={idx.id.toString()} value={idx.id.toString()}>
                          {idx.name}
                        </SelectItem>
                      ))}
                </Select>

                <Select
                  label="Categories"
                  selectedKeys={selectedCategories}
                  onSelectionChange={(keys: any) =>
                    setSelectedCategories(new Set(Array.from(keys)))
                  }
                  selectionMode="multiple"
                  className="flex-1"
                  placeholder="All Categories"
                  startContent={<Grid3x3 size={16} />}
                >
                  {Object.entries(groupedCategories).map(([type, cats]) => (
                    <React.Fragment key={type}>
                      {cats.map((cat) => (
                        <React.Fragment key={cat.id}>
                          <SelectItem key={cat.id.toString()} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                          {getSubCategories(cat.id).map((subCat) => (
                            <SelectItem
                              key={subCat.id.toString()}
                              value={subCat.id.toString()}
                            >
                              {subCat.name}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </Select>

                <Select
                  label="Sort By"
                  selectedKeys={[sortBy]}
                  onSelectionChange={(keys: any) => {
                    const key = Array.from(keys)[0] as SortField;
                    if (key) setSortBy(key);
                  }}
                  className="flex-1 lg:max-w-[200px]"
                  startContent={<ArrowUpDown size={16} />}
                >
                  <SelectItem key="seeders">Seeders</SelectItem>
                  <SelectItem key="leechers">Leechers</SelectItem>
                  <SelectItem key="age">Age</SelectItem>
                  <SelectItem key="title">Title</SelectItem>
                  <SelectItem key="size">Size</SelectItem>
                  <SelectItem key="grabs">Grabs</SelectItem>
                  <SelectItem key="indexer">Indexer</SelectItem>
                </Select>
              </div>

              {/* Action Buttons Row */}
              {selectedResults.size > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-divider">
                  <div className="text-sm text-default-500">
                    Selected {selectedResults.size} of {filteredAndSortedResults.length} releases
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      color="success"
                      startContent={<Download size={16} />}
                      onPress={handleGrabSelected}
                      isDisabled={selectedResults.size === 0 || grabbing.size > 0}
                      isLoading={grabbing.size > 0}
                      className="flex-1 sm:flex-initial"
                    >
                      Download {selectedResults.size} Release{selectedResults.size !== 1 ? 's' : ''}
                    </Button>
                    <Button
                      variant="flat"
                      onPress={() => setSelectedResults(new Set())}
                      className="flex-1 sm:flex-initial"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>



        {/* Results Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredAndSortedResults.length > 0 ? (
          <>
            <Card className="w-full">
              <CardBody className="overflow-x-auto p-0">
                <div className="w-full">
                  <table className="w-full min-w-[1200px]">
                    <thead>
                      <tr className="border-b border-divider">
                        <th className="text-left p-3 lg:p-4 w-12">
                          <input
                            type="checkbox"
                              checked={selectedResults.size === filteredAndSortedResults.length && filteredAndSortedResults.length > 0}
                            onChange={toggleAllResults}
                            className="cursor-pointer"
                          />
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2 hidden md:table-cell"
                          onClick={() => handleSort("protocol")}
                        >
                          <div className="flex items-center gap-2">
                            Protocol
                            {sortBy === "protocol" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2"
                          onClick={() => handleSort("age")}
                        >
                          <div className="flex items-center gap-2">
                            Age
                            {sortBy === "age" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2"
                          onClick={() => handleSort("title")}
                        >
                          <div className="flex items-center gap-2">
                            Title
                            {sortBy === "title" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2"
                          onClick={() => handleSort("indexer")}
                        >
                          <div className="flex items-center gap-2">
                            Indexer
                            {sortBy === "indexer" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2 hidden sm:table-cell"
                          onClick={() => handleSort("size")}
                        >
                          <div className="flex items-center gap-2">
                            Size
                            {sortBy === "size" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2 hidden lg:table-cell"
                          onClick={() => handleSort("grabs")}
                        >
                          <div className="flex items-center gap-2">
                            Grabs
                            {sortBy === "grabs" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2"
                          onClick={() => handleSort("seeders")}
                        >
                          <div className="flex items-center gap-2">
                            Seeders
                            {sortBy === "seeders" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2"
                          onClick={() => handleSort("leechers")}
                        >
                          <div className="flex items-center gap-2">
                            Leechers
                            {sortBy === "leechers" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2 hidden xl:table-cell"
                          onClick={() => handleSort("peers")}
                        >
                          <div className="flex items-center gap-2">
                            Peers
                            {sortBy === "peers" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left p-3 lg:p-4 cursor-pointer hover:bg-content2 hidden md:table-cell"
                          onClick={() => handleSort("category")}
                        >
                          <div className="flex items-center gap-2">
                            Category
                            {sortBy === "category" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th className="text-left p-3 lg:p-4 hidden sm:table-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedResults
                        .slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)
                        .map((result) => {
                        const isSelected = selectedResults.has(result.id);
                        return (
                        <tr
                          key={result.id}
                          className="border-b border-divider hover:bg-content2 transition-colors"
                        >
                          <td className="p-3 lg:p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleResultSelection(result.id)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="p-3 lg:p-4 hidden md:table-cell">
                            <Chip
                              size="sm"
                              color={result.protocol === "torrent" ? "success" : "primary"}
                              variant="flat"
                            >
                              {result.protocol}
                            </Chip>
                          </td>
                          <td className="p-3 lg:p-4 text-sm">{result.ageFormatted}</td>
                          <td className="p-3 lg:p-4 font-medium">
                            <div className="flex flex-col gap-1">
                              <span>{result.title}</span>
                              <div className="flex flex-wrap gap-1 md:hidden">
                                <Chip
                                  size="sm"
                                  color={result.protocol === "torrent" ? "success" : "primary"}
                                  variant="flat"
                                >
                                  {result.protocol}
                                </Chip>
                                <span className="text-xs text-default-500">{result.indexer}</span>
                                <span className="text-xs text-default-500">{result.sizeFormatted}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 lg:p-4">{result.indexer}</td>
                          <td className="p-3 lg:p-4 text-sm hidden sm:table-cell">{result.sizeFormatted}</td>
                          <td className="p-3 lg:p-4 text-sm hidden lg:table-cell">{result.grabs.toLocaleString()}</td>
                          <td className="p-3 lg:p-4 text-sm">
                            {result.seeders !== null && result.seeders !== undefined ? result.seeders.toLocaleString() : "-"}
                          </td>
                          <td className="p-3 lg:p-4 text-sm">
                            {result.leechers !== null && result.leechers !== undefined ? result.leechers.toLocaleString() : "-"}
                          </td>
                          <td className="p-3 lg:p-4 text-sm hidden xl:table-cell">
                            {result.peers || "-"}
                          </td>
                          <td className="p-3 lg:p-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {result.categories.slice(0, 2).map((catId) => (
                                <Chip key={catId} size="sm" variant="flat" color="warning">
                                  {getCategoryName(catId)}
                                </Chip>
                              ))}
                              {result.categories.length > 2 && (
                                <Chip size="sm" variant="flat">
                                  +{result.categories.length - 2}
                                </Chip>
                              )}
                            </div>
                          </td>
                          <td className="p-3 lg:p-4 hidden sm:table-cell">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="light"
                                color={grabSuccess.has(result.id) ? "success" : grabError.has(result.id) ? "danger" : "default"}
                                isIconOnly
                                onPress={() => handleGrabRelease(result)}
                                isLoading={grabbing.has(result.id)}
                                isDisabled={!result.downloadUrl || grabbing.has(result.id)}
                                title={grabSuccess.has(result.id) ? "Grabbed successfully" : grabError.get(result.id) || "Grab release"}
                              >
                                {grabSuccess.has(result.id) ? (
                                  <Check size={14} />
                                ) : (
                                  <Download size={14} />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="light"
                                color={copiedLink === result.id ? "success" : "default"}
                                isIconOnly
                                onPress={() => handleCopyMagnetLink(result)}
                                title={copiedLink === result.id ? "Copied!" : "Copy magnet link"}
                              >
                                {copiedLink === result.id ? (
                                  <Check size={14} />
                                ) : (
                                  <LinkIcon size={14} />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            {/* Bottom Results Per Page & Pagination Controls */}
            <Card className="mt-6 w-full">
              <CardBody>
                <div className="flex flex-col gap-6">
                  {/* Results Per Page & Info Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-default-500">Results per page:</span>
                      <Select
                        selectedKeys={[resultsPerPage.toString()]}
                        onSelectionChange={(keys: any) => {
                          const value = parseInt(Array.from(keys)[0] as string);
                          setResultsPerPage(value);
                          setCurrentPage(1);
                        }}
                        className="w-24"
                        size="sm"
                      >
                        <SelectItem key="10">10</SelectItem>
                        <SelectItem key="25">25</SelectItem>
                        <SelectItem key="50">50</SelectItem>
                        <SelectItem key="100">100</SelectItem>
                        <SelectItem key="250">250</SelectItem>
                        <SelectItem key="500">500</SelectItem>
                      </Select>
                    </div>
                    <div className="text-sm text-default-500">
                      Showing {((currentPage - 1) * resultsPerPage) + 1} - {Math.min(currentPage * resultsPerPage, total)} of {total} results
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-divider">
                    <div className="text-sm text-default-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(1)}
                        isDisabled={currentPage === 1 || totalPages <= 1}
                        size="sm"
                      >
                        <ChevronsLeft size={16} />
                      </Button>
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(currentPage - 1)}
                        isDisabled={currentPage === 1 || totalPages <= 1}
                        size="sm"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      
                      <div className="flex gap-1">
                        {getPageNumbers.map((page, idx) => {
                          if (page === "...") {
                            return (
                              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-default-500">
                                ...
                              </span>
                            );
                          }
                          const pageNum = page as number;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "solid" : "flat"}
                              color={currentPage === pageNum ? "primary" : "default"}
                              onPress={() => handlePageChange(pageNum)}
                              size="sm"
                              className="min-w-[40px]"
                              isDisabled={totalPages <= 1}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(currentPage + 1)}
                        isDisabled={currentPage === totalPages || totalPages <= 1}
                        size="sm"
                      >
                        <ChevronRight size={16} />
                      </Button>
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(totalPages)}
                        isDisabled={currentPage === totalPages || totalPages <= 1}
                        size="sm"
                      >
                        <ChevronsRight size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

          </>
        ) : searchQuery ? (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <p className="text-default-500 mb-4">No results found for &quot;{searchQuery}&quot;</p>
                {indexerSummaries.length > 0 && (
                  <div className="text-sm text-default-400 space-y-1 max-w-md mx-auto">
                    <p className="font-semibold mb-2">Indexer Status:</p>
                    {indexerSummaries.map((idx: any) => (
                      <div key={idx.id} className="flex items-center justify-center gap-2">
                        <span>{idx.name}:</span>
                        {idx.error ? (
                          <span className="text-warning">{idx.error}</span>
                        ) : (
                          <span className="text-success">{idx.resultCount} results</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {indexerSummaries.some((idx: any) => idx.error?.includes("Cardigann") || idx.error?.includes("scraping") || idx.error?.includes("YAML")) && (
                  <div className="mt-4 p-4 bg-warning/10 rounded-lg text-sm text-warning max-w-2xl mx-auto">
                    <p className="font-semibold mb-2">⚠️ Cardigann Indexer Configuration Needed</p>
                    <p className="mb-2">Some indexers require additional configuration to work:</p>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      <li><strong>Cardigann indexers</strong> need YAML definitions or Prowlarr proxy</li>
                      <li><strong>Solution:</strong> Use Prowlarr as a proxy by setting the baseUrl to: <code className="bg-content2 px-1 rounded">http://prowlarr:9696/&#123;indexerId&#125;/api</code></li>
                      <li>Find your indexer ID in Prowlarr&apos;s Settings → Indexers page</li>
                    </ul>
                    <p className="text-xs text-default-400 mt-2">
                      See <code className="bg-content2 px-1 rounded">server/services/INDEXER_SEARCH_README.md</code> for detailed setup instructions.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-12 text-default-500">
                Enter a search query to find releases
              </div>
            </CardBody>
          </Card>
        )}
            </div>
        </div>
    );
};

export default Search;

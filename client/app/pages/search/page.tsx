"use client";
import React, { useState, useEffect } from "react";
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
  Flag,
  Settings,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import "../../../styles/Search.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

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

type SortField = "protocol" | "age" | "title" | "indexer" | "size" | "grabs" | "peers" | "category";
type SortOrder = "asc" | "desc";

const Search = () => {
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
  const [sortBy, setSortBy] = useState<SortField>("age");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 500);

  // Fetch categories and indexers on mount
  useEffect(() => {
    fetchCategories();
    fetchIndexers();
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setCurrentPage(1); // Reset to first page on new search
      performSearch();
    } else {
      setResults([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
    }
  }, [debouncedQuery, selectedIndexers, selectedCategories, sortBy, sortOrder]);

  // Perform search when page or results per page changes
  useEffect(() => {
    if (debouncedQuery.trim() && currentPage > 0) {
      performSearch();
    }
  }, [currentPage, resultsPerPage]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Search/categories`);
      setCategories(response.data);
      setServerConnected(true);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      // If it's a network error, the server might not be running
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        console.warn("Backend server may not be running. Please start the server on port 3002.");
        setServerConnected(false);
      }
      // Set empty array as fallback
      setCategories([]);
    }
  };

  const fetchIndexers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`);
      const enabledIndexers = (response.data.data || []).filter(
        (idx: Indexer) => idx.enabled
      );
      setIndexers(enabledIndexers);
      // Select all indexers by default
      setSelectedIndexers(new Set(enabledIndexers.map((idx: Indexer) => idx.id.toString())));
      setServerConnected(true);
    } catch (error: any) {
      console.error("Error fetching indexers:", error);
      // If it's a network error, the server might not be running
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        console.warn("Backend server may not be running. Please start the server on port 3002.");
        setServerConnected(false);
      }
      // Set empty array as fallback
      setIndexers([]);
    }
  };

  const performSearch = async () => {
    if (!debouncedQuery.trim()) return;

    try {
      setLoading(true);
      const offset = (currentPage - 1) * resultsPerPage;
      const params: any = {
        query: debouncedQuery,
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

      const response = await axios.get(`${API_BASE_URL}/api/Search`, { params });
      setResults(response.data.results || []);
      setTotal(response.data.total || 0);
      setIndexerSummaries(response.data.indexers || []);
      
      // Log indexer errors for debugging
      if (response.data.indexers) {
        response.data.indexers.forEach((idx: any) => {
          if (idx.error) {
            console.warn(`Indexer ${idx.name} error:`, idx.error);
          }
        });
      }
      
      // Calculate total pages
      const pages = Math.ceil((response.data.total || 0) / resultsPerPage);
      setTotalPages(pages || 1);
    } catch (error: any) {
      console.error("Error performing search:", error);
      setResults([]);
      setTotal(0);
      setTotalPages(1);
      setIndexerSummaries([]);
      
      // Set server connection status
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        setServerConnected(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchQuery(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleResultSelection = (resultId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResults(newSelected);
  };

  const toggleAllResults = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map((r) => r.id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = (): (number | string)[] => {
    const pageNumbers: (number | string)[] = [];
    const maxPagesToShow = 5; // Number of page buttons to show directly

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
    return Array.from(new Set(pageNumbers)); // Remove duplicates
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : `Category ${categoryId}`;
  };

  const groupedCategories = categories.reduce((acc, cat) => {
    if (!cat.parentId) {
      acc[cat.type] = acc[cat.type] || [];
      acc[cat.type].push(cat);
    }
    return acc;
  }, {} as Record<string, Category[]>);

  const getSubCategories = (parentId: number): Category[] => {
    return categories.filter((c) => c.parentId === parentId);
  };

  const formatSize = (size: number): string => {
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} TiB`;
    }
    return `${size.toFixed(1)} GiB`;
  };

    return (
    <div className="Search page min-h-screen bg-background p-3 sm:p-6">
      <div className="container max-w-7xl mx-auto">
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
        
        {/* Top Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            startContent={<SearchIcon size={20} />}
            className="flex-1"
            size="lg"
          />
          <div className="flex gap-2">
            <Button
              color="primary"
              onPress={handleSearch}
              startContent={<SearchIcon size={16} />}
              size="lg"
              className="flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Search</span>
              <span className="sm:hidden">Go</span>
            </Button>
            <Button variant="flat" isIconOnly className="hidden sm:flex">
              <Grid3x3 size={20} />
            </Button>
            <Button variant="flat" isIconOnly className="hidden sm:flex">
              <ArrowUpDown size={20} />
            </Button>
            <Button variant="flat" isIconOnly className="hidden sm:flex">
              <Filter size={20} />
            </Button>
          </div>
        </div>

        {/* Results Per Page & Pagination Info */}
        {results.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
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
        )}

        {/* Results Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : results.length > 0 ? (
          <>
            <Card>
              <CardBody>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-divider">
                        <th className="text-left p-2 sm:p-3 w-10 sm:w-12">
                          <input
                            type="checkbox"
                            checked={selectedResults.size === results.length && results.length > 0}
                            onChange={toggleAllResults}
                            className="cursor-pointer"
                          />
                        </th>
                        <th
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2 hidden md:table-cell"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2 hidden lg:table-cell"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2 hidden sm:table-cell"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2 hidden lg:table-cell"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2 hidden xl:table-cell"
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
                          className="text-left p-2 sm:p-3 cursor-pointer hover:bg-content2 hidden md:table-cell"
                          onClick={() => handleSort("category")}
                        >
                          <div className="flex items-center gap-2">
                            Category
                            {sortBy === "category" && (
                              <ArrowUpDown size={14} className={sortOrder === "desc" ? "rotate-180" : ""} />
                            )}
                          </div>
                        </th>
                        <th className="text-left p-2 sm:p-3 hidden sm:table-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result) => (
                        <tr
                          key={result.id}
                          className="border-b border-divider hover:bg-content2 transition-colors"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedResults.has(result.id)}
                              onChange={() => toggleResultSelection(result.id)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="p-2 sm:p-3 hidden md:table-cell">
                            <Chip
                              size="sm"
                              color={result.protocol === "torrent" ? "success" : "primary"}
                              variant="flat"
                            >
                              {result.protocol}
                            </Chip>
                          </td>
                          <td className="p-2 sm:p-3 text-sm">{result.ageFormatted}</td>
                          <td className="p-2 sm:p-3 font-medium">
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
                          <td className="p-2 sm:p-3 hidden lg:table-cell">{result.indexer}</td>
                          <td className="p-2 sm:p-3 text-sm hidden sm:table-cell">{result.sizeFormatted}</td>
                          <td className="p-2 sm:p-3 text-sm hidden lg:table-cell">{result.grabs.toLocaleString()}</td>
                          <td className="p-2 sm:p-3 text-sm hidden xl:table-cell">
                            {result.peers || "-"}
                          </td>
                          <td className="p-2 sm:p-3 hidden md:table-cell">
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
                          <td className="p-2 sm:p-3 hidden sm:table-cell">
                            <div className="flex gap-2">
                              <Button size="sm" variant="light" isIconOnly>
                                <Flag size={14} />
                              </Button>
                              <Button size="sm" variant="light" isIconOnly>
                                <Settings size={14} />
                              </Button>
                              <Button size="sm" variant="light" isIconOnly>
                                <Download size={14} />
                              </Button>
                              <Button size="sm" variant="light" isIconOnly>
                                <LinkIcon size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Card className="mt-6">
                <CardBody>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-default-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(1)}
                        isDisabled={currentPage === 1}
                        size="sm"
                      >
                        <ChevronsLeft size={16} />
                      </Button>
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(currentPage - 1)}
                        isDisabled={currentPage === 1}
                        size="sm"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      
                      <div className="flex gap-1">
                        {getPageNumbers().map((page, idx) => {
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
                        isDisabled={currentPage === totalPages}
                        size="sm"
                      >
                        <ChevronRight size={16} />
                      </Button>
                      <Button
                        variant="flat"
                        isIconOnly
                        onPress={() => handlePageChange(totalPages)}
                        isDisabled={currentPage === totalPages}
                        size="sm"
                      >
                        <ChevronsRight size={16} />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Bottom Filter Bar */}
            <Card className="mt-6">
              <CardBody>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <Input
                      placeholder="Query"
                      value={query}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      startContent={<SearchIcon size={16} />}
                      className="flex-1"
                    />
                    <Select
                      label="Indexers"
                      selectedKeys={selectedIndexers}
                      onSelectionChange={(keys: any) => {
                        const keyArray = Array.from(keys) as string[];
                        const keySet = new Set<string>(keyArray);
                        setSelectedIndexers(keySet);
                      }}
                      selectionMode="multiple"
                      className="w-full sm:w-[200px]"
                      placeholder="All Indexers"
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
                      className="w-full sm:w-[200px]"
                      placeholder="All Categories"
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
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-sm text-default-500">
                      Selected {selectedResults.size} of {total} releases
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        color="success"
                        startContent={<Download size={16} />}
                        isDisabled={selectedResults.size === 0}
                        className="flex-1 sm:flex-initial"
                      >
                        <span className="hidden sm:inline">Grab Release(s)</span>
                        <span className="sm:hidden">Grab</span>
                      </Button>
                      <Button color="primary" startContent={<SearchIcon size={16} />} onPress={handleSearch} className="flex-1 sm:flex-initial">
                        Search
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

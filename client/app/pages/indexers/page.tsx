"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/modal";
import { Chip } from "@nextui-org/chip";
import { Switch } from "@nextui-org/switch";
import { Select, SelectItem } from "@nextui-org/select";
import { Spinner } from "@nextui-org/spinner";
import {
  Plus,
  RefreshCw,
  TestTube,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  Search,
  Shield,
  Globe,
  ChevronRight,
  Filter,
  X,
  Clock,
  XCircle,
} from "lucide-react";
import axios from "axios";
import "../../../styles/Indexers.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface Indexer {
  id?: number;
  name: string;
  protocol: "torrent" | "nzb";
  privacy: "Private" | "Public";
  priority: number;
  syncProfile: string;
  enabled: boolean;
  redirected: boolean;
  baseUrl?: string;
  availableBaseUrls?: string[];
  seedRatio?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  vipExpiration?: string;
  stripCyrillicLetters?: boolean;
  searchFreeleechOnly?: boolean;
  sortRequestedFromSite?: string;
  orderRequestedFromSite?: "asc" | "desc";
  accountInactivity?: string;
  tags?: string;
  categories?: string[];
  language?: string;
  description?: string;
  indexerType?: string;
  status?: "enabled" | "enabled_redirected" | "disabled" | "error";
  verified?: boolean;
  verifiedAt?: string;
  createdAt?: string;
}

interface AvailableIndexer {
  name: string;
  protocol: "torrent" | "nzb";
  language: string;
  description: string;
  privacy: "Private" | "Public";
  categories: string[];
  availableBaseUrls?: string[];
  verified?: boolean;
  verifiedAt?: string;
}

const Indexers = () => {
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableIndexers, setAvailableIndexers] = useState<AvailableIndexer[]>([]);
  const [selectedIndexer, setSelectedIndexer] = useState<AvailableIndexer | null>(null);
  const [editingIndexer, setEditingIndexer] = useState<Indexer | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; error?: string }>>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("");
  const [privacyFilter, setPrivacyFilter] = useState<string>("");
  const [verifiedFilter, setVerifiedFilter] = useState<boolean>(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Indexer>>({});
  
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();
  
  const {
    isOpen: isConfigModalOpen,
    onOpen: onConfigModalOpen,
    onClose: onConfigModalClose,
  } = useDisclosure();

  useEffect(() => {
    fetchIndexers();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      fetchAvailableIndexers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddModalOpen, searchQuery, protocolFilter, privacyFilter, verifiedFilter]);

  const fetchIndexers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`);
      const fetchedIndexers = response.data.data || [];
      setIndexers(fetchedIndexers);
      
      // Clear test results after a delay to allow users to see them
      setTimeout(() => {
        setTestResults({});
      }, 10000); // Clear after 10 seconds
    } catch (error) {
      console.error("Error fetching indexers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableIndexers = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (protocolFilter) params.protocol = protocolFilter;
      if (privacyFilter) params.privacy = privacyFilter;
      if (verifiedFilter) params.verified = 'true';
      
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/available`, { params });
      setAvailableIndexers(response.data.indexers || []);
    } catch (error) {
      console.error("Error fetching available indexers:", error);
    }
  };

  const handleAddIndexer = (indexer: AvailableIndexer) => {
    setSelectedIndexer(indexer);
    // For NZB indexers, set indexerType to "Newznab", otherwise "Cardigann"
    const indexerType = indexer.protocol === "nzb" ? "Newznab" : "Cardigann";
    setFormData({
      name: indexer.name,
      protocol: indexer.protocol,
      privacy: indexer.privacy,
      priority: 25,
      syncProfile: "Standard",
      enabled: true,
      redirected: false,
      language: indexer.language,
      description: indexer.description,
      categories: indexer.categories,
      indexerType: indexerType,
      status: "enabled",
      baseUrl: indexer.availableBaseUrls?.[0] || "",
      availableBaseUrls: indexer.availableBaseUrls || [],
    });
    setTestError(null);
    setTestSuccess(false);
    onAddModalClose();
    onConfigModalOpen();
  };

  const handleEditIndexer = async (indexer: Indexer) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read/${indexer.id}`);
      setEditingIndexer(response.data);
      setFormData(response.data);
      setTestError(null);
      setTestSuccess(false);
      onConfigModalOpen();
    } catch (error) {
      console.error("Error fetching indexer details:", error);
      setEditingIndexer(indexer);
      setFormData(indexer);
      setTestError(null);
      setTestSuccess(false);
      onConfigModalOpen();
    }
  };

  const handleTestIndexerConfig = async () => {
    if (!formData.baseUrl) {
      setTestError("Base URL is required");
      setTestSuccess(false);
      return;
    }
    
    try {
      setTesting(true);
      setTestError(null);
      setTestSuccess(false);
      
      const response = await axios.post(`${API_BASE_URL}/api/Indexers/test`, formData);
      
      if (response.data.success) {
        setTestSuccess(true);
        setTestError(null);
      } else {
        setTestError(response.data.error || "Test failed");
        setTestSuccess(false);
      }
    } catch (error: any) {
      setTestError(error.response?.data?.error || error.message || "Test failed");
      setTestSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveIndexer = async () => {
    try {
      if (editingIndexer) {
        await axios.put(`${API_BASE_URL}/api/Indexers/update/${editingIndexer.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/Indexers/create`, formData);
      }
      fetchIndexers();
      onConfigModalClose();
      setEditingIndexer(null);
      setFormData({});
    } catch (error) {
      console.error("Error saving indexer:", error);
    }
  };

  const handleDeleteIndexer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this indexer?")) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/Indexers/delete/${id}`);
      fetchIndexers();
    } catch (error) {
      console.error("Error deleting indexer:", error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await axios.post(`${API_BASE_URL}/api/Indexers/sync`);
      fetchIndexers();
    } catch (error) {
      console.error("Error syncing indexers:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestAll = async () => {
    try {
      setTesting(true);
      setTestResults({});
      const response = await axios.post(`${API_BASE_URL}/api/Indexers/test-all`);
      
      // Refresh indexers to get latest status after testing
      const refreshResponse = await axios.get(`${API_BASE_URL}/api/Indexers/read`);
      const updatedIndexers = refreshResponse.data.data || [];
      setIndexers(updatedIndexers);
      
      // Track test results if available in response
      if (response.data?.results) {
        const results: Record<number, { success: boolean; error?: string }> = {};
        response.data.results.forEach((result: any) => {
          if (result.indexerId || result.id) {
            const id = result.indexerId || result.id;
            results[id] = {
              success: result.success || false,
              error: result.error || result.message || undefined,
            };
          }
        });
        setTestResults(results);
      } else {
        // If no structured results, infer from updated status
        const results: Record<number, { success: boolean; error?: string }> = {};
        updatedIndexers.forEach((idx: Indexer) => {
          if (idx.id) {
            results[idx.id] = {
              success: idx.status !== "error" && idx.enabled,
              error: idx.status === "error" ? "Connection failed" : undefined,
            };
          }
        });
        setTestResults(results);
      }
    } catch (error) {
      console.error("Error testing indexers:", error);
      // Still fetch to get updated status
      fetchIndexers();
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (indexer: Indexer) => {
    if (!indexer.enabled) {
      return <XCircle className="w-5 h-5 text-default-400" />;
    }
    if (indexer.status === "error") {
      return <AlertCircle className="w-5 h-5 text-danger" />;
    }
    if (indexer.redirected) {
      return <CheckCircle2 className="w-5 h-5 text-warning" />;
    }
    return <CheckCircle2 className="w-5 h-5 text-success" />;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setProtocolFilter("");
    setPrivacyFilter("");
    setVerifiedFilter(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                Indexers
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                Manage your torrent and NZB indexers
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
            <Button
                color="secondary"
                className="btn-glow flex-1 xs:flex-none"
                size="sm"
              startContent={<Plus size={16} />}
              onPress={onAddModalOpen}
            >
                <span className="hidden xs:inline">Add Indexer</span>
                <span className="xs:hidden">Add</span>
            </Button>
            <Button
              variant="flat"
                color="secondary"
                size="sm"
              startContent={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
              onPress={handleSync}
              isLoading={syncing}
            >
                <span className="hidden sm:inline">Sync</span>
            </Button>
            <Button
              variant="flat"
                color="secondary"
                size="sm"
              startContent={<TestTube size={16} />}
              onPress={handleTestAll}
              isLoading={testing}
            >
                <span className="hidden sm:inline">Test All</span>
            </Button>
            </div>
          </div>
          </div>
        </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : indexers.length === 0 ? (
          <Card className="card-interactive">
            <CardBody className="text-center py-12 sm:py-16 px-4">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No Indexers Configured</h3>
                  <p className="text-sm sm:text-base text-foreground/60 mb-4">
                    Get started by adding your first indexer to begin discovering content.
                  </p>
                  <Button
                    color="secondary"
                    className="btn-glow"
                    size="sm"
                    startContent={<Plus size={16} />}
                    onPress={onAddModalOpen}
                  >
                    Add Your First Indexer
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
            {indexers.map((indexer) => (
              <Card 
                            key={indexer.id}
                className="card-interactive group"
                isPressable
                onPress={() => handleEditIndexer(indexer)}
                          >
                <CardHeader className="flex-col items-start pb-2 gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 w-full">
                    {getStatusIcon(indexer)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-1 group-hover:text-secondary transition-colors">
                                {indexer.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-foreground/60 line-clamp-1 mt-0.5">
                        {indexer.baseUrl || indexer.description || "No description"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/40 group-hover:text-secondary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 w-full">
                    {!indexer.enabled && (
                      <Chip size="sm" color="default" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6">
                        Disabled
                      </Chip>
                    )}
                    {indexer.redirected && (
                      <Chip size="sm" color="warning" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6">
                        Redirected
                      </Chip>
                    )}
                                {indexer.verified && (
                      <Chip size="sm" color="success" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6">
                        ✓ Verified
                                  </Chip>
                                )}
                              </div>
                </CardHeader>
                <CardBody className="pt-0 space-y-2 sm:space-y-3">
                  {/* Test Results */}
                  {testResults[indexer.id!] && (
                    <div className={`flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg border ${
                      testResults[indexer.id!].success
                        ? "bg-success/10 border-success/30"
                        : "bg-danger/10 border-danger/30"
                    }`}>
                      {testResults[indexer.id!].success ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] sm:text-xs text-success leading-tight font-medium">
                            Test successful!
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-danger flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] sm:text-xs text-danger leading-tight">
                            {testResults[indexer.id!].error || "Test failed"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Status Message */}
                  {indexer.status === "error" && !testResults[indexer.id!] && (
                    <div className="flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-danger/10 border border-danger/20 rounded-lg">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-danger flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] sm:text-xs text-danger leading-tight">
                        Connection failed - check configuration
                      </p>
                    </div>
                  )}
                  
                  {/* Primary Info Chips */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Chip size="sm" variant="flat" color="secondary" className="text-[10px] sm:text-xs h-5 sm:h-6">
                      {indexer.protocol.toUpperCase()}
                              </Chip>
                    <Chip size="sm" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6">
                                {indexer.privacy}
                              </Chip>
                    {indexer.language && (
                      <Chip size="sm" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6">
                        {indexer.language}
                                        </Chip>
                    )}
                    {indexer.syncProfile && (
                      <Chip size="sm" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6 hidden md:flex">
                        {indexer.syncProfile}
                                        </Chip>
                                      )}
                              </div>

                  {/* Categories */}
                  {indexer.categories && indexer.categories.length > 0 && (
                    <div className="text-[10px] sm:text-xs text-foreground/60 leading-tight">
                      <span className="font-medium">Categories:</span> {indexer.categories.slice(0, 2).join(", ")}
                      {indexer.categories.length > 2 && ` +${indexer.categories.length - 2} more`}
                              </div>
                  )}

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-secondary/10 gap-2">
                    <div className="flex flex-col gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-foreground/60 min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate">
                        <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">Priority: {indexer.priority}</span>
                </div>
                      {indexer.verifiedAt && (
                        <div className="flex items-center gap-1 truncate" title={`Last tested: ${new Date(indexer.verifiedAt).toLocaleString()}`}>
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">Tested {new Date(indexer.verifiedAt).toLocaleDateString()}</span>
                </div>
                      )}
                      {indexer.createdAt && !indexer.verifiedAt && (
                        <div className="flex items-center gap-1 truncate" title={`Added: ${new Date(indexer.createdAt).toLocaleString()}`}>
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">Added {new Date(indexer.createdAt).toLocaleDateString()}</span>
                </div>
                      )}
                </div>
                    <Switch
                      size="sm"
                      color="secondary"
                      isSelected={indexer.enabled}
                      onValueChange={async (enabled) => {
                        try {
                          await axios.put(`${API_BASE_URL}/api/Indexers/update/${indexer.id}`, {
                            ...indexer,
                            enabled,
                          });
                          fetchIndexers();
                        } catch (error) {
                          console.error("Error updating indexer:", error);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
              </div>
                </CardBody>
              </Card>
            ))}
                </div>
        )}
                </div>

        {/* Add Indexer Modal */}
        <Modal
          isOpen={isAddModalOpen}
        onClose={onAddModalClose}
        size="3xl"
          scrollBehavior="inside"
        classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20 mx-2 sm:mx-4 shadow-xl shadow-secondary/10",
        }}
        >
          <ModalContent>
          <ModalHeader className="border-b border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent px-4 sm:px-6 py-4 sm:py-5">
            <div className="w-full">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                Add Indexer
              </h2>
              <p className="text-sm sm:text-base text-foreground/70 font-normal mt-1">
                Browse and select an indexer to add to your collection
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="py-5 sm:py-6 px-4 sm:px-6">
            {/* Search and Filters */}
            <div className="space-y-4 mb-5">
              <div className="relative">
                <Input
                  placeholder="Search indexers by name, protocol, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="md"
                  startContent={<Search size={18} className="text-secondary" />}
                  classNames={{
                    base: "w-full",
                    inputWrapper: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all duration-200 shadow-sm",
                    input: "text-sm sm:text-base",
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={showFilters ? "solid" : "flat"}
                  color="secondary"
                  startContent={<Filter size={16} />}
                  onPress={() => setShowFilters(!showFilters)}
                  className={`text-xs sm:text-sm transition-all ${showFilters ? "btn-glow" : ""}`}
                  >
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
                {(protocolFilter || privacyFilter || verifiedFilter) && (
                  <Button
                    size="sm"
                    variant="flat"
                    color="default"
                    startContent={<X size={14} />}
                    onPress={clearFilters}
                    className="text-xs sm:text-sm"
                  >
                    Clear All
                  </Button>
                )}
                </div>

              {showFilters && (
                <div className="p-4 sm:p-5 bg-content2 rounded-xl border-2 border-secondary/20 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-secondary" />
                    <h3 className="text-sm font-semibold text-foreground">Filter Options</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                      label="Protocol Type"
                      placeholder="All Protocols"
                      selectedKeys={protocolFilter ? [protocolFilter] : []}
                      onChange={(e) => setProtocolFilter(e.target.value)}
                      size="sm"
                      classNames={{
                        base: "w-full",
                        trigger: "bg-content1 border border-secondary/20 hover:border-secondary/40",
                        label: "text-xs sm:text-sm font-medium text-foreground",
                    }}
                  >
                    <SelectItem key="torrent">Torrent</SelectItem>
                    <SelectItem key="nzb">NZB</SelectItem>
                  </Select>
                  <Select
                      label="Privacy Level"
                      placeholder="All Privacy Levels"
                      selectedKeys={privacyFilter ? [privacyFilter] : []}
                      onChange={(e) => setPrivacyFilter(e.target.value)}
                      size="sm"
                      classNames={{
                        base: "w-full",
                        trigger: "bg-content1 border border-secondary/20 hover:border-secondary/40",
                        label: "text-xs sm:text-sm font-medium text-foreground",
                    }}
                  >
                      <SelectItem key="Public">Public</SelectItem>
                      <SelectItem key="Private">Private</SelectItem>
                  </Select>
                    <div className="flex flex-col justify-end">
                      <label className="text-xs sm:text-sm font-medium text-foreground mb-2">
                        Verification Status
                      </label>
                      <div className="flex items-center gap-3 p-2 bg-content1 rounded-lg border border-secondary/20">
                        <Switch
                          size="sm"
                          color="secondary"
                          isSelected={verifiedFilter}
                          onValueChange={setVerifiedFilter}
                          classNames={{
                            wrapper: "group-data-[selected=true]:bg-secondary",
                          }}
                        >
                          <span className="text-xs sm:text-sm text-foreground/80">Verified Only</span>
                        </Switch>
                </div>
                </div>
                  </div>
                </div>
              )}
            </div>

            {/* Indexer List */}
            <div className="space-y-3 max-h-[60vh] sm:max-h-[500px] overflow-y-auto pr-1">
              {availableIndexers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Search className="w-6 h-6 text-secondary/60" />
                    </div>
                    <p className="text-sm text-foreground/60 font-medium">No indexers found</p>
                    <p className="text-xs text-foreground/50">Try adjusting your search or filters</p>
                  </div>
                </div>
              ) : (
                availableIndexers.map((indexer, idx) => (
                  <Card
                    key={idx}
                    className="card-interactive group cursor-pointer border-2 border-secondary/10 hover:border-secondary/30 transition-all duration-200"
                    isPressable
                    onPress={() => handleAddIndexer(indexer)}
                  >
                    <CardBody className="py-3 sm:py-4 px-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-secondary transition-colors truncate">
                              {indexer.name}
                            </h4>
                            {indexer.verified && (
                            <Chip
                              size="sm"
                              variant="flat"
                                color="success" 
                                className="text-xs h-6 flex-shrink-0 font-medium"
                              >
                                ✓ Verified
                                </Chip>
                              )}
                            </div>
                          <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed mb-3 line-clamp-2">
                            {indexer.description || "No description available"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Chip
                              size="sm"
                              variant="flat"
                              color="secondary" 
                              className="text-xs h-6 font-medium"
                            >
                              {indexer.protocol.toUpperCase()}
                            </Chip>
                            <Chip 
                              size="sm" 
                              variant="flat" 
                              className="text-xs h-6 font-medium bg-content3"
                            >
                              {indexer.privacy}
                            </Chip>
                            <Chip 
                              size="sm"
                              variant="flat" 
                              className="text-xs h-6 font-medium bg-content3"
                            >
                              {indexer.language}
                            </Chip>
                </div>
                </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors">
                            <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>

      {/* Config Modal */}
        <Modal
          isOpen={isConfigModalOpen}
          onClose={() => {
              onConfigModalClose();
              setEditingIndexer(null);
              setFormData({});
              setTestError(null);
              setTestSuccess(false);
          }}
          size="2xl"
          scrollBehavior="inside"
        classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20 mx-2 sm:mx-4",
        }}
        >
          <ModalContent>
          <ModalHeader className="border-b border-secondary/20 px-4 sm:px-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {editingIndexer ? "Edit" : "Add"} Indexer{formData.indexerType ? ` - ${formData.indexerType}` : ""}
              </h2>
              <p className="text-xs sm:text-sm text-foreground/60 font-normal truncate">
                {formData.name || "Configure your indexer"}
                    </p>
                  </div>
          </ModalHeader>
          <ModalBody className="py-4 sm:py-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
                <Input
                  label="Name"
                  value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size="sm"
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-xs sm:text-sm",
              }}
            />

            {formData.availableBaseUrls && formData.availableBaseUrls.length > 0 ? (
                <Select
                label="Base URL"
                  selectedKeys={formData.baseUrl ? [formData.baseUrl] : []}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                size="sm"
                classNames={{
                  trigger: "bg-content2 border border-secondary/20",
                  label: "text-xs sm:text-sm",
                  }}
                >
                {formData.availableBaseUrls.map((url) => (
                    <SelectItem key={url} value={url}>
                      {url}
                    </SelectItem>
                  ))}
                </Select>
            ) : (
                <Input
                label="Base URL"
                value={formData.baseUrl || ""}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                size="sm"
                classNames={{
                  inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                  label: "text-xs sm:text-sm",
                }}
              />
            )}

            {/* Sync Profile - Show for all indexers */}
            <Select
              label="Sync Profile"
              selectedKeys={formData.syncProfile ? [formData.syncProfile] : ["Standard"]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setFormData({ ...formData, syncProfile: selected });
              }}
              size="sm"
              description="App profiles are used to control RSS, Automatic Search and Interactive Search settings on application sync"
              classNames={{
                trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-xs sm:text-sm",
                description: "text-[10px] sm:text-xs text-foreground/50",
              }}
            >
              <SelectItem key="Standard">Standard</SelectItem>
              <SelectItem key="Disabled">Disabled</SelectItem>
            </Select>

            {/* Redirect checkbox - Show for all indexers */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-content2 rounded-lg border border-secondary/20">
              <div className="flex-1">
                <span className="text-xs sm:text-sm font-medium">Redirect</span>
                <p className="text-[10px] sm:text-xs text-foreground/50 mt-0.5">
                  Redirect incoming download request for indexer and pass the grab directly instead of proxying the request
                </p>
              </div>
              <Switch
                size="sm"
                color="secondary"
                isSelected={formData.redirected || false}
                onValueChange={(redirected) => setFormData({ ...formData, redirected })}
              />
            </div>

            {/* NZB-specific fields (API Key, VIP Expiration) */}
            {formData.protocol === "nzb" && (
              <>
                <Input
                  label="API Key"
                  type="password"
                  value={formData.apiKey || ""}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  size="sm"
                  description="Site API Key"
                  placeholder="Enter your API key"
                  classNames={{
                    inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    label: "text-xs sm:text-sm",
                    description: "text-[10px] sm:text-xs text-foreground/50",
                  }}
                />
                <Input
                  label="VIP Expiration"
                  type="text"
                  value={formData.vipExpiration || ""}
                  onChange={(e) => setFormData({ ...formData, vipExpiration: e.target.value })}
                  size="sm"
                  description="Enter date (yyyy-mm-dd) for VIP Expiration or blank, will notify 1 week from expiration of VIP"
                  placeholder="yyyy-mm-dd"
                  classNames={{
                    inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    label: "text-xs sm:text-sm",
                    description: "text-[10px] sm:text-xs text-foreground/50",
                  }}
                />
              </>
            )}

            {/* Username/Password for Private torrent indexers (not for NZB) */}
            {formData.privacy === "Private" && formData.protocol !== "nzb" && (
              <>
                <Input
                  label="Username"
                  value={formData.username || ""}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  size="sm"
                  classNames={{
                    inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    label: "text-xs sm:text-sm",
                  }}
                />
                <Input
                  label="Password"
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  size="sm"
                  classNames={{
                    inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    label: "text-xs sm:text-sm",
                  }}
                />
              </>
            )}

            {/* Tags - Show for all indexers */}
            <Input
              label="Tags"
              value={formData.tags || ""}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              size="sm"
              description="Use tags to specify Indexer Proxies or which apps the indexer is synced to. Tags should be used with caution, they can have unintended effects."
              placeholder="Enter tags separated by commas"
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-xs sm:text-sm",
                description: "text-[10px] sm:text-xs text-foreground/50",
              }}
            />

            <Input
              label="Priority"
              type="number"
              value={formData.priority?.toString() || "25"}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              size="sm"
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-xs sm:text-sm",
                  }}
                />

            <div className="flex items-center justify-between p-3 sm:p-4 bg-content2 rounded-lg border border-secondary/20">
              <span className="text-xs sm:text-sm font-medium">Enabled</span>
                  <Switch
                size="sm"
                color="secondary"
                isSelected={formData.enabled}
                onValueChange={(enabled) => setFormData({ ...formData, enabled })}
              />
                </div>

            {/* Test Status */}
            {testError && (
              <div className="p-2 sm:p-3 bg-danger/10 border border-danger rounded-lg flex items-start gap-1.5 sm:gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-danger leading-tight">{testError}</p>
                </div>
            )}
            {testSuccess && (
              <div className="p-2 sm:p-3 bg-success/10 border border-success rounded-lg flex items-start gap-1.5 sm:gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-success leading-tight">Test successful!</p>
              </div>
            )}

            {/* Test Button */}
            <Button
              color="secondary"
              variant="flat"
              size="sm"
              startContent={<TestTube size={16} />}
              onPress={handleTestIndexerConfig}
              isLoading={testing}
              fullWidth
              className="text-xs sm:text-sm"
            >
              Test Connection
            </Button>
          </ModalBody>
          <ModalFooter className="border-t border-secondary/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
              {editingIndexer && (
                <Button
                  color="danger"
                  variant="flat"
                  size="sm"
                  startContent={<Trash2 size={16} />}
                  onPress={() => {
                    if (editingIndexer.id) {
                      handleDeleteIndexer(editingIndexer.id);
                      onConfigModalClose();
                      setEditingIndexer(null);
                      setFormData({});
                    }
                  }}
                  className="text-xs sm:text-sm w-full sm:w-auto"
                >
                  Delete
              </Button>
              )}
              <div className="flex gap-2 ml-auto w-full sm:w-auto">
              <Button
                  variant="flat"
                  size="sm"
                  onPress={() => {
                    onConfigModalClose();
                    setEditingIndexer(null);
                    setFormData({});
                  }}
                  className="text-xs sm:text-sm flex-1 sm:flex-none"
                >
                  Cancel
              </Button>
              <Button 
                  color="secondary"
                  className="btn-glow text-xs sm:text-sm flex-1 sm:flex-none"
                  size="sm"
                onPress={handleSaveIndexer}
              >
                  Save Indexer
              </Button>
              </div>
            </div>
            </ModalFooter>
          </ModalContent>
        </Modal>
        </div>
    );
};

export default Indexers;

"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
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
  CheckSquare,
  Grid3x3,
  ArrowUpDown,
  Filter,
  X,
  Settings,
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
  
  // Filters for available indexers
  const [searchQuery, setSearchQuery] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [privacyFilter, setPrivacyFilter] = useState<string>("");
  const [verifiedFilter, setVerifiedFilter] = useState<boolean>(false);
  const [openSelects, setOpenSelects] = useState<Set<string>>(new Set());
  const [openConfigSelects, setOpenConfigSelects] = useState<Set<string>>(new Set());
  
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
      // Reset filters when modal opens to show all indexers by default
      setSearchQuery("");
      setProtocolFilter("");
      setLanguageFilter("");
      setPrivacyFilter("");
      setVerifiedFilter(false);
      setOpenSelects(new Set());
    }
  }, [isAddModalOpen]);

  useEffect(() => {
    if (isConfigModalOpen) {
      // Reset open selects when config modal opens
      setOpenConfigSelects(new Set());
    }
  }, [isConfigModalOpen]);

  useEffect(() => {
    // Fetch when modal opens or filters change
    if (isAddModalOpen) {
      fetchAvailableIndexers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddModalOpen, searchQuery, protocolFilter, languageFilter, privacyFilter, verifiedFilter]);

  const fetchIndexers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read`);
      setIndexers(response.data.data || []);
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
      if (languageFilter) params.language = languageFilter;
      if (privacyFilter) params.privacy = privacyFilter;
      if (verifiedFilter) params.verified = 'true';
      
      console.log("Fetching indexers with filters:", params);
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/available`, { params });
      console.log("Received indexers:", response.data.indexers?.length || 0);
      console.log("Verified filter active:", verifiedFilter);
      console.log("Sample indexers:", response.data.indexers?.slice(0, 3).map((i: AvailableIndexer) => ({ name: i.name, verified: i.verified })));
      setAvailableIndexers(response.data.indexers || []);
    } catch (error) {
      console.error("Error fetching available indexers:", error);
    }
  };

  const handleAddIndexer = (indexer: AvailableIndexer) => {
    setSelectedIndexer(indexer);
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
      indexerType: "Cardigann",
      status: "enabled",
      baseUrl: indexer.availableBaseUrls && indexer.availableBaseUrls.length > 0 
        ? indexer.availableBaseUrls[0] 
        : "",
    });
    setTestError(null);
    setTestSuccess(false);
    onAddModalClose();
    onConfigModalOpen();
  };

  const handleEditIndexer = async (indexer: Indexer) => {
    try {
      // Fetch full indexer data with available base URLs
      const response = await axios.get(`${API_BASE_URL}/api/Indexers/read/${indexer.id}`);
      const fullIndexer = response.data;
      setEditingIndexer(fullIndexer);
      setFormData(fullIndexer);
      setTestError(null);
      setTestSuccess(false);
      onConfigModalOpen();
    } catch (error) {
      console.error("Error fetching indexer details:", error);
      // Fallback to using the indexer data we already have
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
      const errorMsg = error.response?.data?.error || error.message || "Test failed";
      setTestError(errorMsg);
      setTestSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveIndexer = async () => {
    // Test before saving
    if (!testSuccess) {
      await handleTestIndexerConfig();
      if (!testSuccess) {
        return; // Don't save if test fails
      }
    }
    
    try {
      if (editingIndexer?.id) {
        await axios.put(`${API_BASE_URL}/api/Indexers/update/${editingIndexer.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/Indexers/create`, formData);
      }
      await fetchIndexers();
      onConfigModalClose();
      setEditingIndexer(null);
      setFormData({});
      setTestError(null);
      setTestSuccess(false);
    } catch (error) {
      console.error("Error saving indexer:", error);
      alert("Failed to save indexer");
    }
  };

  const handleTestIndexer = async (id: number) => {
    try {
      setTesting(true);
      const response = await axios.post(`${API_BASE_URL}/api/Indexers/test/${id}`);
      alert(response.data.success ? "Test successful!" : "Test failed: " + response.data.message);
    } catch (error) {
      console.error("Error testing indexer:", error);
      alert("Failed to test indexer");
    } finally {
      setTesting(false);
    }
  };

  const handleTestAll = async () => {
    try {
      setTesting(true);
      const response = await axios.post(`${API_BASE_URL}/api/Indexers/test-all`);
      const results = response.data.results || [];
      const successCount = results.filter((r: any) => r.success).length;
      alert(`Tested ${results.length} indexers. ${successCount} successful, ${results.length - successCount} failed.`);
    } catch (error) {
      console.error("Error testing all indexers:", error);
      alert("Failed to test indexers");
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await axios.post(`${API_BASE_URL}/api/Indexers/sync`);
      alert("Indexers synced successfully");
    } catch (error) {
      console.error("Error syncing indexers:", error);
      alert("Failed to sync indexers");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this indexer?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/Indexers/delete/${id}`);
      await fetchIndexers();
    } catch (error) {
      console.error("Error deleting indexer:", error);
      alert("Failed to delete indexer");
    }
  };

  const getStatusColor = (status?: string, enabled?: boolean, redirected?: boolean) => {
    if (!enabled) return "default";
    if (redirected || status === "enabled_redirected") return "primary";
    if (status === "error") return "danger";
    return "success";
  };

  const getStatusLabel = (status?: string, enabled?: boolean, redirected?: boolean) => {
    if (!enabled) return "Disabled";
    if (redirected || status === "enabled_redirected") return "Enabled, Redirected";
    if (status === "error") return "Error";
    return "Enabled";
  };

  const stats = {
    total: indexers.length,
    enabled: indexers.filter((i) => i.enabled).length,
    torrent: indexers.filter((i) => i.protocol === "torrent").length,
    usenet: indexers.filter((i) => i.protocol === "nzb").length,
  };

  return (
    <div className="Indexers page min-h-screen bg-background p-6">
      <div className="container max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Indexers</h1>
          <div className="flex gap-2">
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={onAddModalOpen}
            >
              Add Indexer
            </Button>
            <Button
              variant="flat"
              startContent={<RefreshCw size={16} className={syncing ? "animate-spin" : ""} />}
              onPress={handleSync}
              isLoading={syncing}
            >
              Sync App Indexers
            </Button>
            <Button
              variant="flat"
              startContent={<TestTube size={16} />}
              onPress={handleTestAll}
              isLoading={testing}
            >
              Test All Indexers
            </Button>
            <Button variant="flat" startContent={<CheckSquare size={16} />}>
              Select Indexers
            </Button>
            <Button variant="flat" isIconOnly>
              <Grid3x3 size={16} />
            </Button>
            <Button variant="flat" isIconOnly>
              <ArrowUpDown size={16} />
            </Button>
            <Button variant="flat" isIconOnly>
              <Filter size={16} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <Card>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-divider">
                        <th className="text-left p-3">Indexer Name</th>
                        <th className="text-left p-3">Protocol</th>
                        <th className="text-left p-3">Privacy</th>
                        <th className="text-left p-3">Priority</th>
                        <th className="text-left p-3">Sync Profile</th>
                        <th className="text-left p-3">Added</th>
                        <th className="text-left p-3">Categories</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indexers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center p-8 text-default-500">
                            No indexers configured. Click "Add Indexer" to get started.
                          </td>
                        </tr>
                      ) : (
                        indexers.map((indexer) => (
                          <tr
                            key={indexer.id}
                            className="border-b border-divider hover:bg-content2 transition-colors"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    getStatusColor(
                                      indexer.status,
                                      indexer.enabled,
                                      indexer.redirected
                                    ) === "success"
                                      ? "bg-success"
                                      : getStatusColor(
                                          indexer.status,
                                          indexer.enabled,
                                          indexer.redirected
                                        ) === "primary"
                                      ? "bg-primary"
                                      : getStatusColor(
                                          indexer.status,
                                          indexer.enabled,
                                          indexer.redirected
                                        ) === "danger"
                                      ? "bg-danger"
                                      : "bg-default"
                                  }`}
                                />
                                {indexer.name}
                                {indexer.verified && (
                                  <Chip size="sm" color="success" variant="flat">
                                    Verified
                                  </Chip>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <Chip
                                size="sm"
                                color={indexer.protocol === "torrent" ? "success" : "primary"}
                                variant="flat"
                              >
                                {indexer.protocol}
                              </Chip>
                            </td>
                            <td className="p-3">
                              <Chip
                                size="sm"
                                color={indexer.privacy === "Private" ? "primary" : "danger"}
                                variant="flat"
                              >
                                {indexer.privacy}
                              </Chip>
                            </td>
                            <td className="p-3">{indexer.priority}</td>
                            <td className="p-3">{indexer.syncProfile}</td>
                            <td className="p-3">
                              {indexer.createdAt
                                ? new Date(indexer.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "-"}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  // Get unique categories
                                  const uniqueCategories = Array.from(new Set(indexer.categories || []));
                                  const displayCount = 5;
    return (
                                    <>
                                      {uniqueCategories.slice(0, displayCount).map((cat, idx) => (
                                        <Chip key={idx} size="sm" variant="flat" color="warning">
                                          {cat}
                                        </Chip>
                                      ))}
                                      {uniqueCategories.length > displayCount && (
                                        <Chip size="sm" variant="flat" title={`${uniqueCategories.slice(displayCount).join(", ")}`}>
                                          +{uniqueCategories.length - displayCount}
                                        </Chip>
                                      )}
                                      {uniqueCategories.length === 0 && (
                                        <span className="text-xs text-default-400">No categories</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="light"
                                  isIconOnly
                                  onPress={() => indexer.id && handleEditIndexer(indexer)}
                                >
                                  <Settings size={16} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  isIconOnly
                                  onPress={() => indexer.id && handleTestIndexer(indexer.id)}
                                  isLoading={testing}
                                >
                                  <TestTube size={16} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  isIconOnly
                                  onPress={() => indexer.id && handleDelete(indexer.id)}
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Enabled, Redirected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-default" />
                  <span>Disabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <span>Error</span>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold">Indexers:</span> {stats.total}
                </div>
                <div>
                  <span className="font-semibold">Enabled:</span> {stats.enabled}
                </div>
                <div>
                  <span className="font-semibold">Torrent:</span> {stats.torrent}
                </div>
                <div>
                  <span className="font-semibold">Usenet:</span> {stats.usenet}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add Indexer Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            if (openSelects.size === 0) {
              onAddModalClose();
            }
          }}
          size="5xl"
          scrollBehavior="inside"
          shouldBlockScroll={true}
          hideCloseButton={false}
          isDismissable={openSelects.size === 0}
        >
          <ModalContent>
            <ModalHeader>Add Indexer</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  placeholder="Search indexers"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  startContent={<Filter size={16} />}
                />
                <div className="flex items-center gap-2 mb-2">
                  <Switch
                    isSelected={verifiedFilter}
                    onValueChange={setVerifiedFilter}
                  >
                    Show Only Verified Working
                  </Switch>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Select
                    placeholder="Protocol"
                    selectedKeys={protocolFilter ? new Set([protocolFilter]) : new Set()}
                    onSelectionChange={(keys) => {
                      const keyArray = Array.from(keys);
                      const selected = keyArray.length > 0 ? (keyArray[0] as string) : "";
                      setProtocolFilter(selected);
                    }}
                    selectionMode="single"
                    onOpenChange={(open) => {
                      setOpenSelects((prev) => {
                        const next = new Set(prev);
                        if (open) {
                          next.add("protocol");
                        } else {
                          next.delete("protocol");
                        }
                        return next;
                      });
                    }}
                  >
                    <SelectItem key="torrent">Torrent</SelectItem>
                    <SelectItem key="nzb">NZB</SelectItem>
                  </Select>
                  <Select
                    placeholder="Language"
                    selectedKeys={languageFilter ? new Set([languageFilter]) : new Set()}
                    onSelectionChange={(keys) => {
                      const keyArray = Array.from(keys);
                      const selected = keyArray.length > 0 ? (keyArray[0] as string) : "";
                      setLanguageFilter(selected);
                    }}
                    selectionMode="single"
                    onOpenChange={(open) => {
                      setOpenSelects((prev) => {
                        const next = new Set(prev);
                        if (open) {
                          next.add("language");
                        } else {
                          next.delete("language");
                        }
                        return next;
                      });
                    }}
                  >
                    <SelectItem key="en-US">English</SelectItem>
                    <SelectItem key="uk-UA">Ukrainian</SelectItem>
                    <SelectItem key="zh-CN">Chinese</SelectItem>
                    <SelectItem key="vi-VN">Vietnamese</SelectItem>
                  </Select>
                  <Select
                    placeholder="Privacy"
                    selectedKeys={privacyFilter ? new Set([privacyFilter]) : new Set()}
                    onSelectionChange={(keys) => {
                      const keyArray = Array.from(keys);
                      const selected = keyArray.length > 0 ? (keyArray[0] as string) : "";
                      setPrivacyFilter(selected);
                    }}
                    selectionMode="single"
                    onOpenChange={(open) => {
                      setOpenSelects((prev) => {
                        const next = new Set(prev);
                        if (open) {
                          next.add("privacy");
                        } else {
                          next.delete("privacy");
                        }
                        return next;
                      });
                    }}
                  >
                    <SelectItem key="Private">Private</SelectItem>
                    <SelectItem key="Public">Public</SelectItem>
                    <SelectItem key="Semi-Private">Semi-Private</SelectItem>
                  </Select>
                  <Select placeholder="Categories" isDisabled>
                    <SelectItem key="all">All</SelectItem>
                  </Select>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg text-sm">
                  Prowlarr supports many indexers in addition to any indexer that uses the
                  Newznab/Torznab standard using &apos;Generic Newznab&apos; (for usenet) or
                  &apos;Generic Torznab&apos; (for torrents). Search & Select your indexer from
                  below.
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-content2">
                      <tr>
                        <th className="text-left p-3">Protocol</th>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Language</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Privacy</th>
                        <th className="text-left p-3">Categories</th>
                        <th className="text-left p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableIndexers.map((indexer, idx) => (
                        <tr key={idx} className="border-b border-divider hover:bg-content2">
                          <td className="p-3">
                            <Chip
                              size="sm"
                              color={indexer.protocol === "torrent" ? "success" : "primary"}
                              variant="flat"
                            >
                              {indexer.protocol}
                            </Chip>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{indexer.name}</span>
                              {indexer.verified && (
                                <Chip size="sm" color="success" variant="flat">
                                  Verified
                                </Chip>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{indexer.language}</td>
                          <td className="p-3 text-sm text-default-500">
                            {indexer.description}
                          </td>
                          <td className="p-3">
                            <Chip
                              size="sm"
                              color={indexer.privacy === "Private" ? "primary" : "danger"}
                              variant="flat"
                            >
                              {indexer.privacy}
                            </Chip>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                // Get unique categories
                                const uniqueCategories = Array.from(new Set(indexer.categories || []));
                                const displayCount = 3;
                                return (
                                  <>
                                    {uniqueCategories.slice(0, displayCount).map((cat, i) => (
                                      <Chip key={i} size="sm" variant="flat" color="warning">
                                        {cat}
                                      </Chip>
                                    ))}
                                    {uniqueCategories.length > displayCount && (
                                      <Chip size="sm" variant="flat" title={`${uniqueCategories.slice(displayCount).join(", ")}`}>
                                        +{uniqueCategories.length - displayCount}
                                      </Chip>
                                    )}
                                    {uniqueCategories.length === 0 && (
                                      <span className="text-xs text-default-400">No categories</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              color="primary"
                              onPress={() => handleAddIndexer(indexer)}
                            >
                              Add
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-sm text-default-500">
                  {availableIndexers.length} indexer(s) available
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onAddModalClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Configure Indexer Modal */}
        <Modal
          isOpen={isConfigModalOpen}
          onClose={() => {
            if (openConfigSelects.size === 0) {
              onConfigModalClose();
              setEditingIndexer(null);
              setFormData({});
              setTestError(null);
              setTestSuccess(false);
            }
          }}
          size="2xl"
          scrollBehavior="inside"
          shouldBlockScroll={true}
          hideCloseButton={false}
          isDismissable={openConfigSelects.size === 0}
        >
          <ModalContent>
            <ModalHeader>
              {editingIndexer ? `Edit Indexer - ${editingIndexer.name}` : `Add Indexer - ${selectedIndexer?.name || "New"}`}
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {/* Test Error/Success Message */}
                {testError && (
                  <div className="bg-danger/10 border border-danger rounded-lg p-3">
                    <p className="text-danger text-sm font-medium">{testError}</p>
                  </div>
                )}
                {testSuccess && !testError && (
                  <div className="bg-success/10 border border-success rounded-lg p-3">
                    <p className="text-success text-sm font-medium">Connection successful</p>
                  </div>
                )}
                
                {/* FlareSolverr Info for Cloudflare-protected sites */}
                {testError && testError.includes("CloudFlare") && (
                  <div className="bg-primary/10 border border-primary rounded-lg p-3">
                    <p className="text-primary text-sm">
                      This site may use Cloudflare DDoS Protection, therefore BorrowArr requires FlareSolverr or Prowlarr proxy to access it.
                    </p>
                  </div>
                )}
                
                <Input
                  label="Name"
                  value={formData.name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData({ ...formData, name: e.target.value });
                    setTestError(null);
                    setTestSuccess(false);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    isSelected={formData.enabled}
                    onValueChange={(val: boolean) => setFormData({ ...formData, enabled: val })}
                  >
                    Enable
                  </Switch>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    isSelected={formData.redirected}
                    onValueChange={(val: boolean) => setFormData({ ...formData, redirected: val })}
                  >
                    Redirect
                  </Switch>
                  <p className="text-xs text-default-500">
                    Redirect incoming download request for indexer and pass the grab directly
                    instead of proxying the request via Prowlarr
                  </p>
                </div>
                <Select
                  label="Sync Profile"
                  selectedKeys={formData.syncProfile ? [formData.syncProfile] : []}
                  onSelectionChange={(keys: any) =>
                    setFormData({ ...formData, syncProfile: Array.from(keys)[0] as string })
                  }
                  onOpenChange={(open) => {
                    setOpenConfigSelects((prev) => {
                      const next = new Set(prev);
                      if (open) {
                        next.add("syncProfile");
                      } else {
                        next.delete("syncProfile");
                      }
                      return next;
                    });
                  }}
                >
                  <SelectItem key="Standard">Standard</SelectItem>
                </Select>
                <p className="text-xs text-default-500 -mt-3">
                  App profiles are used to control RSS, Automatic Search and Interactive Search
                  settings on application sync
                </p>
                <Select
                  label="Base Url"
                  selectedKeys={formData.baseUrl ? [formData.baseUrl] : []}
                  onSelectionChange={(keys: any) => {
                    setFormData({ ...formData, baseUrl: Array.from(keys)[0] as string });
                    setTestError(null);
                    setTestSuccess(false);
                  }}
                  placeholder="Select which base url Prowlarr will use for requests to the site"
                  onOpenChange={(open) => {
                    setOpenConfigSelects((prev) => {
                      const next = new Set(prev);
                      if (open) {
                        next.add("baseUrl");
                      } else {
                        next.delete("baseUrl");
                      }
                      return next;
                    });
                  }}
                >
                  {(editingIndexer?.availableBaseUrls || selectedIndexer?.availableBaseUrls || []).map((url: string) => (
                    <SelectItem key={url} value={url}>
                      {url}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  label="Seed Ratio"
                  type="number"
                  value={formData.seedRatio?.toString() || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, seedRatio: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="Empty uses the download client's default"
                />
                <p className="text-xs text-default-500 -mt-3">
                  The ratio a torrent should reach before stopping, empty uses the download
                  client&apos;s default. Ratio should be at least 1.0 and follow the indexers
                  rules
                </p>
                <Input
                  label="Username"
                  value={formData.username || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                />
                <Input
                  label="Password"
                  type="password"
                  value={formData.password || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData({ ...formData, password: e.target.value });
                    setTestError(null);
                    setTestSuccess(false);
                  }}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    isSelected={formData.stripCyrillicLetters}
                    onValueChange={(val: boolean) =>
                      setFormData({ ...formData, stripCyrillicLetters: val })
                    }
                  >
                    Strip Cyrillic Letters
                  </Switch>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    isSelected={formData.searchFreeleechOnly}
                    onValueChange={(val: boolean) =>
                      setFormData({ ...formData, searchFreeleechOnly: val })
                    }
                  >
                    Search freeleech only
                  </Switch>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Sort requested from site"
                    selectedKeys={formData.sortRequestedFromSite ? [formData.sortRequestedFromSite] : []}
                    onSelectionChange={(keys: any) =>
                      setFormData({
                        ...formData,
                        sortRequestedFromSite: Array.from(keys)[0] as string,
                      })
                    }
                    onOpenChange={(open) => {
                      setOpenConfigSelects((prev) => {
                        const next = new Set(prev);
                        if (open) {
                          next.add("sortRequestedFromSite");
                        } else {
                          next.delete("sortRequestedFromSite");
                        }
                        return next;
                      });
                    }}
                  >
                    <SelectItem key="created">created</SelectItem>
                    <SelectItem key="seeders">seeders</SelectItem>
                    <SelectItem key="size">size</SelectItem>
                  </Select>
                  <Select
                    label="Order requested from site"
                    selectedKeys={formData.orderRequestedFromSite ? [formData.orderRequestedFromSite] : []}
                    onSelectionChange={(keys: any) =>
                      setFormData({
                        ...formData,
                        orderRequestedFromSite: Array.from(keys)[0] as "asc" | "desc",
                      })
                    }
                    onOpenChange={(open) => {
                      setOpenConfigSelects((prev) => {
                        const next = new Set(prev);
                        if (open) {
                          next.add("orderRequestedFromSite");
                        } else {
                          next.delete("orderRequestedFromSite");
                        }
                        return next;
                      });
                    }}
                  >
                    <SelectItem key="asc">asc</SelectItem>
                    <SelectItem key="desc">desc</SelectItem>
                  </Select>
                </div>
                <Input
                  label="Account Inactivity"
                  value={formData.accountInactivity || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, accountInactivity: e.target.value })
                  }
                  placeholder="The tracker has a system for deleting inactive accounts..."
                />
                <Input
                  label="Tags"
                  value={formData.tags || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Use tags to specify Indexer Proxies or which apps the indexer is synced to"
                />
                <p className="text-xs text-default-500 -mt-3">
                  Tags should be used with caution, they can have unintended effects. An indexer
                  with a tag will only sync to apps with the same tag.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onConfigModalClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleTestIndexerConfig}
                startContent={<TestTube size={16} />}
                isLoading={testing}
              >
                Test
              </Button>
              <Button 
                color="primary" 
                onPress={handleSaveIndexer}
                isDisabled={testError !== null && !testSuccess}
              >
                Save
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
            </div>
        </div>
    );
};

export default Indexers;

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
  X,
  Settings,
  Info,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Trash2,
  Clock,
  XCircle,
  Globe,
} from "lucide-react";
import axios from "axios";
import "../../../../styles/DownloadClients.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface DownloadClient {
  id?: number;
  name: string;
  implementation: string;
  protocol: "torrent" | "usenet";
  enabled: boolean;
  priority: number;
  settings: Record<string, any>;
  categories: Array<{ category: string; clientCategory: string }>;
  tags?: string;
  createdAt?: string;
}

interface AvailableDownloadClient {
  implementation: string;
  name: string;
  protocol: "torrent" | "usenet";
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    defaultValue?: any;
    advanced?: boolean;
    options?: any[];
  }>;
}

const DownloadClients = () => {
  const [clients, setClients] = useState<DownloadClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableClients, setAvailableClients] = useState<{
    usenet: AvailableDownloadClient[];
    torrent: AvailableDownloadClient[];
  }>({ usenet: [], torrent: [] });
  const [selectedClient, setSelectedClient] = useState<AvailableDownloadClient | null>(null);
  const [editingClient, setEditingClient] = useState<DownloadClient | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [openSelects, setOpenSelects] = useState<Set<string>>(new Set());
  const [testingAll, setTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; error?: string }>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<DownloadClient>>({
    enabled: true,
    priority: 1,
    settings: {},
    categories: [],
  });

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
    fetchClients();
    fetchAvailableClients();
  }, []);

  useEffect(() => {
    if (isConfigModalOpen) {
      setOpenSelects(new Set());
    }
  }, [isConfigModalOpen]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/DownloadClients/read`);
      setClients(response.data.data || []);
    } catch (error) {
      console.error("Error fetching download clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/DownloadClients/available`);
      setAvailableClients({
        usenet: response.data.usenet || [],
        torrent: response.data.torrent || [],
      });
    } catch (error) {
      console.error("Error fetching available download clients:", error);
    }
  };

  const handleAddClient = (client: AvailableDownloadClient) => {
    setSelectedClient(client);
    setShowAdvanced(false);
    
    const defaultSettings: Record<string, any> = {};
    client.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaultSettings[field.name] = field.defaultValue;
      }
    });

    setFormData({
      name: client.name,
      implementation: client.implementation,
      protocol: client.protocol,
      enabled: true,
      priority: 1,
      settings: defaultSettings,
      categories: [],
    });
    
    setTestError(null);
    setTestSuccess(false);
    onAddModalClose();
    onConfigModalOpen();
  };

  const handleEditClient = async (client: DownloadClient) => {
    setEditingClient(client);
    setFormData(client);
    setTestError(null);
    setTestSuccess(false);
    setShowAdvanced(false);
    
    await fetchAvailableClients();
    
    const allClients = [...availableClients.usenet, ...availableClients.torrent];
    const clientDef = allClients.find(c => c.implementation === client.implementation);
    if (clientDef) {
      setSelectedClient(clientDef);
    }
    
    onConfigModalOpen();
  };

  const handleTestClient = async () => {
    if (!formData.implementation || !formData.settings) {
      setTestError("Implementation and settings are required");
      setTestSuccess(false);
      return;
    }

    try {
      setTesting(true);
      setTestError(null);
      setTestSuccess(false);

      const testData = {
        implementation: formData.implementation,
        settings: formData.settings,
      };

      const response = await axios.post(
        editingClient?.id
          ? `${API_BASE_URL}/api/DownloadClients/test/${editingClient.id}`
          : `${API_BASE_URL}/api/DownloadClients/test`,
        testData
      );

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

  const handleSaveClient = async () => {
    try {
      if (editingClient?.id) {
        await axios.put(`${API_BASE_URL}/api/DownloadClients/update/${editingClient.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/DownloadClients/create`, formData);
      }
      await fetchClients();
      onConfigModalClose();
      setEditingClient(null);
      setFormData({ enabled: true, priority: 1, settings: {}, categories: [] });
      setTestError(null);
      setTestSuccess(false);
    } catch (error) {
      console.error("Error saving download client:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this download client?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/DownloadClients/delete/${id}`);
      await fetchClients();
    } catch (error) {
      console.error("Error deleting download client:", error);
    }
  };

  const handleTestAllClients = async () => {
    if (clients.length === 0) return;

    try {
      setTestingAll(true);
      setTestResults({});

      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/test-all`);

      if (response.data.success && response.data.results) {
        const results: Record<number, { success: boolean; error?: string }> = {};
        response.data.results.forEach((result: any) => {
          if (result.id) {
            results[result.id] = {
              success: result.success || false,
              error: result.error || undefined,
            };
          }
        });
        setTestResults(results);
      }
      
      await fetchClients();
    } catch (error: any) {
      console.error("Error testing all clients:", error);
    } finally {
      setTestingAll(false);
    }
  };

  const getStatusIcon = (client: DownloadClient) => {
    if (!client.enabled) {
      return <XCircle className="w-5 h-5 text-default-400" />;
    }
    if (testResults[client.id!] && !testResults[client.id!].success) {
      return <AlertCircle className="w-5 h-5 text-danger" />;
    }
    return <CheckCircle2 className="w-5 h-5 text-success" />;
  };

  const getWebInterfaceUrl = (client: DownloadClient): string | null => {
    if (!client.settings) return null;
    
    // Try to get host/hostname and port from settings
    const host = client.settings.host || client.settings.hostname;
    const port = client.settings.port;
    const url = client.settings.url;
    
    // If we have a direct URL, use it
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      return url;
    }
    
    // If we have host and port, build the URL
    if (host && port) {
      // Check if host is an IP address or hostname
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
      if (isIP || host.includes('.')) {
        return `http://${host}:${port}`;
      }
    }
    
    // If we only have host, try common ports
    if (host && !port) {
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
      if (isIP || host.includes('.')) {
        // Try common default ports
        return `http://${host}:8080`;
      }
    }
    
    return null;
  };

  const renderField = (field: any, definition: AvailableDownloadClient) => {
    const value = formData.settings?.[field.name] ?? field.defaultValue ?? "";

    switch (field.type) {
      case "text":
      case "textbox":
      case "password":
        return (
          <Input
            key={field.name}
            label={field.label}
            type={field.type === "password" ? "password" : "text"}
            value={String(value)}
            description={field.description}
            onChange={(e) => {
              const newSettings = { ...formData.settings, [field.name]: e.target.value };
              setFormData({ ...formData, settings: newSettings });
              setTestError(null);
              setTestSuccess(false);
            }}
            size="sm"
            classNames={{
              inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
              label: "text-xs sm:text-sm",
              description: "text-[10px] sm:text-xs text-foreground/50",
            }}
          />
        );

      case "number":
        return (
          <Input
            key={field.name}
            label={field.label}
            type="number"
            value={String(value)}
            onChange={(e) => {
              const newSettings = { ...formData.settings, [field.name]: parseInt(e.target.value) || 0 };
              setFormData({ ...formData, settings: newSettings });
              setTestError(null);
              setTestSuccess(false);
            }}
            size="sm"
            classNames={{
              inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
              label: "text-xs sm:text-sm",
              }}
            />
        );

      case "select":
        return (
          <Select
            key={field.name}
            label={field.label}
            selectedKeys={value ? [String(value)] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              const newSettings = { ...formData.settings, [field.name]: selected };
              setFormData({ ...formData, settings: newSettings });
              setTestError(null);
              setTestSuccess(false);
            }}
            size="sm"
            classNames={{
              trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
              label: "text-xs sm:text-sm",
            }}
          >
            {field.options?.map((option: any) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </Select>
        );

      case "checkbox":
        return (
          <div key={field.name} className="flex items-center justify-between p-2 rounded-lg bg-content2 border border-secondary/20">
            <div className="flex-1">
              <label className="text-xs sm:text-sm font-medium text-foreground">
                {field.label}
              </label>
              {field.description && (
                <p className="text-[10px] sm:text-xs text-foreground/50 mt-0.5">
                  {field.description}
                </p>
              )}
            </div>
            <Switch
              size="sm"
              color="secondary"
              isSelected={Boolean(value)}
              onValueChange={(checked) => {
                const newSettings = { ...formData.settings, [field.name]: checked };
                setFormData({ ...formData, settings: newSettings });
                setTestError(null);
                setTestSuccess(false);
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                Download Clients
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                Manage your torrent and usenet download clients
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
                <span className="hidden xs:inline">Add Client</span>
                <span className="xs:hidden">Add</span>
            </Button>
            <Button
                variant="flat"
                color="secondary"
                size="sm"
                startContent={<TestTube size={16} />}
              onPress={handleTestAllClients}
              isLoading={testingAll}
                isDisabled={clients.length === 0}
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
        ) : clients.length === 0 ? (
          <Card className="card-interactive">
            <CardBody className="text-center py-12 sm:py-16 px-4">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Download className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
          </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No Download Clients Configured</h3>
                  <p className="text-sm sm:text-base text-foreground/60 mb-4">
                    Get started by adding your first download client to begin downloading content.
                    </p>
                    <Button
                    color="secondary"
                    className="btn-glow"
                    size="sm"
                    startContent={<Plus size={16} />}
                      onPress={onAddModalOpen}
                    >
                    Add Your First Client
                    </Button>
                </div>
                  </div>
                </CardBody>
              </Card>
                  ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3 sm:gap-4 lg:gap-5">
                {clients.map((client) => (
                  <Card 
                    key={client.id} 
                className="card-interactive group"
                isPressable={false}
                  >
                <CardHeader className="flex-col items-start pb-2 gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 w-full">
                    {getStatusIcon(client)}
                          <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-1">
                        {client.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-foreground/60 line-clamp-1 mt-0.5">
                        {client.implementation}
                      </p>
                          </div>

                          {getWebInterfaceUrl(client) && (
                        <a
                          href={getWebInterfaceUrl(client) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 min-w-0 flex items-center justify-center rounded-lg text-secondary hover:bg-secondary/10 transition-colors"
                          title="Open Web Interface"
                        >
                          <Globe size={14} />
                        </a>
                      )}
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="secondary"
                      onPress={() => handleEditClient(client)}
                      title="Edit Client"
                      className="min-w-0 w-7 h-7"
                    >
                      <Settings size={14} className="text-secondary" />
                    </Button>
                        </div>
                  <div className="flex flex-wrap gap-1.5 w-full">
                    {!client.enabled && (
                      <Chip size="sm" color="default" variant="flat" className="text-[10px] sm:text-xs h-5 sm:h-6">
                        Disabled
                      </Chip>
                    )}
                              <Chip
                      size="sm" 
                                variant="flat"
                            color={client.protocol === "torrent" ? "success" : "primary"}
                      className="text-[10px] sm:text-xs h-5 sm:h-6"
                              >
                      {client.protocol.toUpperCase()}
                              </Chip>
                          </div>
                </CardHeader>
                <CardBody className="pt-0 space-y-2 sm:space-y-3">
                  {/* Test Results */}
                  {testResults[client.id!] && (
                    <div className={`flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg border ${
                      testResults[client.id!].success
                        ? "bg-success/10 border-success/30"
                        : "bg-danger/10 border-danger/30"
                    }`}>
                      {testResults[client.id!].success ? (
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
                            {testResults[client.id!].error || "Test failed"}
                          </p>
                        </>
                      )}
                </div>
            )}

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-secondary/10 gap-2">
                    <div className="flex flex-col gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-foreground/60 min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate">
                        <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">Priority: {client.priority}</span>
                  </div>
                      {client.createdAt && (
                        <div className="flex items-center gap-1 truncate" title={`Added: ${new Date(client.createdAt).toLocaleString()}`}>
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">Added {new Date(client.createdAt).toLocaleDateString()}</span>
                  </div>
                              )}
                            </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                     

                      
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex-shrink-0"
                      >
                        <Switch
                          size="sm"
                          color="secondary"
                          isSelected={client.enabled}
                          onValueChange={async (enabled) => {
                            try {
                              await axios.put(`${API_BASE_URL}/api/DownloadClients/update/${client.id}`, {
                                ...client,
                                enabled,
                              });
                              fetchClients();
                            } catch (error) {
                              console.error("Error updating client:", error);
                            }
                          }}
                        />
                      </div>
                    </div>
                      </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
            )}

            
      </div>

      

        {/* Add Download Client Modal */}
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
                Add Download Client
              </h2>
              <p className="text-sm sm:text-base text-foreground/70 font-normal mt-1">
                Choose a download client to configure
              </p>
              </div>
          </ModalHeader>
          <ModalBody className="py-5 sm:py-6 px-4 sm:px-6">
            <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Download size={20} className="text-primary" />
                    </div>
                  <h3 className="text-lg font-semibold text-foreground">Usenet Clients</h3>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableClients.usenet.map((client) => (
                      <Card
                        key={client.implementation}
                      className="card-interactive group cursor-pointer border-2 border-secondary/10 hover:border-secondary/30 transition-all duration-200"
                        isPressable
                      onPress={() => handleAddClient(client)}
                      >
                      <CardBody className="py-3 sm:py-4 px-4 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-secondary transition-colors mb-2">
                              {client.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed line-clamp-2">
                              {client.description || "No description available"}
                              </p>
                            </div>
                          <div className="w-8 h-8 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>

              <div className="border-t border-secondary/20 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Download size={20} className="text-success" />
                    </div>
                  <h3 className="text-lg font-semibold text-foreground">Torrent Clients</h3>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableClients.torrent.map((client) => (
                      <Card
                        key={client.implementation}
                      className="card-interactive group cursor-pointer border-2 border-secondary/10 hover:border-secondary/30 transition-all duration-200"
                        isPressable
                      onPress={() => handleAddClient(client)}
                      >
                      <CardBody className="py-3 sm:py-4 px-4 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-secondary transition-colors mb-2">
                              {client.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed line-clamp-2">
                              {client.description || "No description available"}
                              </p>
                            </div>
                          <div className="w-8 h-8 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Configure Download Client Modal */}
        <Modal
          isOpen={isConfigModalOpen}
          onClose={() => {
            if (openSelects.size === 0) {
              onConfigModalClose();
              setEditingClient(null);
              setFormData({ enabled: true, priority: 1, settings: {}, categories: [] });
              setTestError(null);
              setTestSuccess(false);
              setShowAdvanced(false);
            }
          }}
        size="2xl"
          scrollBehavior="inside"
          isDismissable={openSelects.size === 0}
          classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20 mx-2 sm:mx-4",
          }}
        >
          <ModalContent>
          <ModalHeader className="border-b border-secondary/20 px-4 sm:px-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {editingClient ? "Edit" : "Configure"} Client
              </h2>
              <p className="text-xs sm:text-sm text-foreground/60 font-normal truncate">
                {formData.name}
              </p>
            </div>
            </ModalHeader>
          <ModalBody className="py-4 sm:py-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
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

                <Input
                  label="Name"
                      placeholder="Enter a name for this client"
                  value={formData.name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormData({ ...formData, name: e.target.value });
                    setTestError(null);
                    setTestSuccess(false);
                  }}
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
                    onValueChange={(val: boolean) =>
                      setFormData({ ...formData, enabled: val })
                    }
                      />
                </div>

                <Input
                  label="Priority"
                  type="number"
                      placeholder="1"
                  value={formData.priority?.toString() || "1"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value) || 1,
                    })
                  }
                      description="Priority when grabbing items (1-50, lower is higher priority)"
              size="sm"
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-xs sm:text-sm",
              }}
            />

                {selectedClient && (
              <div className="space-y-3 sm:space-y-4 pt-2 border-t border-secondary/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-semibold">Connection Settings</h3>
                  {selectedClient.fields.some((f) => f.advanced) && (
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs"
                    >
                      {showAdvanced ? "Hide" : "Show"} Advanced
                    </Button>
                  )}
                </div>
                <div className="space-y-3 sm:space-y-4">
                        {selectedClient.fields
                          .filter((f) => showAdvanced || !f.advanced)
                          .filter((f) => f.name !== 'category') // Hide old default category field
                          .map((field) => renderField(field, selectedClient))}
                      </div>
                    </div>
            )}

            {/* Category Configuration */}
            <div className="space-y-3 sm:space-y-4 pt-2 border-t border-secondary/20">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold">Category Configuration</h3>
                <Chip size="sm" variant="flat" color="secondary" className="text-xs">Optional</Chip>
              </div>
              <p className="text-xs text-foreground/60">
                Configure which category labels to use when sending downloads to this client. Leave blank to skip categorization.
              </p>

              <Input
                label="Movie Category"
                placeholder="movies"
                value={
                  formData.categories?.find((c: any) => c.category === 'movies')?.clientCategory || ''
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  const newCategories = [...(formData.categories || [])];
                  const existingIndex = newCategories.findIndex((c: any) => c.category === 'movies');
                  
                  if (existingIndex >= 0) {
                    if (value) {
                      newCategories[existingIndex].clientCategory = value;
                    } else {
                      newCategories.splice(existingIndex, 1);
                    }
                  } else if (value) {
                    newCategories.push({ category: 'movies', clientCategory: value });
                  }
                  
                  setFormData({ ...formData, categories: newCategories });
                }}
                description="Category label for movies (e.g., 'movies', 'films')"
                size="sm"
                classNames={{
                  inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                  label: "text-xs sm:text-sm",
                }}
              />

              <Input
                label="TV Show Category"
                placeholder="tv shows"
                value={
                  formData.categories?.find((c: any) => c.category === 'tv')?.clientCategory || ''
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  const newCategories = [...(formData.categories || [])];
                  const existingIndex = newCategories.findIndex((c: any) => c.category === 'tv');
                  
                  if (existingIndex >= 0) {
                    if (value) {
                      newCategories[existingIndex].clientCategory = value;
                    } else {
                      newCategories.splice(existingIndex, 1);
                    }
                  } else if (value) {
                    newCategories.push({ category: 'tv', clientCategory: value });
                  }
                  
                  setFormData({ ...formData, categories: newCategories });
                }}
                description="Category label for TV shows (e.g., 'tv shows', 'series')"
                size="sm"
                classNames={{
                  inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                  label: "text-xs sm:text-sm",
                }}
              />

              <Input
                label="Universal Category (Optional)"
                placeholder="all downloads"
                value={
                  formData.categories?.find((c: any) => c.category === 'universal')?.clientCategory || ''
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  const newCategories = [...(formData.categories || [])];
                  const existingIndex = newCategories.findIndex((c: any) => c.category === 'universal');
                  
                  if (existingIndex >= 0) {
                    if (value) {
                      newCategories[existingIndex].clientCategory = value;
                    } else {
                      newCategories.splice(existingIndex, 1);
                    }
                  } else if (value) {
                    newCategories.push({ category: 'universal', clientCategory: value });
                  }
                  
                  setFormData({ ...formData, categories: newCategories });
                }}
                description="If set, this category will be used for ALL downloads (overrides movie & TV categories)"
                size="sm"
                classNames={{
                  inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                  label: "text-xs sm:text-sm",
                }}
              />
            </div>

            {/* Test Button */}
            <Button
              color="secondary"
              variant="flat"
              size="sm"
              startContent={<TestTube size={16} />}
              onPress={handleTestClient}
              isLoading={testing}
              fullWidth
              className="text-xs sm:text-sm"
            >
              Test Connection
            </Button>
            </ModalBody>
          <ModalFooter className="border-t border-secondary/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
              {editingClient && (
              <Button 
                  color="danger"
                  variant="flat"
                  size="sm"
                  startContent={<Trash2 size={16} />}
                  onPress={() => {
                    if (editingClient.id) {
                      handleDelete(editingClient.id);
                      onConfigModalClose();
                      setEditingClient(null);
                      setFormData({ enabled: true, priority: 1, settings: {}, categories: [] });
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
                    setEditingClient(null);
                    setFormData({ enabled: true, priority: 1, settings: {}, categories: [] });
                  }}
                  className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                  Cancel
              </Button>
              <Button
                  color="secondary"
                  className="btn-glow text-xs sm:text-sm flex-1 sm:flex-none"
                  size="sm"
                onPress={handleSaveClient}
              >
                Save Client
              </Button>
              </div>
            </div>
            </ModalFooter>
          </ModalContent>
        </Modal>
    </div>
  );
};

export default DownloadClients;

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
  X,
  Settings,
  Info,
} from "lucide-react";
import axios from "axios";
import "../../../../styles/DownloadClients.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

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
  const [testAllResults, setTestAllResults] = useState<Array<{
    id: number;
    name: string;
    implementation: string;
    success: boolean;
    error: string | null;
    message: string | null;
  }> | null>(null);
  
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
      console.log("Available clients response:", response.data);
      setAvailableClients({
        usenet: response.data.usenet || [],
        torrent: response.data.torrent || [],
      });
      console.log("Set available clients - torrent:", response.data.torrent?.length || 0);
    } catch (error) {
      console.error("Error fetching available download clients:", error);
    }
  };

  const handleAddClient = (client: AvailableDownloadClient) => {
    console.log("handleAddClient called with:", client);
    setSelectedClient(client);
    
    // Initialize form data with defaults
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
    console.log("Closing add modal and opening config modal");
    onAddModalClose();
    onConfigModalOpen();
  };

  const handleEditClient = async (client: DownloadClient) => {
    setEditingClient(client);
    setFormData(client);
    setTestError(null);
    setTestSuccess(false);
    
    // Fetch available clients to get the definition for editing
    await fetchAvailableClients();
    
    // Find the client definition
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
    // Test before saving
    if (!testSuccess) {
      await handleTestClient();
      if (!testSuccess) {
        return; // Don't save if test fails
      }
    }

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
      alert("Failed to save download client");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this download client?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/DownloadClients/delete/${id}`);
      await fetchClients();
    } catch (error) {
      console.error("Error deleting download client:", error);
      alert("Failed to delete download client");
    }
  };

  const handleTestAllClients = async () => {
    if (clients.length === 0) {
      alert("No download clients configured");
      return;
    }

    try {
      setTestingAll(true);
      setTestAllResults(null);

      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/test-all`);

      if (response.data.success) {
        setTestAllResults(response.data.results || []);
      } else {
        alert(`Failed to test clients: ${response.data.error || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Error testing all clients:", error);
      alert(`Failed to test clients: ${error.response?.data?.error || error.message || "Unknown error"}`);
    } finally {
      setTestingAll(false);
    }
  };

  const renderField = (field: any, definition: AvailableDownloadClient) => {
    const value = formData.settings?.[field.name] ?? field.defaultValue ?? "";

    switch (field.type) {
      case "textbox":
      case "number":
        return (
          <Input
            key={field.name}
            label={field.label}
            type={field.type === "number" ? "number" : "text"}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFormData({
                ...formData,
                settings: {
                  ...formData.settings,
                  [field.name]: field.type === "number" ? parseInt(e.target.value) || 0 : e.target.value,
                },
              });
              setTestError(null);
              setTestSuccess(false);
            }}
          />
        );

      case "password":
        return (
          <Input
            key={field.name}
            label={field.label}
            type="password"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFormData({
                ...formData,
                settings: {
                  ...formData.settings,
                  [field.name]: e.target.value,
                },
              });
              setTestError(null);
              setTestSuccess(false);
            }}
          />
        );

      case "checkbox":
        return (
          <div key={field.name} className="flex items-center gap-2">
            <Switch
              isSelected={value}
              onValueChange={(val: boolean) => {
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    [field.name]: val,
                  },
                });
                setTestError(null);
                setTestSuccess(false);
              }}
            >
              {field.label}
            </Switch>
          </div>
        );

      case "select":
        return (
          <Select
            key={field.name}
            label={field.label}
            selectedKeys={value ? [String(value)] : []}
            onSelectionChange={(keys: any) => {
              const selected = Array.from(keys)[0];
              setFormData({
                ...formData,
                settings: {
                  ...formData.settings,
                  [field.name]: selected,
                },
              });
              setTestError(null);
              setTestSuccess(false);
            }}
            onOpenChange={(open) => {
              setOpenSelects((prev) => {
                const next = new Set(prev);
                if (open) {
                  next.add(field.name);
                } else {
                  next.delete(field.name);
                }
                return next;
              });
            }}
          >
            {field.options?.map((option: any) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </Select>
        );

      default:
        return null;
    }
  };

  const stats = {
    total: clients.length,
    enabled: clients.filter((c) => c.enabled).length,
    torrent: clients.filter((c) => c.protocol === "torrent").length,
    usenet: clients.filter((c) => c.protocol === "usenet").length,
  };

  return (
    <div className="DownloadClients page min-h-screen bg-background p-6">
      <div className="container max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Download Clients</h1>
          <div className="flex gap-2">
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={onAddModalOpen}
            >
              Add Download Client
            </Button>
            <Button
              variant="flat"
              startContent={<TestTube size={16} />}
              onPress={handleTestAllClients}
              isLoading={testingAll}
              isDisabled={clients.length === 0 || testingAll}
            >
              Test All Clients
            </Button>
          </div>
        </div>

        <div className="bg-primary/10 p-4 rounded-lg mb-6">
          <p className="text-sm">
            If you intend to do searches directly within BorrowArr, you need to add Download Clients.
            Otherwise, you do not need to add them here. For searches from your Apps, the download
            clients configured there are used instead.
          </p>
          <p className="text-sm mt-2">
            Download clients are for BorrowArr in-app searches only and do not sync to apps. There
            are no plans to add any such functionality.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <Card>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.length === 0 ? (
                    <div className="col-span-full text-center p-8 text-default-500">
                      No download clients configured. Click "Add Download Client" to get started.
                    </div>
                  ) : (
                    clients.map((client) => (
                      <Card key={client.id} className="hover:bg-content2 transition-colors">
                        <CardBody>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{client.name}</h3>
                              <Chip
                                size="sm"
                                color={client.protocol === "torrent" ? "success" : "primary"}
                                variant="flat"
                                className="mt-1"
                              >
                                {client.protocol}
                              </Chip>
                            </div>
                            <Chip
                              size="sm"
                              color={client.enabled ? "success" : "default"}
                              variant="flat"
                            >
                              {client.enabled ? "Enabled" : "Disabled"}
                            </Chip>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              onPress={() => handleEditClient(client)}
                            >
                              <Settings size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              isIconOnly
                              onPress={() => client.id && handleDelete(client.id)}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))
                  )}
                  {clients.length > 0 && (
                    <Card
                      className="hover:bg-content2 transition-colors cursor-pointer border-2 border-dashed"
                      onPress={onAddModalOpen}
                    >
                      <CardBody className="flex items-center justify-center min-h-[120px]">
                        <Plus size={48} className="text-default-400" />
                      </CardBody>
                    </Card>
                  )}
                </div>
              </CardBody>
            </Card>

            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold">Clients:</span> {stats.total}
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

            {/* Test All Results */}
            {testAllResults && (
              <Card className="mt-6">
                <CardBody>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Test Results</h3>
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => setTestAllResults(null)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {testAllResults.map((result) => (
                      <div
                        key={result.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          result.success
                            ? "bg-success/10 border border-success/20"
                            : "bg-danger/10 border border-danger/20"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.name}</span>
                            <Chip
                              size="sm"
                              color={result.success ? "success" : "danger"}
                              variant="flat"
                            >
                              {result.success ? "Success" : "Failed"}
                            </Chip>
                          </div>
                          {result.message && (
                            <p className="text-xs text-default-500 mt-1">{result.message}</p>
                          )}
                          {result.error && (
                            <p className="text-xs text-danger mt-1">{result.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="font-semibold">Total:</span> {testAllResults.length}
                      </div>
                      <div>
                        <span className="font-semibold text-success">Successful:</span>{" "}
                        {testAllResults.filter((r) => r.success).length}
                      </div>
                      <div>
                        <span className="font-semibold text-danger">Failed:</span>{" "}
                        {testAllResults.filter((r) => !r.success).length}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* Add Download Client Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={onAddModalClose}
          size="5xl"
          scrollBehavior="inside"
          shouldBlockScroll={true}
        >
          <ModalContent>
            <ModalHeader>Add Download Client</ModalHeader>
            <ModalBody>
              <div className="bg-primary/10 p-4 rounded-lg mb-4">
                <p className="text-sm">
                  Adding a download client allows BorrowArr to send releases direct from the UI
                  while doing a manual search. BorrowArr supports any of the download clients
                  listed below. For more information on the individual download clients, click on
                  the info buttons.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Usenet</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableClients.usenet.map((client) => (
                      <Card
                        key={client.implementation}
                        className="hover:bg-content2 transition-colors cursor-pointer"
                        isPressable
                        onPress={() => {
                          console.log("Usenet card clicked:", client.name);
                          handleAddClient(client);
                        }}
                      >
                        <CardBody>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{client.name}</h4>
                              <p className="text-xs text-default-500 mt-1">
                                {client.description}
                              </p>
                            </div>
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-default-100 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("Info icon clicked:", client.name);
                                handleAddClient(client);
                              }}
                            >
                              <Info size={16} />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Torrents</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableClients.torrent.map((client) => (
                      <Card
                        key={client.implementation}
                        className="hover:bg-content2 transition-colors cursor-pointer"
                        isPressable
                        onPress={() => {
                          console.log("Torrent card clicked:", client.name);
                          handleAddClient(client);
                        }}
                      >
                        <CardBody>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{client.name}</h4>
                              <p className="text-xs text-default-500 mt-1">
                                {client.description}
                              </p>
                            </div>
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-default-100 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("Info icon clicked:", client.name);
                                handleAddClient(client);
                              }}
                            >
                              <Info size={16} />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
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
            }
          }}
          size="2xl"
          scrollBehavior="inside"
          shouldBlockScroll={true}
          isDismissable={openSelects.size === 0}
        >
          <ModalContent>
            <ModalHeader>
              {editingClient
                ? `Edit Download Client - ${editingClient.name}`
                : `Add Download Client - ${selectedClient?.name || "New"}`}
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
                    onValueChange={(val: boolean) =>
                      setFormData({ ...formData, enabled: val })
                    }
                  >
                    Enable
                  </Switch>
                </div>

                <Input
                  label="Priority"
                  type="number"
                  value={formData.priority?.toString() || "1"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value) || 1,
                    })
                  }
                  description="Priority to use when grabbing items (1-50)"
                />

                {selectedClient && (
                  <>
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Settings</h4>
                      <div className="space-y-4">
                        {selectedClient.fields
                          .filter((f) => !f.advanced)
                          .map((field) => renderField(field, selectedClient))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Mapped Categories</h4>
                      <p className="text-sm text-default-500">
                        Category mappings will be added in a future update.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onConfigModalClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleTestClient}
                startContent={<TestTube size={16} />}
                isLoading={testing}
              >
                Test
              </Button>
              <Button
                color="primary"
                onPress={handleSaveClient}
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

export default DownloadClients;

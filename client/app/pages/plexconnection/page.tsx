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
import { Spinner } from "@nextui-org/spinner";
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Film,
  Tv,
  Music,
  Image,
  Info,
  Key,
  Link as LinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import "../../../styles/PlexConnection.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface PlexConnection {
  connected: boolean;
  id?: number;
  serverUrl?: string;
  serverName?: string;
  serverVersion?: string;
  isConnected?: boolean;
  lastChecked?: string;
  hasToken?: boolean;
}

interface PlexLibrary {
  key: string;
  title: string;
  type: string;
  count: number;
}

const PlexConnection = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [connection, setConnection] = useState<PlexConnection>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    serverName?: string;
    serverVersion?: string;
  } | null>(null);
  const [libraries, setLibraries] = useState<PlexLibrary[]>([]);
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const {
    isOpen: isSetupModalOpen,
    onOpen: onSetupModalOpen,
    onClose: onSetupModalClose,
  } = useDisclosure();

  useEffect(() => {
    if (user) {
      fetchConnection();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (connection.connected && user) {
      fetchLibraries();
    }
  }, [connection.connected, user]);

  const fetchConnection = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/PlexConnection`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setConnection(response.data);
    } catch (error) {
      console.error("Error fetching Plex connection:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraries = async () => {
    if (!user) return;

    try {
      setLoadingLibraries(true);
      const response = await axios.get(`${API_BASE_URL}/api/PlexConnection/libraries`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.data.success) {
        setLibraries(response.data.libraries || []);
      }
    } catch (error) {
      console.error("Error fetching libraries:", error);
    } finally {
      setLoadingLibraries(false);
    }
  };

  const handleTest = async () => {
    if (!serverUrl || !authToken) {
      setTestResult({ success: false, error: "Please fill in all fields" });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const response = await axios.post(
        `${API_BASE_URL}/api/PlexConnection/test`,
        { serverUrl, authToken },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setTestResult(response.data);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.error || error.message || "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!serverUrl || !authToken) {
      setTestResult({ success: false, error: "Please fill in all fields" });
      return;
    }

    try {
      setSaving(true);

      const response = await axios.post(
        `${API_BASE_URL}/api/PlexConnection/save`,
        { serverUrl, authToken },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        await fetchConnection();
        onSetupModalClose();
        setServerUrl("");
        setAuthToken("");
        setTestResult(null);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.error || error.message || "Failed to save connection",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to disconnect from Plex?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/PlexConnection`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      await fetchConnection();
      setLibraries([]);
    } catch (error) {
      console.error("Error deleting connection:", error);
    }
  };

  const handleRetest = async () => {
    try {
      setTesting(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/PlexConnection/retest`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      await fetchConnection();
      setTestResult(response.data);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.error || "Retest failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const getLibraryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "movie":
        return <Film className="w-5 h-5" />;
      case "show":
        return <Tv className="w-5 h-5" />;
      case "artist":
        return <Music className="w-5 h-5" />;
      case "photo":
        return <Image className="w-5 h-5" />;
      default:
        return <Server className="w-5 h-5" />;
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
                Plex Connection
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                Connect to your Plex Media Server and access your library
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {connection.connected ? (
                <>
                  <Button
                    color="secondary"
                    variant="flat"
                    size="sm"
                    startContent={<RefreshCw size={16} />}
                    onPress={handleRetest}
                    isLoading={testing}
                  >
                    Test Connection
                  </Button>
                  <Button
                    color="secondary"
                    className="btn-glow"
                    size="sm"
                    startContent={<Server size={16} />}
                    onPress={onSetupModalOpen}
                  >
                    Update Connection
                  </Button>
                </>
              ) : (
                <Button
                  color="secondary"
                  className="btn-glow"
                  size="sm"
                  startContent={<Server size={16} />}
                  onPress={onSetupModalOpen}
                >
                  Connect to Plex
                </Button>
              )}
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
        ) : !connection.connected ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Not Connected Card */}
            <Card className="card-interactive">
              <CardBody className="text-center py-12 sm:py-16 px-4">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Server className="w-8 h-8 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Not Connected to Plex
                    </h3>
                    <p className="text-sm text-foreground/60 mb-4">
                      Connect your Plex Media Server to view and manage your library
                    </p>
                    <Button
                      color="secondary"
                      className="btn-glow"
                      size="sm"
                      startContent={<Server size={16} />}
                      onPress={onSetupModalOpen}
                    >
                      Connect to Plex
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Instructions Card */}
            <Card className="card-interactive">
              <CardHeader className="border-b border-secondary/20">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-secondary" />
                  <h3 className="text-lg font-semibold">How to Connect</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-6 p-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Get Your Plex Server URL
                    </h4>
                    <p className="text-sm text-foreground/70 mb-2">
                      Your Plex server URL is typically in one of these formats:
                    </p>
                    <ul className="text-sm text-foreground/70 space-y-1 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-0.5">•</span>
                        <span><code className="px-2 py-0.5 bg-secondary/10 rounded text-xs">http://192.168.1.100:32400</code> (Local network)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-0.5">•</span>
                        <span><code className="px-2 py-0.5 bg-secondary/10 rounded text-xs">http://localhost:32400</code> (Same machine)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-0.5">•</span>
                        <span><code className="px-2 py-0.5 bg-secondary/10 rounded text-xs">https://your-plex-domain.com</code> (Remote/Custom domain)</span>
                      </li>
                    </ul>
                    <p className="text-sm text-foreground/70 mt-3">
                      💡 <strong>Tip:</strong> Find your server IP in Plex Web App → Settings → Network
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Get Your X-Plex-Token
                    </h4>
                    <p className="text-sm text-foreground/70 mb-3">
                      Follow these steps to get your authentication token:
                    </p>
                    <ol className="text-sm text-foreground/70 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-secondary font-semibold min-w-[20px]">1.</span>
                        <span>Sign in to <a href="https://app.plex.tv" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Plex Web App</a></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary font-semibold min-w-[20px]">2.</span>
                        <span>Open any item (movie, show, etc.) in your library</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary font-semibold min-w-[20px]">3.</span>
                        <span>Click "Get Info" or press <kbd className="px-1.5 py-0.5 bg-secondary/10 rounded text-xs">i</kbd></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary font-semibold min-w-[20px]">4.</span>
                        <span>Click "View XML" at the bottom</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary font-semibold min-w-[20px]">5.</span>
                        <span>Look for <code className="px-1.5 py-0.5 bg-secondary/10 rounded text-xs">X-Plex-Token=</code> in the URL</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary font-semibold min-w-[20px]">6.</span>
                        <span>Copy everything after the <code className="px-1.5 py-0.5 bg-secondary/10 rounded text-xs">=</code> sign</span>
                      </li>
                    </ol>
                    <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                      <p className="text-xs text-warning-600 dark:text-warning-400">
                        ⚠️ <strong>Important:</strong> Keep your token private! It provides full access to your Plex account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Connect Your Server</h4>
                    <p className="text-sm text-foreground/70 mb-3">
                      Click "Connect to Plex" above and enter your Server URL and Token. Test the connection before saving!
                    </p>
                  </div>
                </div>

                {/* Alternative Method */}
                <div className="border-t border-secondary/20 pt-6">
                  <h4 className="font-semibold mb-3 text-sm">Alternative: Find Token in Plex Settings</h4>
                  <ol className="text-sm text-foreground/70 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-secondary font-semibold min-w-[20px]">1.</span>
                      <span>Go to <a href="https://app.plex.tv/desktop" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Plex Settings</a></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-secondary font-semibold min-w-[20px]">2.</span>
                      <span>Click your profile icon → Account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-secondary font-semibold min-w-[20px]">3.</span>
                      <span>Open browser developer tools (F12)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-secondary font-semibold min-w-[20px]">4.</span>
                      <span>Go to Console tab and type: <code className="px-2 py-0.5 bg-secondary/10 rounded text-xs">localStorage.getItem('myPlexAccessToken')</code></span>
                    </li>
                  </ol>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Server Card */}
            <Card className="card-interactive">
              <CardHeader className="border-b border-secondary/20">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Connected to Plex</h3>
                      <p className="text-sm text-foreground/60">
                        {connection.serverName || "Plex Media Server"}
                      </p>
                    </div>
                  </div>
                  <Button
                    color="danger"
                    variant="flat"
                    size="sm"
                    startContent={<Trash2 size={16} />}
                    onPress={handleDelete}
                  >
                    Disconnect
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Server URL</p>
                    <p className="text-sm font-medium truncate">{connection.serverUrl}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Version</p>
                    <p className="text-sm font-medium">{connection.serverVersion || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Status</p>
                    <Chip
                      size="sm"
                      color={connection.isConnected ? "success" : "danger"}
                      variant="flat"
                      startContent={
                        connection.isConnected ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )
                      }
                    >
                      {connection.isConnected ? "Connected" : "Disconnected"}
                    </Chip>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Last Checked</p>
                    <p className="text-sm font-medium">
                      {connection.lastChecked
                        ? new Date(connection.lastChecked).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                {testResult && (
                  <div className="mt-4">
                    {testResult.success ? (
                      <div className="p-3 bg-success/10 border border-success rounded-lg flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-success font-medium">Connection successful!</p>
                          {testResult.serverName && (
                            <p className="text-xs text-success/80 mt-1">
                              Server: {testResult.serverName} (v{testResult.serverVersion})
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-danger/10 border border-danger rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-danger">{testResult.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Libraries */}
            <Card className="card-interactive">
              <CardHeader className="border-b border-secondary/20">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-secondary" />
                    <h3 className="text-lg font-semibold">Plex Libraries</h3>
                  </div>
                  <Button
                    color="secondary"
                    variant="flat"
                    size="sm"
                    startContent={<RefreshCw size={16} />}
                    onPress={fetchLibraries}
                    isLoading={loadingLibraries}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="p-6">
                {loadingLibraries ? (
                  <div className="flex justify-center py-8">
                    <Spinner color="secondary" />
                  </div>
                ) : libraries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-foreground/60">No libraries found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {libraries.map((library) => (
                      <Card key={library.key} className="card-interactive border border-secondary/20">
                        <CardBody className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                              {getLibraryIcon(library.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate mb-1">
                                {library.title}
                              </h4>
                              <p className="text-xs text-foreground/60">
                                {library.type.charAt(0).toUpperCase() + library.type.slice(1)}
                              </p>
                              <Chip size="sm" variant="flat" color="secondary" className="mt-2">
                                {library.count} items
                              </Chip>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={onSetupModalClose}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20 mx-2 sm:mx-4",
        }}
      >
        <ModalContent>
          <ModalHeader className="border-b border-secondary/20 px-4 sm:px-6">
            <div className="w-full">
              <h2 className="text-xl font-bold">
                {connection.connected ? "Update" : "Connect"} Plex Server
              </h2>
              <p className="text-sm text-foreground/60 font-normal mt-1">
                Enter your Plex server details
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="py-6 px-4 sm:px-6 space-y-4">
            {/* Test Result */}
            {testResult && (
              <div>
                {testResult.success ? (
                  <div className="p-3 bg-success/10 border border-success rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-success font-medium">Connection successful!</p>
                      {testResult.serverName && (
                        <p className="text-xs text-success/80 mt-1">
                          Server: {testResult.serverName} (v{testResult.serverVersion})
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-danger/10 border border-danger rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-danger">{testResult.error}</p>
                  </div>
                )}
              </div>
            )}

            <Input
              label="Plex Server URL"
              placeholder="http://192.168.1.100:32400"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setTestResult(null);
              }}
              description="The URL where your Plex server is accessible (e.g., http://192.168.1.100:32400)"
              size="sm"
              startContent={<LinkIcon className="w-4 h-4 text-foreground/50" />}
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-sm",
                description: "text-xs",
              }}
            />

            <Input
              label="X-Plex-Token"
              placeholder="Your Plex authentication token"
              type="password"
              value={authToken}
              onChange={(e) => {
                setAuthToken(e.target.value);
                setTestResult(null);
              }}
              description="Your Plex authentication token (see instructions above)"
              size="sm"
              startContent={<Key className="w-4 h-4 text-foreground/50" />}
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                label: "text-sm",
                description: "text-xs",
              }}
            />

            {/* Quick Help */}
            <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
              <p className="text-xs text-foreground/70">
                💡 <strong>Need help?</strong> Close this modal to see detailed instructions on how to find your server URL and token.
              </p>
            </div>

            {/* Test Button */}
            <Button
              color="secondary"
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              onPress={handleTest}
              isLoading={testing}
              fullWidth
            >
              Test Connection
            </Button>
          </ModalBody>
          <ModalFooter className="border-t border-secondary/20 px-4 sm:px-6 py-4">
            <div className="flex gap-2 w-full">
              <Button
                variant="flat"
                size="sm"
                onPress={onSetupModalClose}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                color="secondary"
                className="btn-glow flex-1 sm:flex-none"
                size="sm"
                onPress={handleSave}
                isLoading={saving}
                isDisabled={!testResult?.success}
              >
                Save Connection
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PlexConnection;

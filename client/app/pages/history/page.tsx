"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";
import { Spinner } from "@nextui-org/spinner";
import { Chip } from "@nextui-org/chip";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/modal";
import {
  Search,
  Clock,
  Film,
  Tv,
  Download,
  CheckCircle2,
  XCircle,
  Loader,
  Trash2,
  BarChart3,
  Calendar,
  HardDrive,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface HistoryEntry {
  id: number;
  userId: string;
  mediaType: "movie" | "tv" | "unknown";
  mediaTitle: string | null;
  tmdbId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  releaseName: string;
  protocol: "torrent" | "nzb";
  indexer: string | null;
  indexerId: number | null;
  downloadUrl: string | null;
  size: number | null;
  sizeFormatted: string | null;
  seeders: number | null;
  leechers: number | null;
  quality: string | null;
  status: "grabbed" | "downloading" | "completed" | "failed";
  source: string | null;
  downloadClient: string | null;
  downloadClientId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HistoryStats {
  total: number;
  movies: number;
  series: number;
  grabbed: number;
  completed: number;
  failed: number;
  recentActivity: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: loadingAuth } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning",
  });

  const showNotification = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setNotificationModal({ isOpen: true, title, message, type });
  };

  const closeNotification = () => {
    setNotificationModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/History`, {
        params: {
          page,
          limit: 50,
          mediaType: mediaTypeFilter,
          status: statusFilter,
          search: searchQuery,
          sortBy,
          sortOrder,
        },
      });

      if (response.data.success) {
        setHistory(response.data.history);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error: any) {
      console.error("Error fetching history:", error);
      if (error.response?.status === 401) {
        router.push("/pages/login");
      } else {
        showNotification(
          "Error",
          error.response?.data?.error || "Failed to fetch history",
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user, page, mediaTypeFilter, statusFilter, searchQuery, sortBy, sortOrder, router]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      setStatsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/History/stats`);

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  // Check authentication and fetch data
  useEffect(() => {
    if (!loadingAuth) {
      if (!user) {
        router.push("/pages/login");
        return;
      }
      fetchHistory();
      fetchStats();
    }
  }, [user, loadingAuth, router, fetchHistory, fetchStats]);

  // Clear all history
  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to clear all history? This cannot be undone.")) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/History/clear`);

      if (response.data.success) {
        showNotification("Success", response.data.message, "success");
        fetchHistory();
        fetchStats();
      }
    } catch (error: any) {
      console.error("Error clearing history:", error);
      showNotification(
        "Error",
        error.response?.data?.error || "Failed to clear history",
        "error"
      );
    }
  };

  // Delete single entry
  const handleDeleteEntry = async (id: number) => {
    if (!user) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/History/${id}`);

      if (response.data.success) {
        showNotification("Success", "History entry deleted", "success");
        fetchHistory();
        fetchStats();
      }
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      showNotification(
        "Error",
        error.response?.data?.error || "Failed to delete entry",
        "error"
      );
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "grabbed":
        return { icon: <Download size={16} />, color: "primary", label: "Grabbed" };
      case "downloading":
        return { icon: <Loader size={16} />, color: "warning", label: "Downloading" };
      case "completed":
        return { icon: <CheckCircle2 size={16} />, color: "success", label: "Completed" };
      case "failed":
        return { icon: <XCircle size={16} />, color: "danger", label: "Failed" };
      default:
        return { icon: <Clock size={16} />, color: "default", label: status };
    }
  };

  // Get media type icon
  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case "movie":
        return <Film size={16} />;
      case "tv":
        return <Tv size={16} />;
      default:
        return <Download size={16} />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Show loading spinner while checking authentication
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl">
              <Clock size={32} className="text-secondary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                Download History
              </h1>
              <p className="text-default-500 mt-1">Track all your download requests</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-content1 border border-secondary/20 rounded-lg p-4 hover:border-secondary/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-default-500">Total Downloads</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-content1 border border-secondary/20 rounded-lg p-4 hover:border-secondary/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle2 size={20} className="text-success" />
                </div>
                <div>
                  <p className="text-sm text-default-500">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-content1 border border-secondary/20 rounded-lg p-4 hover:border-secondary/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Download size={20} className="text-warning" />
                </div>
                <div>
                  <p className="text-sm text-default-500">Grabbed</p>
                  <p className="text-2xl font-bold">{stats.grabbed}</p>
                </div>
              </div>
            </div>
            <div className="bg-content1 border border-secondary/20 rounded-lg p-4 hover:border-secondary/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <TrendingUp size={20} className="text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-default-500">Last 7 Days</p>
                  <p className="text-2xl font-bold">{stats.recentActivity}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-content1 border border-secondary/20 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                startContent={<Search size={18} className="text-default-400" />}
                classNames={{
                  input: "text-small",
                  inputWrapper:
                    "border border-secondary/20 hover:border-secondary/40 transition-colors",
                }}
              />
            </div>
            <Select
              label="Media Type"
              selectedKeys={new Set([mediaTypeFilter])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setMediaTypeFilter(selected);
                setPage(1);
              }}
              classNames={{
                trigger: "border border-secondary/20 hover:border-secondary/40 transition-colors",
              }}
            >
              <SelectItem key="all">All Types</SelectItem>
              <SelectItem key="movie">Movies</SelectItem>
              <SelectItem key="tv">TV Shows</SelectItem>
              <SelectItem key="unknown">Unknown</SelectItem>
            </Select>
            <Select
              label="Status"
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setStatusFilter(selected);
                setPage(1);
              }}
              classNames={{
                trigger: "border border-secondary/20 hover:border-secondary/40 transition-colors",
              }}
            >
              <SelectItem key="all">All Status</SelectItem>
              <SelectItem key="grabbed">Grabbed</SelectItem>
              <SelectItem key="downloading">Downloading</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="failed">Failed</SelectItem>
            </Select>
            <Button
              color="danger"
              variant="flat"
              startContent={<Trash2 size={18} />}
              onPress={handleClearHistory}
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 bg-secondary/10 rounded-full mb-4">
              <Clock size={48} className="text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
            <p className="text-default-500 max-w-md">
              Your download history will appear here once you start downloading media.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => {
              const statusInfo = getStatusInfo(entry.status);
              return (
                <div
                  key={entry.id}
                  className="bg-content1 border border-secondary/20 rounded-lg p-4 hover:border-secondary/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Media Type Icon */}
                    <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-lg flex-shrink-0">
                      {getMediaTypeIcon(entry.mediaType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          {entry.mediaTitle && (
                            <h3 className="font-semibold text-lg mb-1 truncate">
                              {entry.mediaTitle}
                              {entry.seasonNumber && entry.episodeNumber && (
                                <span className="text-default-500 text-sm ml-2">
                                  S{entry.seasonNumber.toString().padStart(2, "0")}E
                                  {entry.episodeNumber.toString().padStart(2, "0")}
                                </span>
                              )}
                            </h3>
                          )}
                          <p className="text-sm text-default-600 break-words">{entry.releaseName}</p>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDeleteEntry(entry.id)}
                          className="flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={statusInfo.color as any}
                          startContent={statusInfo.icon}
                        >
                          {statusInfo.label}
                        </Chip>
                        <Chip size="sm" variant="flat" color="default">
                          {entry.protocol.toUpperCase()}
                        </Chip>
                        {entry.indexer && (
                          <Chip size="sm" variant="flat" color="default">
                            {entry.indexer}
                          </Chip>
                        )}
                        {entry.sizeFormatted && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="default"
                            startContent={<HardDrive size={12} />}
                          >
                            {entry.sizeFormatted}
                          </Chip>
                        )}
                        {entry.quality && (
                          <Chip size="sm" variant="flat" color="secondary">
                            {entry.quality}
                          </Chip>
                        )}
                        {entry.source && (
                          <Chip size="sm" variant="flat" color="primary">
                            {entry.source}
                          </Chip>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center gap-4 text-xs text-default-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(entry.createdAt)}
                        </div>
                        {entry.downloadClient && (
                          <div className="flex items-center gap-1">
                            <Download size={12} />
                            {entry.downloadClient}
                          </div>
                        )}
                        {entry.seeders !== null && entry.protocol === "torrent" && (
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} />
                            {entry.seeders} seeders
                          </div>
                        )}
                      </div>
                </div>
            </div>
        </div>
    );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              size="sm"
              variant="flat"
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-default-500">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="flat"
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Notification Modal */}
      <Modal isOpen={notificationModal.isOpen} onClose={closeNotification} size="sm">
        <ModalContent>
          <ModalHeader
            className={
              notificationModal.type === "success"
                ? "text-success"
                : notificationModal.type === "error"
                  ? "text-danger"
                  : notificationModal.type === "warning"
                    ? "text-warning"
                    : "text-primary"
            }
          >
            {notificationModal.title}
          </ModalHeader>
          <ModalBody>
            <p>{notificationModal.message}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={closeNotification}>
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      <ScrollToTop />
    </div>
  );
}

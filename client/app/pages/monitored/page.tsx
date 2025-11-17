"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/modal";
import {
  Film,
  Calendar,
  Star,
  Trash2,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  X,
  Filter,
  Check,
  Tv,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import "../../../styles/Monitored.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface MonitoredMovie {
  id: number;
  userId: string;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  overview: string | null;
  qualityProfile: string;
  minAvailability: string;
  monitor: string;
  status: "monitoring" | "downloading" | "downloaded" | "error" | "missing";
  downloadedTorrentId: string | null;
  downloadedTorrentTitle: string | null;
  fileExists: boolean;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  lastChecked: string | null;
  createdAt: string;
  updatedAt: string;
  type?: "movie";
}

interface MonitoredSeries {
  id: number;
  userId: string;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  firstAirDate: string | null;
  overview: string | null;
  qualityProfile: string;
  minAvailability: string;
  monitor: string;
  status: "monitoring" | "downloading" | "downloaded" | "error";
  selectedSeasons: string | null;
  selectedEpisodes: string | null;
  createdAt: string;
  updatedAt: string;
  type?: "series";
}

type MonitoredItem = MonitoredMovie | MonitoredSeries;

interface TorrentResult {
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
  seeders: number | null;
  leechers: number | null;
  downloadUrl: string;
}

const Monitored = () => {
  const { user, loading: loadingAuth } = useAuth();
  const router = useRouter();

  const [movies, setMovies] = useState<MonitoredMovie[]>([]);
  const [series, setSeries] = useState<MonitoredSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [deletingSeries, setDeletingSeries] = useState<Set<number>>(new Set());
  const [requesting, setRequesting] = useState<Set<number>>(new Set());
  const [requestingSeries, setRequestingSeries] = useState<Set<number>>(new Set());
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");

  // Download modal state
  const { isOpen: isDownloadModalOpen, onOpen: onDownloadModalOpen, onClose: onDownloadModalClose } = useDisclosure();
  const [selectedMovieForDownload, setSelectedMovieForDownload] = useState<MonitoredMovie | null>(null);
  const [torrents, setTorrents] = useState<TorrentResult[]>([]);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<string>>(new Set());
  const [downloadError, setDownloadError] = useState<Map<string, string>>(new Map());
  const [openSelects, setOpenSelects] = useState<Set<string>>(new Set());
  
  // Movie settings state for editing
  const [editMonitor, setEditMonitor] = useState("movieOnly");
  const [editMinAvailability, setEditMinAvailability] = useState("released");
  const [editQualityProfile, setEditQualityProfile] = useState("any");
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    if (!loadingAuth) {
      if (!user) {
        router.push("/pages/login");
        return;
      }
      fetchMonitoredContent();
    }
  }, [user, loadingAuth, router]);

  const fetchMonitoredContent = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [moviesResponse, seriesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/MonitoredMovies`, {
        params: { userId: user.id },
        }),
        axios.get(`${API_BASE_URL}/api/MonitoredSeries`, {
          params: { userId: user.id },
        }),
      ]);
      setMovies((moviesResponse.data.movies || []).map((m: MonitoredMovie) => ({ ...m, type: "movie" })));
      setSeries((seriesResponse.data.series || []).map((s: MonitoredSeries) => ({ ...s, type: "series" })));
    } catch (error) {
      console.error("Error fetching monitored content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMovie = async (movieId: number) => {
    if (!user) return;

    if (!confirm("Are you sure you want to remove this movie from monitoring?")) {
      return;
    }

    setDeleting((prev) => new Set(prev).add(movieId));

    try {
      await axios.delete(`${API_BASE_URL}/api/MonitoredMovies/${movieId}`, {
        params: { userId: user.id },
      });
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
    } catch (error) {
      console.error("Error removing movie:", error);
      alert("Failed to remove movie from monitoring");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(movieId);
        return next;
      });
    }
  };

  const handleRemoveSeries = async (seriesId: number) => {
    if (!user) return;

    if (!confirm("Are you sure you want to remove this series from monitoring?")) {
      return;
    }

    setDeletingSeries((prev) => new Set(prev).add(seriesId));

    try {
      await axios.delete(`${API_BASE_URL}/api/MonitoredSeries/${seriesId}`, {
        params: { userId: user.id },
      });
      setSeries((prev) => prev.filter((s) => s.id !== seriesId));
    } catch (error) {
      console.error("Error removing series:", error);
      alert("Failed to remove series from monitoring");
    } finally {
      setDeletingSeries((prev) => {
        const next = new Set(prev);
        next.delete(seriesId);
        return next;
      });
    }
  };

  const handleRequestMovie = async (movie: MonitoredMovie) => {
    if (!user) return;

    const movieId = movie.id;
    setRequesting((prev) => new Set(prev).add(movieId));

    try {
      const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
      
      // Search for torrents
      const torrentResponse = await axios.get(
        `${API_BASE_URL}/api/TMDB/movie/${movie.tmdbId}/torrents`,
        {
          params: {
            title: movie.title,
            year: year,
            categoryIds: '2000',
          },
          timeout: 30000,
        }
      );

      if (!torrentResponse.data.success || torrentResponse.data.results.length === 0) {
        throw new Error(`No torrents found for ${movie.title}`);
      }

      // Filter torrents by quality profile
      let filteredTorrents = torrentResponse.data.results || [];
      if (movie.qualityProfile !== "any") {
        filteredTorrents = filteredTorrents.filter((torrent: TorrentResult) => {
          const title = torrent.title.toLowerCase();
          switch (movie.qualityProfile) {
            case "hd-720p-1080p":
              return title.includes("720p") || title.includes("1080p");
            case "hd-720p":
              return title.includes("720p");
            case "hd-1080p":
              return title.includes("1080p");
            case "sd":
              return !title.includes("720p") && !title.includes("1080p") && !title.includes("2160p") && !title.includes("4k");
            case "ultra-hd":
              return title.includes("2160p") || title.includes("4k") || title.includes("uhd");
            default:
              return true;
          }
        });
      }

      if (filteredTorrents.length === 0) {
        throw new Error(`No torrents found matching quality profile: ${movie.qualityProfile}`);
      }

      // Get the best torrent (highest priority indexer, then highest seeders)
      const bestTorrent = filteredTorrents.reduce((best: any, current: any) => {
        const bestPriority = best.indexerPriority ?? 25;
        const currentPriority = current.indexerPriority ?? 25;
        if (currentPriority < bestPriority) return current;
        if (currentPriority > bestPriority) return best;
        
        const bestSeeders = best.seeders || 0;
        const currentSeeders = current.seeders || 0;
        return currentSeeders > bestSeeders ? current : best;
      });

      // Download the torrent
      const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
        downloadUrl: bestTorrent.downloadUrl,
        protocol: bestTorrent.protocol,
      });

      if (downloadResponse.data.success) {
        // Update movie status
        await axios.put(`${API_BASE_URL}/api/MonitoredMovies/${movie.id}`, {
          status: "downloading",
          downloadedTorrentId: bestTorrent.id,
          downloadedTorrentTitle: bestTorrent.title,
        });

        // Refresh movies list
        await fetchMonitoredContent();
        alert(`Successfully requested download for ${movie.title}`);
      } else {
        throw new Error(downloadResponse.data.error || "Failed to download");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Request failed";
      alert(`Error: ${errorMsg}`);
    } finally {
      setRequesting((prev) => {
        const next = new Set(prev);
        next.delete(movieId);
        return next;
      });
    }
  };

  const handleRequestSeries = async (series: MonitoredSeries) => {
    if (!user) return;

    const seriesId = series.id;
    setRequestingSeries((prev) => new Set(prev).add(seriesId));

    try {
      const title = series.title;
      const year = series.firstAirDate ? new Date(series.firstAirDate).getFullYear() : '';

      // Get TV show details including all seasons
      const tvDetailsResponse = await axios.get(`${API_BASE_URL}/api/TMDB/tv/${series.tmdbId}`);
      if (!tvDetailsResponse.data.success) {
        throw new Error("Failed to fetch TV show details");
      }

      const tvDetails = tvDetailsResponse.data.tv;
      const numberOfSeasons = tvDetails.number_of_seasons || 0;

      // Fetch all seasons with episodes
      const seasonPromises = [];
      for (let i = 1; i <= numberOfSeasons; i++) {
        seasonPromises.push(
          axios.get(`${API_BASE_URL}/api/TMDB/tv/${series.tmdbId}/season/${i}`)
            .then(res => res.data.success ? res.data.season : null)
            .catch(() => null)
        );
      }

      const seasons = (await Promise.all(seasonPromises)).filter(s => s !== null);

      // Download each episode
      let successCount = 0;
      let failCount = 0;

      for (const season of seasons) {
        if (!season.episodes) continue;

        for (const episode of season.episodes) {
          try {
            // Search for torrents for this episode
            const torrentResponse = await axios.get(
              `${API_BASE_URL}/api/TMDB/tv/${series.tmdbId}/torrents`,
              {
                params: {
                  title: title,
                  season: season.season_number,
                  episode: episode.episode_number,
                  year: year,
                  categoryIds: '5000',
                },
                timeout: 30000,
              }
            );

            if (torrentResponse.data.success && torrentResponse.data.results.length > 0) {
              // Get the best torrent
              const bestTorrent = torrentResponse.data.results.reduce((best: any, current: any) => {
                const bestPriority = best.indexerPriority ?? 25;
                const currentPriority = current.indexerPriority ?? 25;
                if (currentPriority < bestPriority) return current;
                if (currentPriority > bestPriority) return best;
                
                const bestSeeders = best.seeders || 0;
                const currentSeeders = current.seeders || 0;
                return currentSeeders > bestSeeders ? current : best;
              });

              // Download the torrent
              await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
                downloadUrl: bestTorrent.downloadUrl,
                protocol: bestTorrent.protocol,
              });

              successCount++;
            } else {
              failCount++;
            }

            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            failCount++;
            console.error(`Failed to download episode ${season.season_number}x${episode.episode_number}:`, error);
          }
        }
      }

      // Update series status
      if (successCount > 0) {
        await axios.put(`${API_BASE_URL}/api/MonitoredSeries/${series.id}`, {
          status: "downloading",
        });
      }

      // Refresh series list
      await fetchMonitoredContent();
      alert(`Series requested!\n\nSuccessfully queued: ${successCount} episodes\nFailed: ${failCount} episodes`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Request failed";
      alert(`Error: ${errorMsg}`);
    } finally {
      setRequestingSeries((prev) => {
        const next = new Set(prev);
        next.delete(seriesId);
        return next;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "monitoring":
        return <Eye size={16} className="text-primary" />;
      case "downloading":
        return <Download size={16} className="text-warning" />;
      case "downloaded":
        return <CheckCircle2 size={16} className="text-success" />;
      case "error":
        return <AlertCircle size={16} className="text-danger" />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "monitoring":
        return "primary";
      case "downloading":
        return "warning";
      case "downloaded":
        return "success";
      case "error":
        return "danger";
      default:
        return "default";
    }
  };

  const formatQuality = (quality: string) => {
    const qualityMap: { [key: string]: string } = {
      any: "Any",
      "hd-720p-1080p": "HD - 720p/1080p",
      "hd-720p": "HD-720p",
      "hd-1080p": "HD-1080p",
      sd: "SD",
      "ultra-hd": "Ultra-HD",
    };
    return qualityMap[quality] || quality;
  };

  const formatAvailability = (availability: string) => {
    const availabilityMap: { [key: string]: string } = {
      announced: "Announced",
      inCinemas: "In Cinemas",
      released: "Released",
    };
    return availabilityMap[availability] || availability;
  };

  // Combine movies and series for display
  const allItems: MonitoredItem[] = useMemo(() => {
    return [...movies, ...series];
  }, [movies, series]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Search filter
      const matchesSearch = searchQuery.trim() === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      // Quality filter
      const matchesQuality = qualityFilter === "all" || item.qualityProfile === qualityFilter;

      // Availability filter
      const matchesAvailability = availabilityFilter === "all" || item.minAvailability === availabilityFilter;

      return matchesSearch && matchesStatus && matchesQuality && matchesAvailability;
    });
  }, [allItems, searchQuery, statusFilter, qualityFilter, availabilityFilter]);

  const hasActiveFilters = searchQuery.trim() !== "" || 
    statusFilter !== "all" || 
    qualityFilter !== "all" || 
    availabilityFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setQualityFilter("all");
    setAvailabilityFilter("all");
  };

  const handleMovieClick = async (movie: MonitoredMovie) => {
    setSelectedMovieForDownload(movie);
    setTorrents([]);
    // Initialize edit settings with current movie values
    setEditMonitor(movie.monitor || "movieOnly");
    setEditMinAvailability(movie.minAvailability || "released");
    setEditQualityProfile(movie.qualityProfile || "any");
    onDownloadModalOpen();
    
    // Search for torrents for this movie
    setLoadingTorrents(true);
    try {
      const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
      const response = await axios.get(
        `${API_BASE_URL}/api/TMDB/movie/${movie.tmdbId}/torrents`,
        {
          params: {
            title: movie.title,
            year: year,
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        setTorrents(response.data.results || []);
      }
    } catch (error) {
      console.error("Error fetching torrents:", error);
      setTorrents([]);
    } finally {
      setLoadingTorrents(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!selectedMovieForDownload) return;

    setUpdatingSettings(true);
    try {
      await axios.put(`${API_BASE_URL}/api/MonitoredMovies/${selectedMovieForDownload.id}`, {
        monitor: editMonitor,
        minAvailability: editMinAvailability,
        qualityProfile: editQualityProfile,
      });

      // Update local state
      setSelectedMovieForDownload({
        ...selectedMovieForDownload,
        monitor: editMonitor,
        minAvailability: editMinAvailability,
        qualityProfile: editQualityProfile,
      });

      // Refresh movies list
      await fetchMonitoredContent();

      alert("Settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleDownloadTorrent = async (torrent: TorrentResult) => {
    if (!selectedMovieForDownload) return;

    setDownloading((prev) => new Set(prev).add(torrent.id));
    setDownloadError((prev) => {
      const next = new Map(prev);
      next.delete(torrent.id);
      return next;
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
        downloadUrl: torrent.downloadUrl,
      });

      if (response.data.success) {
        setDownloadSuccess((prev) => new Set(prev).add(torrent.id));
        
        // Update movie status to downloading
        await axios.put(`${API_BASE_URL}/api/MonitoredMovies/${selectedMovieForDownload.id}`, {
          status: "downloading",
          downloadedTorrentId: torrent.id,
          downloadedTorrentTitle: torrent.title,
        });

        // Refresh movies list
        await fetchMonitoredContent();

        setTimeout(() => {
          setDownloadSuccess((prev) => {
            const next = new Set(prev);
            next.delete(torrent.id);
            return next;
          });
        }, 3000);
      } else {
        throw new Error(response.data.error || "Failed to download");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Download failed";
      setDownloadError((prev) => new Map(prev).set(torrent.id, errorMsg));
      setTimeout(() => {
        setDownloadError((prev) => {
          const next = new Map(prev);
          next.delete(torrent.id);
          return next;
        });
      }, 5000);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(torrent.id);
        return next;
      });
    }
  };

  useEffect(() => {
    if (isDownloadModalOpen) {
      setOpenSelects(new Set());
    }
  }, [isDownloadModalOpen]);

  if (loadingAuth || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                Monitored Content
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                Manage your movies and series collection
            </p>
          </div>
            <div className="flex flex-wrap gap-2">
              <Button
                color="success"
                variant="flat"
                className="flex-1 xs:flex-none"
                size="sm"
                startContent={<CheckCircle2 size={16} />}
                onPress={async () => {
                  if (!user) return;
                  try {
                    setLoading(true);
                    await axios.post(`${API_BASE_URL}/api/MonitoredMovies/check-all?userId=${user.id}`);
                    await fetchMonitoredContent();
                    alert("File check complete! Monitored list updated.");
                  } catch (error) {
                    console.error("Error checking files:", error);
                    alert("Failed to check files");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <span className="hidden xs:inline">Check All Files</span>
                <span className="xs:hidden">Check</span>
              </Button>
          <Button
                color="secondary"
                className="btn-glow flex-1 xs:flex-none"
            size="sm"
                startContent={<Film size={16} />}
                onPress={() => router.push("/pages/discover/movies")}
          >
                <span className="hidden xs:inline">Add Content</span>
                <span className="xs:hidden">Add</span>
          </Button>
            </div>
          </div>
        </div>
        </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

        {/* Search and Filters */}
        {allItems.length > 0 && (
          <Card className="mb-6 border border-secondary/20">
            <CardBody className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search size={18} className="text-secondary" />}
                  endContent={
                    searchQuery && (
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => setSearchQuery("")}
                      >
                        <X size={16} />
                      </Button>
                    )
                  }
                  size="md"
                  classNames={{
                    inputWrapper: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                  }}
                />

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label="Status"
                    placeholder="All statuses"
                    selectedKeys={statusFilter === "all" ? [] : [statusFilter]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setStatusFilter(selected || "all");
                    }}
                    size="sm"
                    startContent={<Filter size={16} className="text-secondary" />}
                    classNames={{
                      trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      label: "text-xs sm:text-sm",
                    }}
                  >
                    <SelectItem key="all" value="all">All Statuses</SelectItem>
                    <SelectItem key="monitoring" value="monitoring">Monitoring</SelectItem>
                    <SelectItem key="downloading" value="downloading">Downloading</SelectItem>
                    <SelectItem key="downloaded" value="downloaded">Downloaded</SelectItem>
                    <SelectItem key="error" value="error">Error</SelectItem>
                  </Select>

                  <Select
                    label="Quality"
                    placeholder="All qualities"
                    selectedKeys={qualityFilter === "all" ? [] : [qualityFilter]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setQualityFilter(selected || "all");
                    }}
                    size="sm"
                    classNames={{
                      trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      label: "text-xs sm:text-sm",
                    }}
                  >
                    <SelectItem key="all" value="all">All Qualities</SelectItem>
                    <SelectItem key="any" value="any">Any</SelectItem>
                    <SelectItem key="hd-720p-1080p" value="hd-720p-1080p">HD - 720p/1080p</SelectItem>
                    <SelectItem key="hd-720p" value="hd-720p">HD-720p</SelectItem>
                    <SelectItem key="hd-1080p" value="hd-1080p">HD-1080p</SelectItem>
                    <SelectItem key="sd" value="sd">SD</SelectItem>
                    <SelectItem key="ultra-hd" value="ultra-hd">Ultra-HD</SelectItem>
                  </Select>

                  <Select
                    label="Availability"
                    placeholder="All availabilities"
                    selectedKeys={availabilityFilter === "all" ? [] : [availabilityFilter]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setAvailabilityFilter(selected || "all");
                    }}
                    size="sm"
                    classNames={{
                      trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      label: "text-xs sm:text-sm",
                    }}
                  >
                    <SelectItem key="all" value="all">All Availabilities</SelectItem>
                    <SelectItem key="announced" value="announced">Announced</SelectItem>
                    <SelectItem key="inCinemas" value="inCinemas">In Cinemas</SelectItem>
                    <SelectItem key="released" value="released">Released</SelectItem>
                  </Select>
                </div>

                {/* Results count and clear filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-secondary/10">
                  <p className="text-xs sm:text-sm text-foreground/60">
                    Showing {filteredItems.length} of {allItems.length} items ({movies.length} movies, {series.length} series)
                    {hasActiveFilters && " (filtered)"}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      startContent={<X size={14} />}
                      onPress={clearFilters}
                      className="text-xs sm:text-sm"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {allItems.length === 0 ? (
          <Card className="card-interactive">
            <CardBody className="text-center py-12 sm:py-16 px-4">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Film className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No Content Monitored</h3>
                  <p className="text-sm sm:text-base text-foreground/60 mb-4">
                    Start by searching for movies or series and adding them to your monitored list.
                </p>
                <Button
                    color="secondary"
                    className="btn-glow"
                    size="sm"
                    startContent={<Film size={16} />}
                    onPress={() => router.push("/pages/discover/movies")}
                >
                    Search Content
                </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="card-interactive">
            <CardBody className="text-center py-12 sm:py-16 px-4">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No Matches Found</h3>
                  <p className="text-sm sm:text-base text-foreground/60 mb-4">
                    Try adjusting your search or filter criteria.
                </p>
                {hasActiveFilters && (
                  <Button
                      color="secondary"
                    variant="flat"
                      size="sm"
                    startContent={<X size={16} />}
                    onPress={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12 5xl:grid-cols-14 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
            {filteredItems.map((item) => {
              const isSeries = item.type === "series";
              const seriesItem = isSeries ? item as MonitoredSeries : null;
              const movieItem = !isSeries ? item as MonitoredMovie : null;
              
              const year = isSeries 
                ? (seriesItem?.firstAirDate ? new Date(seriesItem.firstAirDate).getFullYear() : null)
                : (movieItem?.releaseDate ? new Date(movieItem.releaseDate).getFullYear() : null);
              
              return (
              <div key={item.id} className="flex flex-col">
                  {/* Image Section */}
                  <div 
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-lg cursor-pointer"
                    onClick={(e) => {
                      if (isSeries && seriesItem) {
                        // Handle series click - could open series modal or do nothing for now
                      } else if (movieItem) {
                        handleMovieClick(movieItem);
                      }
                    }}
                  >
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-content2 flex items-center justify-center">
                        {isSeries ? (
                          <Tv size={32} className="text-foreground/40" />
                        ) : (
                          <Film size={32} className="text-foreground/40" />
                        )}
                      </div>
                    )}
                    
                    {/* Media Type Badge - Top Left */}
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <Chip
                        size="sm"
                        color={isSeries ? "secondary" : "primary"} 
                        variant="flat"
                        className="text-[10px] sm:text-xs font-bold uppercase backdrop-blur-md"
                      >
                        {isSeries ? "TV" : "Movie"}
                      </Chip>
                    </div>

                    {/* Status Badge - Top Right */}
                    <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
                      {/* File Exists Indicator */}
                      {movieItem && movieItem.fileExists && (
                        <Chip
                          size="sm"
                          color="success"
                          variant="flat"
                          startContent={<CheckCircle2 size={12} />}
                          className="text-[10px] sm:text-xs backdrop-blur-md"
                          title={`File found: ${movieItem.fileName || 'Found in library'}`}
                        >
                          <span className="hidden sm:inline">On Disk</span>
                          <span className="sm:hidden">✓</span>
                        </Chip>
                      )}
                      
                      <Chip
                        size="sm"
                        color={getStatusColor(item.status)}
                        variant="flat"
                        startContent={getStatusIcon(item.status)}
                        className="text-[10px] sm:text-xs backdrop-blur-md"
                      >
                        <span className="hidden sm:inline">
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                        <span className="sm:hidden">
                          {item.status.charAt(0).toUpperCase()}
                        </span>
                      </Chip>
                    </div>

                    {/* Title and Year Overlay - Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
                      <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2 mb-0.5">
                        {item.title}
                      </h3>
                      {year && (
                        <p className="text-[10px] sm:text-xs text-white/70">{year}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-2 space-y-2">
                    {/* Request Button */}
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      startContent={<Search size={14} />}
                      onPress={() => {
                        if (isSeries && seriesItem) {
                          handleRequestSeries(seriesItem);
                        } else if (movieItem) {
                          handleRequestMovie(movieItem);
                        }
                      }}
                      isLoading={
                        isSeries 
                          ? requestingSeries.has(item.id)
                          : requesting.has(item.id)
                      }
                      className="w-full text-xs h-7 sm:h-8"
                    >
                      Request
                    </Button>
                    
                    {/* Remove Button */}
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash2 size={14} />}
                      onPress={() => {
                        if (isSeries && seriesItem) {
                          handleRemoveSeries(seriesItem.id);
                        } else if (movieItem) {
                          handleRemoveMovie(movieItem.id);
                        }
                      }}
                      isLoading={
                        isSeries 
                          ? deletingSeries.has(item.id)
                          : deleting.has(item.id)
                      }
                      className="w-full text-xs h-7 sm:h-8"
                    >
                      Remove
                    </Button>
                  </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Download Torrents Modal */}
        <Modal
          isOpen={isDownloadModalOpen}
          onClose={() => {
            if (openSelects.size === 0) {
              onDownloadModalClose();
              setSelectedMovieForDownload(null);
              setTorrents([]);
            }
          }}
          size="5xl"
          scrollBehavior="inside"
          shouldBlockScroll={true}
          isDismissable={openSelects.size === 0}
          classNames={{
            backdrop: "bg-overlay/50 backdrop-blur-sm",
            base: "bg-content1 border border-secondary/20 mx-2 sm:mx-4 shadow-xl shadow-secondary/10",
          }}
        >
          <ModalContent>
            <ModalHeader className="border-b border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent px-4 sm:px-6 py-4 sm:py-5">
              <div className="w-full">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  {selectedMovieForDownload?.title}
                </h2>
                <p className="text-sm sm:text-base text-foreground/70 font-normal mt-1">
                  {selectedMovieForDownload?.releaseDate && 
                    `Released: ${new Date(selectedMovieForDownload.releaseDate).getFullYear()}`}
                </p>
              </div>
            </ModalHeader>
            <ModalBody className="py-5 sm:py-6 px-4 sm:px-6">
              {selectedMovieForDownload && (
                <div className="space-y-5 sm:space-y-6">
                  {/* Movie Info */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {selectedMovieForDownload.posterUrl && (
                      <div className="flex-shrink-0 mx-auto sm:mx-0">
                        <img
                          src={selectedMovieForDownload.posterUrl}
                          alt={selectedMovieForDownload.title}
                          className="w-24 sm:w-32 rounded-lg shadow-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                        {selectedMovieForDownload.overview || 'No overview available'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Chip size="sm" variant="flat" color="secondary" className="text-xs">
                          {formatQuality(selectedMovieForDownload.qualityProfile)}
                        </Chip>
                        <Chip size="sm" variant="flat" className="text-xs">
                          {formatAvailability(selectedMovieForDownload.minAvailability)}
                        </Chip>
                        <Chip 
                          size="sm" 
                          color={getStatusColor(selectedMovieForDownload.status)}
                          variant="flat"
                          startContent={getStatusIcon(selectedMovieForDownload.status)}
                          className="text-xs"
                        >
                          {selectedMovieForDownload.status.charAt(0).toUpperCase() + selectedMovieForDownload.status.slice(1)}
                        </Chip>
                      </div>
                    </div>
                  </div>

                  {/* Editable Settings */}
                  <Card className="bg-content2 border border-secondary/20">
                    <CardBody className="p-4 sm:p-6">
                      <div className="space-y-4">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">Edit Settings</h3>
                        <div 
                          className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Select
                            label="Monitor"
                            labelPlacement="outside"
                            placeholder="Select monitor option"
                            selectedKeys={editMonitor ? new Set([editMonitor]) : new Set()}
                            onSelectionChange={(keys) => {
                              const keysArray = Array.from(keys);
                              if (keysArray.length > 0) {
                                const selected = keysArray[0] as string;
                                setEditMonitor(selected);
                              }
                            }}
                            onOpenChange={(open) => {
                              setOpenSelects((prev) => {
                                const next = new Set(prev);
                                if (open) {
                                  next.add("editMonitor");
                                } else {
                                  next.delete("editMonitor");
                                }
                                return next;
                              });
                            }}
                            size="sm"
                            classNames={{
                              trigger: "bg-content1 border border-secondary/20 hover:border-secondary/40",
                              label: "text-xs sm:text-sm",
                            }}
                            disallowEmptySelection
                          >
                            <SelectItem key="movieOnly" value="movieOnly">
                              Movie Only
                            </SelectItem>
                          </Select>

                          <Select
                            label="Minimum Availability"
                            labelPlacement="outside"
                            placeholder="Select availability"
                            selectedKeys={editMinAvailability ? new Set([editMinAvailability]) : new Set()}
                            onSelectionChange={(keys) => {
                              const keysArray = Array.from(keys);
                              if (keysArray.length > 0) {
                                const selected = keysArray[0] as string;
                                setEditMinAvailability(selected);
                              }
                            }}
                            onOpenChange={(open) => {
                              setOpenSelects((prev) => {
                                const next = new Set(prev);
                                if (open) {
                                  next.add("editAvailability");
                                } else {
                                  next.delete("editAvailability");
                                }
                                return next;
                              });
                            }}
                            size="sm"
                            classNames={{
                              trigger: "bg-content1 border border-secondary/20 hover:border-secondary/40",
                              label: "text-xs sm:text-sm",
                            }}
                            disallowEmptySelection
                          >
                            <SelectItem key="announced" value="announced">
                              Announced
                            </SelectItem>
                            <SelectItem key="inCinemas" value="inCinemas">
                              In Cinemas
                            </SelectItem>
                            <SelectItem key="released" value="released">
                              Released
                            </SelectItem>
                          </Select>

                          <Select
                            label="Quality Profile"
                            labelPlacement="outside"
                            placeholder="Select quality"
                            selectedKeys={editQualityProfile ? new Set([editQualityProfile]) : new Set()}
                            onSelectionChange={(keys) => {
                              const keysArray = Array.from(keys);
                              if (keysArray.length > 0) {
                                const selected = keysArray[0] as string;
                                setEditQualityProfile(selected);
                              }
                            }}
                            onOpenChange={(open) => {
                              setOpenSelects((prev) => {
                                const next = new Set(prev);
                                if (open) {
                                  next.add("editQuality");
                                } else {
                                  next.delete("editQuality");
                                }
                                return next;
                              });
                            }}
                            size="sm"
                            classNames={{
                              trigger: "bg-content1 border border-secondary/20 hover:border-secondary/40",
                              label: "text-xs sm:text-sm",
                            }}
                            disallowEmptySelection
                          >
                            <SelectItem key="any" value="any">
                              Any
                            </SelectItem>
                            <SelectItem key="hd-720p-1080p" value="hd-720p-1080p">
                              HD - 720p/1080p
                            </SelectItem>
                            <SelectItem key="hd-720p" value="hd-720p">
                              HD-720p
                            </SelectItem>
                            <SelectItem key="hd-1080p" value="hd-1080p">
                              HD-1080p
                            </SelectItem>
                            <SelectItem key="sd" value="sd">
                              SD
                            </SelectItem>
                            <SelectItem key="ultra-hd" value="ultra-hd">
                              Ultra-HD
                            </SelectItem>
                          </Select>
                        </div>
                        <Button
                          color="secondary"
                          className="btn-glow w-full sm:w-auto text-xs sm:text-sm"
                          onPress={handleUpdateSettings}
                          isLoading={updatingSettings}
                          size="sm"
                        >
                          Update Settings
                        </Button>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Torrents Section */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4 text-foreground">Available Torrents</h3>
                    
                    {loadingTorrents ? (
                      <div className="flex justify-center items-center py-8">
                        <Spinner color="secondary" />
                        <p className="ml-3 text-sm text-foreground/60">Searching indexers...</p>
                      </div>
                    ) : torrents.length > 0 ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {torrents.map((torrent) => (
                          <Card 
                            key={torrent.id} 
                            className="hover-lift border border-secondary/10 hover:border-secondary/30 transition-all"
                          >
                            <CardBody className="p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm sm:text-base truncate mb-1">{torrent.title}</p>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-foreground/60">
                                    <Chip size="sm" variant="flat" color="secondary" className="text-[10px] sm:text-xs h-5">
                                      {torrent.indexer}
                                    </Chip>
                                    <span>{torrent.sizeFormatted}</span>
                                    <span className="flex items-center gap-1">
                                      <span>👤</span> {torrent.seeders || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span>⬇️</span> {torrent.leechers || 0}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  color={downloadSuccess.has(torrent.id) ? "success" : downloadError.has(torrent.id) ? "danger" : "secondary"}
                                  className={downloadSuccess.has(torrent.id) ? "text-xs sm:text-sm flex-shrink-0" : "btn-glow text-xs sm:text-sm flex-shrink-0"}
                                  startContent={
                                    downloadSuccess.has(torrent.id) ? (
                                      <Check size={16} />
                                    ) : (
                                      <Download size={16} />
                                    )
                                  }
                                  onPress={() => handleDownloadTorrent(torrent)}
                                  isLoading={downloading.has(torrent.id)}
                                  isDisabled={downloading.has(torrent.id) || !torrent.downloadUrl}
                                >
                                  {downloadSuccess.has(torrent.id) ? "Downloaded" : "Download"}
                                </Button>
                              </div>
                              {downloadError.has(torrent.id) && (
                                <div className="mt-2 p-2 bg-danger/10 border border-danger/20 rounded-lg">
                                  <p className="text-xs text-danger">
                                  {downloadError.get(torrent.id)}
                                </p>
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-content2 border border-secondary/20">
                        <CardBody className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 text-foreground/40" />
                            <p className="text-sm text-foreground/60">No torrents found for this movie</p>
                          </div>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="border-t border-secondary/20 px-4 sm:px-6 py-3 sm:py-4">
              <Button 
                variant="flat" 
                onPress={onDownloadModalClose}
                size="sm"
                className="text-xs sm:text-sm"
              >
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
            </div>
        </div>
    );
};

export default Monitored;

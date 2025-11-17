"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal";
import { useRouter } from "next/navigation";
import {
  Film,
  Tv,
  Search,
  Filter,
  X,
  Calendar,
  Star,
  Clock,
  Play,
  Server,
  Eye,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Check,
} from "lucide-react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import AddMovieModal from "@/components/AddMovieModal";
import AddSeriesModal from "@/components/AddSeriesModal";
import "../../../styles/MediaLibrary.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface PlexMedia {
  key: string;
  ratingKey?: string;
  title: string;
  year: number;
  type: string;
  libraryKey?: string;
  libraryName?: string;
  libraryType?: string;
  summary: string;
  rating: number;
  contentRating: string;
  thumb: string | null;
  art: string | null;
  originalTitle?: string;
  duration: number;
  addedAt: number;
  updatedAt: number;
  lastViewedAt?: number;
  viewCount: number;
  genres: string[];
  directors?: string[];
  writers?: string[];
  actors?: string[];
  studio: string;
  tagline?: string;
  countries?: string[];
  childCount?: number;
  leafCount?: number;
}

interface PlexLibrary {
  key: string;
  title: string;
  type: string;
  count: number;
}

const MediaLibrary = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [media, setMedia] = useState<PlexMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [libraries, setLibraries] = useState<PlexLibrary[]>([]);
  const [plexServerUrl, setPlexServerUrl] = useState<string>('');
  const [plexMachineId, setPlexMachineId] = useState<string>('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'show'>('all');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'addedAt:desc' | 'title:asc' | 'rating:desc' | 'year:desc'>('addedAt:desc');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [selectedMedia, setSelectedMedia] = useState<PlexMedia | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<string>>(new Set());

  // Favorites state (we'll store by Plex key since no TMDB IDs)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingIds, setFavoritingIds] = useState<Set<string>>(new Set());

  // Check Plex connection
  useEffect(() => {
    if (user) {
      checkPlexConnection();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkPlexConnection = async () => {
    if (!user) {
      setIsConnected(false);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/PlexConnection`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setIsConnected(response.data.connected && response.data.isConnected);
      
      if (!response.data.connected || !response.data.isConnected) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking Plex connection:", error);
      setIsConnected(false);
      setLoading(false);
    }
  };

  const fetchMedia = useCallback(async (page: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        page,
        limit: 50,
        type: mediaTypeFilter,
        sort: sortBy,
      };

      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      console.log('📡 Fetching Plex media with params:', params);

      const response = await axios.get(`${API_BASE_URL}/api/PlexConnection/media`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params,
      });

      console.log('📦 Plex media response:', response.data);
      console.log('📊 Response details:', {
        success: response.data.success,
        itemsCount: response.data.items?.length || 0,
        total: response.data.total,
        libraries: response.data.libraries,
        error: response.data.error
      });

      if (response.data.success) {
        const items = response.data.items || [];
        console.log(`✅ Received ${items.length} items from Plex`);
        console.log('📝 First item sample:', items[0]);
        
        // Store Plex server info for URL construction
        if (response.data.serverUrl) {
          setPlexServerUrl(response.data.serverUrl);
        }
        if (response.data.machineIdentifier) {
          setPlexMachineId(response.data.machineIdentifier);
        }
        
        if (append) {
          setMedia(prev => {
            // Create a Map to deduplicate by item.key
            const existingKeys = new Set(prev.map((item: PlexMedia) => item.key));
            const newResults = items.filter((item: PlexMedia) => !existingKeys.has(item.key));
            return [...prev, ...newResults];
          });
        } else {
          setMedia(items);
          setLibraries(response.data.libraries || []);
        }

        setTotalResults(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(page);
        setHasMore(page < (response.data.totalPages || 1));
      } else {
        console.error('❌ Plex API returned success=false:', response.data);
      }
    } catch (error: any) {
      console.error("❌ Error fetching media:", error);
      console.error("Error response:", error.response?.data);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearchQuery, mediaTypeFilter, sortBy]);

  // Fetch media when filters change
  useEffect(() => {
    if (isConnected) {
      setMedia([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchMedia(1, false);
    }
  }, [isConnected, fetchMedia]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user is 200px from bottom
      if (scrollTop + windowHeight >= documentHeight - 200) {
        const nextPage = currentPage + 1;
        if (nextPage <= totalPages) {
          fetchMedia(nextPage, true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, totalPages, hasMore, loading, loadingMore, fetchMedia]);

  const handleMediaClick = (item: PlexMedia) => {
    setSelectedMedia(item);
    setIsDetailModalOpen(true);
  };

  const handleQuickDownload = async (item: PlexMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      return;
    }

    const itemKey = item.key;
    setDownloading((prev) => new Set(prev).add(itemKey));

    try {
      setSelectedMedia(item);
      if (item.type === 'movie') {
        setIsMovieModalOpen(true);
      } else if (item.type === 'show') {
        setIsSeriesModalOpen(true);
      }
      
      setDownloadSuccess((prev) => new Set(prev).add(itemKey));
      setTimeout(() => {
        setDownloadSuccess((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }, 3000);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const toggleFavorite = async (item: PlexMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      return;
    }

    const favoriteKey = item.key;
    const isFavorited = favoriteIds.has(favoriteKey);
    
    setFavoritingIds((prev) => new Set(prev).add(favoriteKey));

    try {
      // For Plex items, we'll toggle locally
      // You could extend this to save to backend if needed
      if (isFavorited) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(favoriteKey);
          return next;
        });
      } else {
        setFavoriteIds((prev) => new Set(prev).add(favoriteKey));
      }
    } finally {
      setFavoritingIds((prev) => {
        const next = new Set(prev);
        next.delete(favoriteKey);
        return next;
      });
    }
  };

  const getPlexImageUrl = (url: string | null) => {
    return url || null;
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getMediaTypeColor = (type: string) => {
    switch (type) {
      case 'movie':
        return 'primary';
      case 'show':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setMediaTypeFilter('all');
    setSelectedLibrary('all');
    setSortBy('addedAt:desc');
  };

  const getPlexUrl = (item: PlexMedia) => {
    if (!plexServerUrl || !plexMachineId || !item.key) return null;
    
    // Extract the rating key - could be just a number or a path
    let ratingKey = item.ratingKey || item.key;
    
    // If it's a path like "/library/metadata/12345", extract just the number
    if (ratingKey.includes('/')) {
      const parts = ratingKey.split('/');
      ratingKey = parts[parts.length - 1];
    }
    
    // Construct the Plex web URL
    // Format: {serverUrl}/web/index.html#!/server/{machineId}/details?key=/library/metadata/{ratingKey}
    return `${plexServerUrl}/web/index.html#!/server/${plexMachineId}/details?key=%2Flibrary%2Fmetadata%2F${ratingKey}`;
  };

  const openInPlex = (item: PlexMedia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const plexUrl = getPlexUrl(item);
    if (plexUrl) {
      window.open(plexUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderMediaCard = (item: PlexMedia) => {
    const posterUrl = getPlexImageUrl(item.thumb);
    const isDownloading = downloading.has(item.key);
    const isDownloaded = downloadSuccess.has(item.key);
    const isFavorited = favoriteIds.has(item.key);
    const isFavoriting = favoritingIds.has(item.key);

    return (
      <div
        onClick={() => handleMediaClick(item)}
        className="cursor-pointer group transition-all duration-300 hover:scale-105 hover:-translate-y-1"
        style={{ height: '100%' }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md sm:rounded-lg md:rounded-xl border border-secondary/20 hover:border-secondary/60 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-secondary/20 transition-all duration-300">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const placeholder = parent.querySelector('.poster-placeholder');
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }
              }}
            />
          ) : null}
          
          {/* Placeholder */}
          <div 
            className={`poster-placeholder w-full h-full bg-default-200 flex items-center justify-center ${posterUrl ? 'hidden' : 'flex'}`}
          >
            {item.type === 'movie' ? (
              <Film size={48} className="text-default-400" />
            ) : (
              <Tv size={48} className="text-default-400" />
            )}
          </div>
          
          {/* Media Type Badge - Top Left */}
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-10">
            <Chip 
              size="sm" 
              color={item.type === 'movie' ? 'primary' : 'secondary'} 
              variant="flat" 
              className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase backdrop-blur-md px-0.5 sm:px-1 py-0.5 h-4 sm:h-5"
            >
              {item.type === 'movie' ? 'Movie' : 'Series'}
            </Chip>
          </div>

          {/* Rating Badge - Top Right */}
          {item.rating > 0 && (
            <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 bg-black/85 backdrop-blur-md px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] md:text-xs">
              <span className="font-semibold text-white">
                ⭐ {item.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Play on Plex Button - Bottom Right (left of favorite) */}
          {plexServerUrl && plexMachineId && (
            <button
              onClick={(e) => openInPlex(item, e)}
              className="absolute bottom-0.5 right-14 sm:bottom-1 sm:right-20 z-10 p-1 sm:p-1.5 rounded-full bg-warning/90 hover:bg-warning backdrop-blur-md transition-all duration-200"
              title="Play on Plex"
            >
              <Play size={14} className="sm:w-4 sm:h-4 text-white fill-white" />
            </button>
          )}

          {/* Favorite Button - Bottom Right (left of download) */}
          {user && (
            <button
              onClick={(e) => toggleFavorite(item, e)}
              disabled={isFavoriting}
              className={`absolute bottom-0.5 right-7 sm:bottom-1 sm:right-10 z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isFavorited
                  ? 'bg-danger/90 hover:bg-danger'
                  : 'bg-secondary/60 hover:bg-secondary/80'
              } ${isFavoriting ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              {isFavoriting ? (
                <Spinner size="sm" color="white" className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : (
                <Heart 
                  size={14} 
                  className={`sm:w-4 sm:h-4 ${isFavorited ? 'text-white fill-white' : 'text-purple-300'}`} 
                />
              )}
            </button>
          )}

          {/* Download Button - Bottom Right */}
          <button
            onClick={(e) => handleQuickDownload(item, e)}
            disabled={isDownloading || isDownloaded}
            className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
              isDownloaded
                ? 'bg-success/90 hover:bg-success'
                : 'bg-secondary/90 hover:bg-secondary'
            } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Quick Download'}
          >
            {isDownloading ? (
              <Spinner size="sm" color="white" className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : isDownloaded ? (
              <Check size={14} className="sm:w-4 sm:h-4 text-white" />
            ) : (
              <Download size={14} className="sm:w-4 sm:h-4 text-white" />
            )}
          </button>

          {/* Title and Year Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 group-hover:from-black/98 group-hover:via-black/90">
            <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm text-white line-clamp-2 mb-0.5 leading-tight">
              {item.title}
            </h3>
            {item.year && (
              <p className="text-[9px] sm:text-[10px] md:text-xs text-white/70">{item.year}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-10">
            <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
            <p className="text-foreground/60 mb-6">Please log in to access your Media Library</p>
            <Button
              color="secondary"
              className="btn-glow"
              onPress={() => router.push("/pages/login")}
            >
              Log In
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                  Media Library
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Browse your Plex media collection
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Not Connected Content */}
        <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10">
          <Card className="card-interactive">
            <CardBody className="text-center py-16 px-4">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Server className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Plex Not Connected
                  </h3>
                  <p className="text-sm text-foreground/60 mb-6">
                    Connect your Plex Media Server to view your library here
                  </p>
                  <Button
                    color="secondary"
                    className="btn-glow"
                    size="sm"
                    startContent={<Server size={16} />}
                    onPress={() => router.push("/pages/plexconnection")}
                  >
                    Connect to Plex
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background MediaLibrary">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                  Media Library
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  {totalResults} items from your Plex server
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={showFilters ? "solid" : "flat"}
                  color="secondary"
                  size="sm"
                  startContent={<Filter size={16} />}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  Filters
                </Button>
              </div>
            </div>

            {/* Search and Quick Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Search your Plex library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search size={18} className="text-secondary" />}
                  className="flex-1"
                  size="sm"
                  classNames={{
                    inputWrapper: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  aria-label="Filter by media type"
                  selectedKeys={new Set([mediaTypeFilter])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setMediaTypeFilter(selected as any || 'all');
                  }}
                  placeholder="All Types"
                  className="w-32 flex-shrink-0"
                  size="sm"
                  classNames={{
                    trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                  }}
                >
                  <SelectItem key="all" value="all">All Types</SelectItem>
                  <SelectItem key="movie" value="movie">Movies</SelectItem>
                  <SelectItem key="show" value="show">TV Shows</SelectItem>
                </Select>
                <Button
                  variant={showFilters ? "solid" : "bordered"}
                  color={showFilters ? "secondary" : "default"}
                  startContent={<Filter size={18} />}
                  onPress={() => setShowFilters(!showFilters)}
                  size="sm"
                  className={showFilters ? "btn-glow" : "border-2 border-secondary/20 hover:border-secondary/40"}
                >
                  <span className="hidden sm:inline">Filters</span>
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card className="card-interactive border-2 border-secondary/20 relative z-50">
                <CardBody className="p-4 sm:p-6 relative z-50">
                  <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                      Filters
                    </h2>
                    <Button
                      variant="flat"
                      color="secondary"
                      size="sm"
                      startContent={<X size={16} />}
                      onPress={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      label="Sort By"
                      classNames={{
                        base: "flex-1",
                        trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40",
                      }}
                      size="sm"
                      selectedKeys={[sortBy]}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <SelectItem key="addedAt:desc" value="addedAt:desc">Recently Added</SelectItem>
                      <SelectItem key="title:asc" value="title:asc">Title (A-Z)</SelectItem>
                      <SelectItem key="rating:desc" value="rating:desc">Highest Rated</SelectItem>
                      <SelectItem key="year:desc" value="year:desc">Newest First</SelectItem>
                    </Select>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Library Stats */}
            {libraries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {libraries.map((lib) => (
                  <Chip
                    key={lib.key}
                    size="sm"
                    variant="flat"
                    color={lib.type === 'movie' ? 'primary' : 'secondary'}
                    startContent={lib.type === 'movie' ? <Film size={12} /> : <Tv size={12} />}
                  >
                    {lib.title}: {lib.count}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : media.length === 0 ? (
          <Card className="card-interactive">
            <CardBody className="text-center py-16 px-4">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Search className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Media Found</h3>
                  <p className="text-sm text-foreground/60">
                    {searchQuery
                      ? "Try adjusting your search or filters"
                      : "Your Plex library appears to be empty"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-xs sm:text-sm text-foreground/60">
              Showing {media.length} of {totalResults} results
            </div>
            
            {/* Media Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12 5xl:grid-cols-14 gap-2 sm:gap-3 md:gap-4 relative z-0">
              {media.map((item) => (
                <React.Fragment key={item.key}>
                  {renderMediaCard(item)}
                </React.Fragment>
              ))}
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <Spinner size="lg" color="secondary" />
              </div>
            )}

            {/* End of results message */}
            {!hasMore && media.length > 0 && (
              <div className="text-center py-8 text-xs sm:text-sm text-foreground/60">
                No more results to load
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        size="3xl"
        scrollBehavior="inside"
        classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20",
        }}
      >
        <ModalContent>
          <ModalHeader className="border-b border-secondary/20">
            <div className="flex items-center gap-3 w-full">
              {selectedMedia?.type === 'movie' ? (
                <Film className="w-6 h-6 text-secondary" />
              ) : (
                <Tv className="w-6 h-6 text-primary" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{selectedMedia?.title}</h2>
                <p className="text-sm text-foreground/60">
                  {selectedMedia?.year} • {selectedMedia?.contentRating}
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="py-6">
            {selectedMedia && (
              <div className="space-y-6">
                {/* Backdrop/Art Image */}
                {selectedMedia.art && (
                  <div className="relative w-full h-48 -mt-6 -mx-6 mb-4 overflow-hidden">
                    <img
                      src={selectedMedia.art}
                      alt={`${selectedMedia.title} backdrop`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.parentElement!.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-content1 via-content1/50 to-transparent" />
                  </div>
                )}

                {/* Tagline */}
                {selectedMedia.tagline && (
                  <p className="text-sm italic text-foreground/70 border-l-4 border-secondary pl-3">
                    "{selectedMedia.tagline}"
                  </p>
                )}

                {/* Rating and Info */}
                <div className="flex flex-wrap gap-4">
                  {selectedMedia.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-warning text-warning" />
                      <span className="font-semibold">{selectedMedia.rating.toFixed(1)}/10</span>
                    </div>
                  )}
                  {selectedMedia.duration && selectedMedia.type === 'movie' && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-secondary" />
                      <span>{formatDuration(selectedMedia.duration)}</span>
                    </div>
                  )}
                  {selectedMedia.viewCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-success" />
                      <span>Watched {selectedMedia.viewCount} {selectedMedia.viewCount === 1 ? 'time' : 'times'}</span>
                    </div>
                  )}
                  {selectedMedia.lastViewedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-foreground/60" />
                      <span className="text-sm text-foreground/60">
                        Last: {formatDate(selectedMedia.lastViewedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* TV Show Info */}
                {selectedMedia.type === 'show' && (
                  <div className="flex flex-wrap gap-2">
                    <Chip size="sm" color="primary">
                      {selectedMedia.childCount} {selectedMedia.childCount === 1 ? 'Season' : 'Seasons'}
                    </Chip>
                    <Chip size="sm" color="secondary">
                      {selectedMedia.leafCount} Episodes
                    </Chip>
                  </div>
                )}

                {/* Summary */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Overview</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {selectedMedia.summary || "No overview available"}
                  </p>
                </div>

                {/* Genres */}
                {selectedMedia.genres && selectedMedia.genres.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMedia.genres.map((genre, index) => (
                        <Chip key={index} size="sm" variant="flat" color="secondary">
                          {genre}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cast & Crew */}
                {((selectedMedia.directors && selectedMedia.directors.length > 0) ||
                  (selectedMedia.actors && selectedMedia.actors.length > 0)) && (
                  <div className="space-y-3">
                    {selectedMedia.directors && selectedMedia.directors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Director{selectedMedia.directors.length > 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm text-foreground/80">
                          {selectedMedia.directors.join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {selectedMedia.writers && selectedMedia.writers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">
                          Writer{selectedMedia.writers.length > 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm text-foreground/80">
                          {selectedMedia.writers.join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {selectedMedia.actors && selectedMedia.actors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Cast</h3>
                        <p className="text-sm text-foreground/80">
                          {selectedMedia.actors.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Studio & Countries */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedMedia.studio && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Studio</h3>
                      <p className="text-sm text-foreground/80">{selectedMedia.studio}</p>
                    </div>
                  )}
                  
                  {selectedMedia.countries && selectedMedia.countries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {selectedMedia.countries.length > 1 ? 'Countries' : 'Country'}
                      </h3>
                      <p className="text-sm text-foreground/80">
                        {selectedMedia.countries.join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Library Info */}
                {selectedMedia.libraryName && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Library</h3>
                    <Chip size="sm" variant="flat" color="secondary">
                      {selectedMedia.libraryName}
                    </Chip>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-secondary/20">
                  <div>
                    <span className="text-foreground/60">Added: </span>
                    <span className="font-medium">{formatDate(selectedMedia.addedAt)}</span>
                  </div>
                  <div>
                    <span className="text-foreground/60">Updated: </span>
                    <span className="font-medium">{formatDate(selectedMedia.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="border-t border-secondary/20">
            <div className="flex flex-1 justify-between items-center">
              <div>
                {selectedMedia && plexServerUrl && plexMachineId && (
                  <Button
                    color="warning"
                    className="btn-glow"
                    startContent={<Play size={18} />}
                    onPress={() => selectedMedia && openInPlex(selectedMedia)}
                  >
                    Play on Plex
                  </Button>
                )}
              </div>
              <Button
                variant="flat"
                onPress={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Movie Modal */}
      {selectedMedia && selectedMedia.type === 'movie' && (
        <AddMovieModal
          isOpen={isMovieModalOpen}
          onClose={() => {
            setIsMovieModalOpen(false);
          }}
          media={{
            id: parseInt(selectedMedia.key) || 0,
            title: selectedMedia.title,
            overview: selectedMedia.summary,
            release_date: selectedMedia.year ? `${selectedMedia.year}-01-01` : undefined,
            poster_path: null,
            posterUrl: selectedMedia.thumb || null,
            vote_average: selectedMedia.rating || 0,
            vote_count: 0,
            popularity: 0,
            genre_ids: [],
            media_type: 'movie',
          }}
        />
      )}

      {/* Add Series Modal */}
      {selectedMedia && selectedMedia.type === 'show' && (
        <AddSeriesModal
          isOpen={isSeriesModalOpen}
          onClose={() => {
            setIsSeriesModalOpen(false);
          }}
          media={{
            id: parseInt(selectedMedia.key) || 0,
            name: selectedMedia.title,
            overview: selectedMedia.summary,
            first_air_date: selectedMedia.year ? `${selectedMedia.year}-01-01` : undefined,
            poster_path: null,
            posterUrl: selectedMedia.thumb || null,
            vote_average: selectedMedia.rating || 0,
            vote_count: 0,
            popularity: 0,
            genre_ids: [],
            media_type: 'tv',
          }}
        />
      )}
    </div>
  );
};

export default MediaLibrary;

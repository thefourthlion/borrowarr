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
  ChevronLeft,
  Calendar,
  Download,
  Check,
  Heart,
} from "lucide-react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import AddMovieModal from "@/components/AddMovieModal";
import AddSeriesModal from "@/components/AddSeriesModal";
import { useAuth } from "@/context/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface Favorite {
  id: number;
  userId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterUrl: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  posterUrl: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  genre_ids: number[];
  genres?: string[];
  language?: string;
  network?: string;
  number_of_seasons?: number;
  media_type?: 'movie' | 'tv';
}

const FavoritesPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'rating'>('recent');

  // Modal state
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);

  // Download state
  const [downloading, setDownloading] = useState<Set<number>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<number>>(new Set());

  // Modal state for notifications
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotificationModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeNotification = () => {
    setNotificationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Fetch favorites
  const fetchFavorites = useCallback(async (page = 1, append = false) => {
    if (!user) return;

    if (append) {
      setLoadingMore(true);
    } else {
    setLoading(true);
    }

    try {
      const token = localStorage.getItem("token");
      const params: any = { page, limit: 20 };

      if (mediaTypeFilter && mediaTypeFilter !== 'all') {
        params.mediaType = mediaTypeFilter;
      }

      if (debouncedSearchQuery.trim()) {
        params.search = debouncedSearchQuery.trim();
      }

      const response = await axios.get(`${API_BASE_URL}/api/Favorites`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.success) {
        const results = response.data.favorites || [];
        
        // Sort favorites based on sortBy
        const sortedResults = [...results].sort((a, b) => {
          if (sortBy === 'recent') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } else if (sortBy === 'title') {
            return a.title.localeCompare(b.title);
          } else if (sortBy === 'rating') {
            return (b.voteAverage || 0) - (a.voteAverage || 0);
          }
          return 0;
        });

        if (append) {
          setFavorites(prev => {
            const existingIds = new Set(prev.map(item => item.id));
            const newResults = sortedResults.filter(item => !existingIds.has(item.id));
            return [...prev, ...newResults];
          });
        } else {
          setFavorites(sortedResults);
        }

        setTotalPages(response.data.pagination?.pages || 1);
        setCurrentPage(page);
        setHasMore(page < (response.data.pagination?.pages || 1));
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, debouncedSearchQuery, mediaTypeFilter, sortBy]);

  useEffect(() => {
    setFavorites([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchFavorites(1, false);
  }, [fetchFavorites]);

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
          fetchFavorites(nextPage, true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, totalPages, hasMore, loading, loadingMore, fetchFavorites]);

  const removeFavorite = async (favorite: Favorite) => {
    if (!user) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/Favorites`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          tmdbId: favorite.tmdbId,
          mediaType: favorite.mediaType,
        },
      });

      // Remove from local state
      setFavorites((prev) => prev.filter((f) => f.id !== favorite.id));
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Failed to remove favorite";
      showNotification('Error', errorMsg, 'error');
    }
  };

  const handleMediaClick = (favorite: Favorite) => {
    // Convert favorite to TMDBMedia format
    const media: TMDBMedia = {
      id: favorite.tmdbId,
      title: favorite.mediaType === 'movie' ? favorite.title : undefined,
      name: favorite.mediaType === 'tv' ? favorite.title : undefined,
      overview: favorite.overview || '',
      poster_path: null,
      posterUrl: favorite.posterUrl,
      release_date: favorite.mediaType === 'movie' ? favorite.releaseDate || undefined : undefined,
      first_air_date: favorite.mediaType === 'tv' ? favorite.releaseDate || undefined : undefined,
      vote_average: favorite.voteAverage || 0,
      genre_ids: [],
      media_type: favorite.mediaType,
    };

    setSelectedMedia(media);
    if (favorite.mediaType === 'movie') {
      setIsMovieModalOpen(true);
    } else {
      setIsSeriesModalOpen(true);
    }
  };

  const handleQuickDownload = async (favorite: Favorite, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      showNotification('Login Required', 'Please log in to download', 'warning');
      return;
    }

    const mediaId = favorite.tmdbId;
    setDownloading((prev) => new Set(prev).add(mediaId));

    try {
      const year = favorite.releaseDate ? new Date(favorite.releaseDate).getFullYear() : '';

      if (favorite.mediaType === 'movie') {
        // Movie download logic
        const torrentResponse = await axios.get(
          `${API_BASE_URL}/api/TMDB/movie/${favorite.tmdbId}/torrents`,
          {
            params: {
              title: favorite.title,
              year: year,
              categoryIds: '2000',
            },
            timeout: 30000,
          }
        );

        if (!torrentResponse.data.success || torrentResponse.data.results.length === 0) {
          throw new Error(`No torrents found for ${favorite.title}`);
        }

        const bestTorrent = torrentResponse.data.results.reduce((best: any, current: any) => {
          const bestPriority = best.indexerPriority ?? 25;
          const currentPriority = current.indexerPriority ?? 25;
          if (currentPriority < bestPriority) return current;
          if (currentPriority > bestPriority) return best;

          const bestSeeders = best.seeders || 0;
          const currentSeeders = current.seeders || 0;
          return currentSeeders > bestSeeders ? current : best;
        });

        await axios.post(`${API_BASE_URL}/api/MonitoredMovies`, {
          userId: user.id,
          tmdbId: favorite.tmdbId,
          title: favorite.title,
          posterUrl: favorite.posterUrl,
          releaseDate: favorite.releaseDate,
          overview: favorite.overview,
          qualityProfile: "any",
          minAvailability: "released",
          monitor: "movieOnly",
        });

        const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
          downloadUrl: bestTorrent.downloadUrl,
          protocol: bestTorrent.protocol,
        });

        if (downloadResponse.data.success) {
          setDownloadSuccess((prev) => new Set(prev).add(mediaId));
          setTimeout(() => {
            setDownloadSuccess((prev) => {
              const next = new Set(prev);
              next.delete(mediaId);
              return next;
            });
          }, 3000);
        }
      } else {
        // TV series download logic
        showNotification('Series Download', 'Please use the series modal to select specific episodes to download', 'info');
        setDownloading((prev) => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
        return;
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Download failed";
      showNotification('Download Error', errorMsg, 'error');
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
    }
  };

  const renderFavoriteCard = (favorite: Favorite) => {
    const title = favorite.title;
    const year = favorite.releaseDate ? new Date(favorite.releaseDate).getFullYear() : null;
    const posterUrl = favorite.posterUrl;
    const isDownloading = downloading.has(favorite.tmdbId);
    const isDownloaded = downloadSuccess.has(favorite.tmdbId);

    return (
      <div
        key={favorite.id}
        onClick={() => handleMediaClick(favorite)}
        className="cursor-pointer group transition-all duration-300 hover:scale-105 hover:-translate-y-1"
        style={{ height: '100%' }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-secondary/20 hover:border-secondary/60 hover:shadow-2xl hover:shadow-secondary/20 transition-all duration-300">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
              />
            ) : (
            <div className="w-full h-full bg-default-200 flex items-center justify-center">
                {favorite.mediaType === 'movie' ? (
                <Film size={48} className="text-default-400" />
                ) : (
                <Tv size={48} className="text-default-400" />
                )}
              </div>
            )}

          {/* Media Type Badge - Top Left */}
          <div className="absolute top-1 left-1 z-10">
            <Chip 
              size="sm" 
              color="primary" 
              variant="flat" 
              className="text-[10px] sm:text-xs font-bold uppercase backdrop-blur-md px-1 py-0.5"
            >
              {favorite.mediaType === 'movie' ? 'Movie' : 'Series'}
            </Chip>
              </div>

          {/* Rating Badge - Top Right */}
          {favorite.voteAverage && favorite.voteAverage > 0 && (
            <div className="absolute top-1 right-1 z-10 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
              <span className="font-semibold text-white">
                ⭐ {favorite.voteAverage.toFixed(1)}
              </span>
            </div>
          )}

            {/* Unfavorite Button - Bottom Right (left of download) */}
            {user && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavorite(favorite);
                }}
                className="absolute bottom-1 right-10 z-10 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 bg-danger/90 hover:bg-danger"
                title="Remove from Favorites"
              >
                <Heart size={16} className="text-white fill-white" />
              </button>
            )}

            {/* Download Button - Bottom Right */}
            <button
              onClick={(e) => handleQuickDownload(favorite, e)}
              disabled={isDownloading || isDownloaded}
              className={`absolute bottom-1 right-1 z-10 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isDownloaded
                  ? 'bg-success/90 hover:bg-success'
                  : 'bg-secondary/90 hover:bg-secondary'
              } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Quick Download'}
            >
              {isDownloading ? (
                <Spinner size="sm" color="white" className="w-4 h-4" />
              ) : isDownloaded ? (
                <Check size={16} className="text-white" />
              ) : (
                <Download size={16} className="text-white" />
              )}
            </button>

            {/* Title and Year Overlay - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 group-hover:from-black/98 group-hover:via-black/90">
              <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2 mb-0.5">
                {title}
              </h3>
              {year && (
              <p className="text-[10px] sm:text-xs text-white/70">{year}</p>
              )}
            </div>
          </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={() => router.back()}
                  aria-label="Go back"
                  className="flex-shrink-0"
                >
                  <ChevronLeft size={20} />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-danger to-danger-600 bg-clip-text text-transparent truncate flex items-center gap-2">
                    <Heart size={28} className="text-danger fill-danger" />
                    My Favorites
                  </h1>
                  <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                    Your saved movies and series
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <Card className="card-interactive">
              <CardBody className="text-center py-12">
              <Heart size={64} className="mx-auto text-danger/50 mb-4" />
                <p className="text-lg text-default-500">Please log in to view your favorites</p>
              </CardBody>
            </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => router.back()}
                aria-label="Go back"
                className="flex-shrink-0"
              >
                <ChevronLeft size={20} />
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-danger to-danger-600 bg-clip-text text-transparent truncate flex items-center gap-2">
                  <Heart size={28} className="text-danger fill-danger" />
          My Favorites
        </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  {favorites.length} {mediaTypeFilter === 'all' ? 'total' : mediaTypeFilter === 'movie' ? 'movies' : 'series'} in your collection
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
          <Input
              placeholder="Search your favorites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search size={18} className="text-secondary" />}
              className="flex-1"
              size="sm"
              classNames={{
                inputWrapper: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
              }}
            />
            <div className="flex gap-2">
              <Select
                selectedKeys={new Set([mediaTypeFilter])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as 'all' | 'movie' | 'tv';
                  setMediaTypeFilter(selected || 'all');
                }}
                placeholder="All Media"
                className="w-32 sm:w-40"
                size="sm"
                classNames={{
                  trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
              >
                <SelectItem key="all" value="all">All Media</SelectItem>
                <SelectItem key="movie" value="movie">Movies</SelectItem>
                <SelectItem key="tv" value="tv">Series</SelectItem>
              </Select>
              <Select
                selectedKeys={new Set([sortBy])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as 'recent' | 'title' | 'rating';
                  setSortBy(selected || 'recent');
                }}
                placeholder="Sort by"
                className="w-40 sm:w-48"
                size="sm"
                classNames={{
                  trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
              >
                <SelectItem key="recent" value="recent">Recently Added</SelectItem>
                <SelectItem key="title" value="title">Title A-Z</SelectItem>
                <SelectItem key="rating" value="rating">Highest Rated</SelectItem>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
          {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" color="secondary" />
            <p className="mt-4 text-sm text-foreground/60">Loading your favorites...</p>
            </div>
          ) : favorites.length > 0 ? (
            <>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12 5xl:grid-cols-14 gap-2 sm:gap-3 md:gap-4 relative z-0">
                {favorites.map((favorite) => renderFavoriteCard(favorite))}
            </div>

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <Spinner size="md" color="secondary" />
                <span className="ml-2 text-sm text-foreground/60">Loading more...</span>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && favorites.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-foreground/40">You&apos;ve reached the end</p>
                </div>
              )}
            </>
          ) : (
          <Card className="card-interactive border-2 border-secondary/20">
            <CardBody className="text-center py-16 sm:py-20">
              <Heart size={80} className="mx-auto text-danger/30 mb-6" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  {searchQuery.trim() ? 'No favorites match your search' : 'No favorites yet'}
              </h2>
              <p className="text-sm sm:text-base text-foreground/60 max-w-md mx-auto">
                  {searchQuery.trim()
                  ? 'Try a different search term or filter'
                    : 'Browse movies and series, then click the heart icon to add them here!'}
                </p>
              </CardBody>
            </Card>
          )}
      </div>

      {/* Modals */}
      <AddMovieModal
        isOpen={isMovieModalOpen}
        onClose={() => {
          setIsMovieModalOpen(false);
          setSelectedMedia(null);
        }}
        media={selectedMedia}
        onAddMovie={() => fetchFavorites(1, false)}
      />

      <AddSeriesModal
        isOpen={isSeriesModalOpen}
        onClose={() => {
          setIsSeriesModalOpen(false);
          setSelectedMedia(null);
        }}
        media={selectedMedia}
        onAddSeries={() => fetchFavorites(1, false)}
      />

      {/* Notification Modal */}
      <Modal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        size="md"
        classNames={{
          base: "bg-background",
          header: "border-b border-divider",
        }}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              {notificationModal.type === 'success' && <span className="text-2xl">✅</span>}
              {notificationModal.type === 'error' && <span className="text-2xl">❌</span>}
              {notificationModal.type === 'warning' && <span className="text-2xl">⚠️</span>}
              {notificationModal.type === 'info' && <span className="text-2xl">ℹ️</span>}
              <span>{notificationModal.title}</span>
            </div>
          </ModalHeader>
          <ModalBody className="py-6">
            <p className="whitespace-pre-wrap">{notificationModal.message}</p>
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
};

export default FavoritesPage;

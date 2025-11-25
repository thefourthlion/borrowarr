"use client";
import React, { useState, useEffect } from 'react';
import { ArrowRight, Film, Tv, Heart, Download, Check, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@nextui-org/spinner';
import { Chip } from '@nextui-org/chip';
import { Button } from '@nextui-org/button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/modal';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import AddMovieModal from './AddMovieModal';
import AddSeriesModal from './AddSeriesModal';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import "../styles/SideScrollMovieList.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

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
  genre_ids: number[];
  genres?: string[];
  language?: string;
  network?: string;
  number_of_seasons?: number;
  media_type?: 'movie' | 'tv';
}

interface TorrentResult {
  id: string;
  protocol: "torrent" | "nzb";
  title: string;
  indexer: string;
  indexerId: number;
  size: number;
  sizeFormatted: string;
  seeders: number | null;
  leechers: number | null;
  downloadUrl: string;
}

interface SideScrollMovieListProps {
  title: string;
  items: TMDBMedia[];
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  icon?: React.ReactNode;
  categoryPath?: string;
}

const SideScrollMovieList: React.FC<SideScrollMovieListProps> = ({
  title,
  items,
  loading = false,
  loadingMore = false,
  onLoadMore,
  icon,
  categoryPath,
}) => {
  const { user } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  
  // Modal states
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  
  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set());
  
  // Hidden media state
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [hidingIds, setHidingIds] = useState<Set<number>>(new Set());
  
  // Download state
  const [downloading, setDownloading] = useState<Set<number>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<number>>(new Set());
  
  // Notification modal
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
    setNotificationModal({ isOpen: true, title, message, type });
  };

  const closeNotification = () => {
    setNotificationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Fetch favorites on mount
  useEffect(() => {
    if (user) {
      fetchFavorites();
      fetchHiddenMedia();
    }
  }, [user]);

  // Update scroll buttons and handle infinite scroll when API changes
  useEffect(() => {
    if (!api) return;

    const updateScrollButtons = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
      
      // Check if near the end for infinite scroll
      if (onLoadMore && !loadingMore && !hasLoadedMore) {
        const scrollProgress = api.scrollProgress();
        // Load more when scrolled 80% through
        if (scrollProgress > 0.8) {
          setHasLoadedMore(true);
          onLoadMore();
        }
      }
    };

    updateScrollButtons();
    api.on('select', updateScrollButtons);
    api.on('scroll', updateScrollButtons);
    api.on('reInit', updateScrollButtons);

    return () => {
      api.off('select', updateScrollButtons);
      api.off('scroll', updateScrollButtons);
      api.off('reInit', updateScrollButtons);
    };
  }, [api, onLoadMore, loadingMore, hasLoadedMore]);

  // Reset hasLoadedMore when items length changes (new items loaded)
  useEffect(() => {
    if (items.length > 0) {
      setHasLoadedMore(false);
    }
  }, [items.length]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/Favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.favorites) {
        const ids = new Set<string>(
          response.data.favorites.map((fav: any) => `${fav.tmdbId}-${fav.mediaType}`)
        );
        setFavoriteIds(ids);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchHiddenMedia = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/HiddenMedia`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.hiddenIds) {
        // Combine both movies and series hidden IDs
        const allHiddenIds = [
          ...response.data.hiddenIds.movies,
          ...response.data.hiddenIds.series
        ];
        setHiddenIds(new Set(allHiddenIds));
      }
    } catch (error) {
      console.error("Error fetching hidden media:", error);
    }
  };

  const handleMediaClick = (item: TMDBMedia) => {
    const isTV = item.media_type === 'tv' || !!item.first_air_date || !!item.name;
    const mediaWithPosterUrl = {
      ...item,
      posterUrl: item.posterUrl || (item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null),
    };
    
    setSelectedMedia(mediaWithPosterUrl);
    
    if (isTV) {
      setIsSeriesModalOpen(true);
    } else {
      setIsMovieModalOpen(true);
    }
  };

  const closeModals = () => {
    setIsMovieModalOpen(false);
    setIsSeriesModalOpen(false);
    setSelectedMedia(null);
  };

  const handleQuickDownload = async (item: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      showNotification('Login Required', 'Please log in to download', 'warning');
      return;
    }

    const isTV = item.media_type === 'tv' || !!item.first_air_date || !!item.name;
    if (isTV) {
      showNotification('Not Supported', 'Quick download is not supported for TV shows. Please use the modal to select episodes.', 'info');
      return;
    }

    const movieId = item.id;
    setDownloading((prev) => new Set(prev).add(movieId));

    try {
      const title = item.title || item.name || '';
      const year = item.release_date ? new Date(item.release_date).getFullYear() : '';

      // Fetch torrents
      const torrentResponse = await axios.get(
        `${API_BASE_URL}/api/TMDB/movie/${item.id}/torrents`,
        {
          params: { title, year, categoryIds: '2000' },
          timeout: 30000,
        }
      );

      if (!torrentResponse.data.success || torrentResponse.data.results.length === 0) {
        throw new Error("No torrents found");
      }

      const bestTorrent = torrentResponse.data.results.reduce((best: TorrentResult, current: TorrentResult) => {
        const bestPriority = (best as any).indexerPriority ?? 25;
        const currentPriority = (current as any).indexerPriority ?? 25;
        if (currentPriority < bestPriority) return current;
        if (currentPriority > bestPriority) return best;
        
        const bestSeeders = best.seeders || 0;
        const currentSeeders = current.seeders || 0;
        return currentSeeders > bestSeeders ? current : best;
      });

      const posterUrl = item.poster_path 
        ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` 
        : (item.posterUrl || null);

      // Save to monitored movies
      await axios.post(`${API_BASE_URL}/api/MonitoredMovies`, {
        userId: user.id,
        tmdbId: item.id,
        title: title,
        posterUrl,
        releaseDate: item.release_date || null,
        overview: item.overview,
        qualityProfile: "any",
        minAvailability: "released",
        monitor: "movieOnly",
      });

      // Extract quality
      const titleLower = bestTorrent.title.toLowerCase();
      let quality = 'SD';
      if (titleLower.includes('2160p') || titleLower.includes('4k')) quality = '2160p';
      else if (titleLower.includes('1080p')) quality = '1080p';
      else if (titleLower.includes('720p')) quality = '720p';

      // Download the torrent with history
      const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
        downloadUrl: bestTorrent.downloadUrl,
        protocol: bestTorrent.protocol,
        releaseName: bestTorrent.title,
        indexer: bestTorrent.indexer,
        indexerId: bestTorrent.indexerId,
        size: bestTorrent.size,
        sizeFormatted: bestTorrent.sizeFormatted,
        seeders: bestTorrent.seeders,
        leechers: bestTorrent.leechers,
        quality: quality,
        source: 'DiscoverQuickDownload',
        mediaType: 'movie',
        mediaTitle: title,
        tmdbId: item.id,
      });

      if (downloadResponse.data.success) {
        setDownloadSuccess((prev) => new Set(prev).add(movieId));
        showNotification('Download Started', `Downloading: ${bestTorrent.title}`, 'success');
        setTimeout(() => {
          setDownloadSuccess((prev) => {
            const next = new Set(prev);
            next.delete(movieId);
            return next;
          });
        }, 3000);
      } else {
        throw new Error(downloadResponse.data.error || "Failed to download");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Download failed";
      showNotification('Download Error', errorMsg, 'error');
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(movieId);
        return next;
      });
    }
  };

  const toggleFavorite = async (item: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      showNotification('Login Required', 'Please log in to add favorites', 'warning');
      return;
    }

    const isTV = item.media_type === 'tv' || !!item.first_air_date || !!item.name;
    const mediaType = isTV ? 'tv' : 'movie';
    const favoriteKey = `${item.id}-${mediaType}`;
    const isFavorited = favoriteIds.has(favoriteKey);
    
    setFavoritingIds((prev) => new Set(prev).add(item.id));

    try {
      const token = localStorage.getItem("token");
      
      if (isFavorited) {
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { tmdbId: item.id, mediaType },
        });
        
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(favoriteKey);
          return next;
        });
      } else {
        const posterUrl = item.poster_path 
          ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` 
          : (item.posterUrl || null);

        await axios.post(
          `${API_BASE_URL}/api/Favorites`,
          {
            tmdbId: item.id,
            mediaType,
            title: item.title || item.name || '',
            posterUrl,
            overview: item.overview,
            releaseDate: isTV ? item.first_air_date : item.release_date,
            voteAverage: item.vote_average,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setFavoriteIds((prev) => new Set(prev).add(favoriteKey));
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to update favorite";
      showNotification('Error', errorMsg, 'error');
    } finally {
      setFavoritingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const toggleHidden = async (item: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      showNotification('Login Required', 'Please log in to hide content', 'warning');
      return;
    }

    const isTV = item.media_type === 'tv' || !!item.first_air_date || !!item.name;
    const mediaType = isTV ? 'series' : 'movie';
    const isHidden = hiddenIds.has(item.id);
    
    setHidingIds((prev) => new Set(prev).add(item.id));

    try {
      const token = localStorage.getItem("token");
      
      if (isHidden) {
        // Unhide
        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia/unhide`,
          {
            tmdbId: item.id,
            mediaType,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else {
        // Hide
        const posterPath = item.poster_path || null;

        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia/hide`,
          {
            tmdbId: item.id,
            mediaType,
            title: item.title || item.name || '',
            posterPath,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setHiddenIds((prev) => new Set(prev).add(item.id));
      }
    } catch (error: any) {
      console.error('Error toggling hidden:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to update hidden status";
      showNotification('Error', errorMsg, 'error');
    } finally {
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const getMediaTitle = (item: TMDBMedia) => item.title || item.name || 'Unknown';
  const getMediaYear = (item: TMDBMedia) => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : '';
  };

  const renderMediaCard = (item: TMDBMedia) => {
    const title = getMediaTitle(item);
    const posterUrl = item.posterUrl || (item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null);
    const isTV = item.media_type === 'tv' || !!item.first_air_date || !!item.name;
    const isDownloading = downloading.has(item.id);
    const isDownloaded = downloadSuccess.has(item.id);
    const isFavorited = favoriteIds.has(`${item.id}-${isTV ? 'tv' : 'movie'}`);
    const isFavoriting = favoritingIds.has(item.id);
    const isHidden = hiddenIds.has(item.id);
    const isHiding = hidingIds.has(item.id);

    return (
      <div
        onClick={() => handleMediaClick(item)}
        className="cursor-pointer group transition-all duration-300"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-secondary/20 hover:border-secondary/60 hover:shadow-2xl hover:shadow-secondary/20 transition-all duration-300">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-default-200 flex items-center justify-center">
              {isTV ? <Tv size={48} className="text-default-400" /> : <Film size={48} className="text-default-400" />}
            </div>
          )}
          
          {/* Media Type Badge - Top Left */}
          <div className="absolute top-1 left-1 z-10">
            <Chip 
              size="sm" 
              color={isTV ? "primary" : "secondary"}
              variant="flat" 
              className="text-[10px] sm:text-xs font-bold uppercase backdrop-blur-md px-1 py-0.5"
            >
              {isTV ? 'TV' : 'Movie'}
            </Chip>
          </div>

          {/* Rating Badge - Top Right */}
          {item.vote_average > 0 && (
            <div className="absolute top-1 right-1 z-10 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
              <span className="font-semibold text-white">
                ⭐ {item.vote_average.toFixed(1)}
              </span>
            </div>
          )}

          {/* Hide Button - Bottom Right (left of favorite) */}
          {user && (
            <button
              onClick={(e) => toggleHidden(item, e)}
              disabled={isHiding}
              className={`absolute bottom-1 right-[4.5rem] z-10 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isHidden
                  ? 'bg-warning/90 hover:bg-warning'
                  : 'bg-default-500/60 hover:bg-default-500/80'
              } ${isHiding ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isHidden ? 'Unhide' : 'Hide (never show again)'}
            >
              {isHiding ? (
                <Spinner size="sm" color="white" className="w-4 h-4" />
              ) : isHidden ? (
                <EyeOff 
                  size={16} 
                  className="text-white" 
                />
              ) : (
                <Eye 
                  size={16} 
                  className="text-white" 
                />
              )}
            </button>
          )}

          {/* Favorite Button - Bottom Right (left of download) */}
          {user && (
            <button
              onClick={(e) => toggleFavorite(item, e)}
              disabled={isFavoriting}
              className={`absolute bottom-1 right-10 z-10 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isFavorited
                  ? 'bg-danger/90 hover:bg-danger'
                  : 'bg-secondary/60 hover:bg-secondary/80'
              } ${isFavoriting ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              {isFavoriting ? (
                <Spinner size="sm" color="white" className="w-4 h-4" />
              ) : (
                <Heart 
                  size={16} 
                  className={`text-white ${isFavorited ? 'fill-white' : ''}`}
                />
              )}
            </button>
          )}

          {/* Download Button - Bottom Right */}
          {user && !isTV && (
            <button
              onClick={(e) => handleQuickDownload(item, e)}
              disabled={isDownloading || isDownloaded}
              className={`absolute bottom-1 right-1 z-10 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isDownloaded
                  ? 'bg-success/90'
                  : 'bg-primary/60 hover:bg-primary/80'
              } ${isDownloading || isDownloaded ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isDownloaded ? 'Downloaded' : 'Quick Download'}
            >
              {isDownloading ? (
                <Spinner size="sm" color="white" className="w-4 h-4" />
              ) : isDownloaded ? (
                <Check size={16} className="text-white" />
              ) : (
                <Download size={16} className="text-white" />
              )}
            </button>
          )}

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-semibold text-sm line-clamp-2" title={title}>
              {title}
            </h3>
            {getMediaYear(item) && (
              <p className="text-white/70 text-xs mt-1">{getMediaYear(item)}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="side-scroll-movie-list w-full py-1">
        <div className="container max-w-[2400px] mx-auto px-2 sm:px-3">
          {/* Header */}
          <div className="mb-3 sm:mb-4 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                {icon && <div className="flex-shrink-0">{icon}</div>}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-left">{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Carousel Navigation Arrows */}
                {!loading && items.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      className="bg-default-100 hover:bg-default-200 transition-all min-w-9 h-9 rounded-full"
                      onPress={() => api?.scrollPrev()}
                      isDisabled={!canScrollPrev}
                    >
                      <ArrowRight size={18} className="rotate-180" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      className="bg-default-100 hover:bg-default-200 transition-all min-w-9 h-9 rounded-full"
                      onPress={() => api?.scrollNext()}
                      isDisabled={!canScrollNext}
                    >
                      <ArrowRight size={18} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" color="secondary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-default-500">No items to display</p>
            </div>
          ) : (
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                  skipSnaps: false,
                  dragFree: true,
                }}
                setApi={setApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 sm:-ml-3">
                  {items.filter(item => !hiddenIds.has(item.id)).map((item) => (
                    <CarouselItem 
                      key={`${item.media_type || 'movie'}-${item.id}`}
                      className="pl-2 sm:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-1/7 3xl:basis-1/8 4xl:basis-1/10 5xl:basis-1/12"
                      style={{ flexBasis: `clamp(160px, ${100 / Math.min(items.length, 12)}%, 280px)` }}
                    >
                      {renderMediaCard(item)}
                    </CarouselItem>
                  ))}
                  
                  {/* Loading More Indicator */}
                  {loadingMore && (
                    <CarouselItem className="pl-2 sm:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-1/7 3xl:basis-1/8 4xl:basis-1/10 5xl:basis-1/12">
                      <div className="flex items-center justify-center h-full min-h-[300px]">
                        <Spinner size="lg" color="secondary" />
                      </div>
                    </CarouselItem>
                  )}
                </CarouselContent>
              </Carousel>
            </div>
          )}
        </div>
      </div>

      {/* Movie Modal */}
      {selectedMedia && !isSeriesModalOpen && (
        <AddMovieModal
          isOpen={isMovieModalOpen}
          onClose={closeModals}
          media={selectedMedia}
          onAddMovie={() => {
            closeModals();
            fetchFavorites();
          }}
        />
      )}

      {/* Series Modal */}
      {selectedMedia && !isMovieModalOpen && (
        <AddSeriesModal
          isOpen={isSeriesModalOpen}
          onClose={closeModals}
          media={selectedMedia}
          onAddSeries={() => {
            closeModals();
            fetchFavorites();
          }}
        />
      )}

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
    </>
  );
};

export default SideScrollMovieList;

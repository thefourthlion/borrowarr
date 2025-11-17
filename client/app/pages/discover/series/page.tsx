"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Tv,
  ChevronLeft,
  Search,
  Filter,
  X,
  Calendar,
  Download,
  Check,
  Heart,
} from "lucide-react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import AddSeriesModal from "@/components/AddSeriesModal";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

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

interface Genre {
  id: number;
  name: string;
}

const SeriesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [media, setMedia] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  
  // Download state
  const [downloading, setDownloading] = useState<Set<number>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<number>>(new Set());
  
  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set());
  
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
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Handle URL query parameters
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const urlType = searchParams.get('type'); // 'all', 'tv', or undefined (defaults to 'tv')
    const urlIndexerId = searchParams.get('indexerId');
    const urlGenres = searchParams.get('genres');
    const urlNetwork = searchParams.get('network');
    const urlSortBy = searchParams.get('sortBy');
    const urlId = searchParams.get('id'); // Single series ID to show modal
    
    if (urlQuery) {
      setSearchQuery(urlQuery);
    }
    if (urlIndexerId) {
      setSelectedIndexer(urlIndexerId);
    } else {
      setSelectedIndexer("all");
    }
    if (urlGenres) {
      // Support comma-separated genre IDs
      const genreIds = urlGenres.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      setSelectedGenres(new Set(genreIds));
    }
    if (urlNetwork) {
      // Store network ID to filter by (we'll need to handle this in the API call)
      // For now, we can add it to keywords or create a separate state
      setKeywords(urlNetwork); // Temporary solution
    }
    if (urlSortBy) {
      setSortBy(urlSortBy);
    }
    if (urlId) {
      // If a specific series ID is provided, open the modal for that series
      const seriesId = parseInt(urlId, 10);
      if (!isNaN(seriesId)) {
        // Fetch and open modal for this series
        axios.get(`${API_BASE_URL}/api/TMDB/tv/${seriesId}`)
          .then(res => {
            if (res.data.success && res.data.tv) {
              setSelectedMedia(res.data.tv);
              setIsModalOpen(true);
            }
          })
          .catch(err => console.error('Error fetching series:', err));
      }
    }
  }, [searchParams]);
  
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  
  // Filter values
  const [firstAirDateFrom, setFirstAirDateFrom] = useState("");
  const [firstAirDateTo, setFirstAirDateTo] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Set<number>>(new Set());
  const [keywords, setKeywords] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("all");
  const [runtimeMin, setRuntimeMin] = useState("");
  const [runtimeMax, setRuntimeMax] = useState("");
  const [voteAverageMin, setVoteAverageMin] = useState("");
  const [voteAverageMax, setVoteAverageMax] = useState("");
  const [voteCountMin, setVoteCountMin] = useState("");
  const [watchRegion, setWatchRegion] = useState("US");
  const [selectedProviders, setSelectedProviders] = useState<Set<number>>(new Set());
  
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [watchProviders, setWatchProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [indexers, setIndexers] = useState<any[]>([]);
  const [selectedIndexer, setSelectedIndexer] = useState<string>("all");

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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

  // Fetch genres
  useEffect(() => {
    setLoadingGenres(true);
    axios.get(`${API_BASE_URL}/api/TMDB/genres`, { params: { type: "tv" } })
      .then((response) => {
        if (response.data.success) {
          setGenres(response.data.genres || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching genres:", error);
      })
      .finally(() => {
        setLoadingGenres(false);
      });
  }, []);

  // Fetch watch providers
  useEffect(() => {
    setLoadingProviders(true);
    axios.get(`${API_BASE_URL}/api/TMDB/watch/providers`, { params: { region: watchRegion, type: 'tv' } })
      .then((response) => {
        if (response.data.success) {
          setWatchProviders(response.data.providers || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching watch providers:", error);
      })
      .finally(() => {
        setLoadingProviders(false);
      });
  }, [watchRegion]);

  // Fetch indexers (only when user is authenticated)
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_BASE_URL}/api/Indexers/read`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.data.data) {
          setIndexers(response.data.data.filter((idx: any) => idx.enabled) || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching indexers:", error);
      });
  }, [user]);

  // Fetch favorites
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      axios.get(`${API_BASE_URL}/api/Favorites/ids?mediaType=tv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (response.data.success && response.data.favoriteIds) {
            setFavoriteIds(new Set(response.data.favoriteIds));
          }
        })
        .catch((error) => {
          console.error("Error fetching favorites:", error);
        });
    }
  }, [user]);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (firstAirDateFrom) count++;
    if (firstAirDateTo) count++;
    if (selectedGenres.size > 0) count++;
    if (keywords.trim()) count++;
    if (originalLanguage !== "all") count++;
    if (runtimeMin) count++;
    if (runtimeMax) count++;
    if (voteAverageMin) count++;
    if (voteAverageMax) count++;
    if (voteCountMin) count++;
    if (selectedProviders.size > 0) count++;
    setActiveFilters(count);
  }, [firstAirDateFrom, firstAirDateTo, selectedGenres, keywords, originalLanguage, runtimeMin, runtimeMax, voteAverageMin, voteAverageMax, voteCountMin, selectedProviders]);

  // Fetch series
  const fetchSeries = useCallback(async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
    setLoading(true);
    }
    try {
      let endpoint: string;
      const params: any = { page };

      // If searching, use search endpoint
      if (debouncedSearchQuery.trim()) {
        endpoint = `${API_BASE_URL}/api/TMDB/search`;
        params.query = debouncedSearchQuery.trim();
        // Get search type from URL or default to 'tv' for series page
        const urlType = searchParams.get('type');
        params.type = urlType === 'all' ? 'both' : 'tv';
        // Add indexer filter if selected
        if (selectedIndexer !== "all") {
          params.indexerIds = selectedIndexer;
        }
      } else {
        // Use discover endpoint with all filters
        endpoint = `${API_BASE_URL}/api/TMDB/discover/tv`;
        
        // Add all filter parameters
        params.sortBy = sortBy;
        if (firstAirDateFrom) params.firstAirDateFrom = firstAirDateFrom;
        if (firstAirDateTo) params.firstAirDateTo = firstAirDateTo;
        if (selectedGenres.size > 0) {
          params.genres = Array.from(selectedGenres).join(',');
        }
        if (originalLanguage !== "all") {
          params.originalLanguage = originalLanguage;
        }
        if (runtimeMin) params.runtimeMin = runtimeMin;
        if (runtimeMax) params.runtimeMax = runtimeMax;
        if (voteAverageMin) params.voteAverageMin = voteAverageMin;
        if (voteAverageMax) params.voteAverageMax = voteAverageMax;
        if (voteCountMin) params.voteCountMin = voteCountMin;
        if (keywords.trim()) params.keywords = keywords.trim();
        if (selectedProviders.size > 0) {
          params.watchProviders = Array.from(selectedProviders).join(',');
          params.watchRegion = watchRegion;
        }
      }

      const response = await axios.get(endpoint, { params });
      if (response.data.success) {
        const results = response.data.results || [];
        
        if (append) {
          setMedia(prev => {
            // Create a Map to deduplicate by item.id
            const existingIds = new Set(prev.map((item: TMDBMedia) => item.id));
            const newResults = results.filter((item: TMDBMedia) => !existingIds.has(item.id));
            return [...prev, ...newResults];
            });
        } else {
        setMedia(results);
        }
        setTotalPages(response.data.totalPages || 1);
        setTotalResults(response.data.totalResults || 0);
        setCurrentPage(page);
        setHasMore(page < (response.data.totalPages || 1));
      }
    } catch (error) {
      console.error("Error fetching series:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearchQuery, sortBy, firstAirDateFrom, firstAirDateTo, selectedGenres, originalLanguage, runtimeMin, runtimeMax, voteAverageMin, voteAverageMax, voteCountMin, keywords, watchRegion, selectedProviders, searchParams, selectedIndexer]);

  useEffect(() => {
    setMedia([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchSeries(1, false);
  }, [fetchSeries]);

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
          fetchSeries(nextPage, true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, totalPages, hasMore, loading, loadingMore, fetchSeries]);

  const getMediaTitle = (item: TMDBMedia) => {
    return item.title || item.name || 'Unknown';
  };

  const handleMediaClick = (item: TMDBMedia) => {
    setSelectedMedia(item);
    setIsModalOpen(true);
  };

  const handleQuickDownload = async (item: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      showNotification('Login Required', 'Please log in to download series', 'warning');
      return;
    }

    const seriesId = item.id;
    setDownloading((prev) => new Set(prev).add(seriesId));

    try {
      const title = item.name || item.title || '';
      const year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : '';

      // Get TV show details including all seasons
      const tvDetailsResponse = await axios.get(`${API_BASE_URL}/api/TMDB/tv/${item.id}`);
      if (!tvDetailsResponse.data.success) {
        throw new Error("Failed to fetch TV show details");
      }

      const tvDetails = tvDetailsResponse.data.tv;
      const numberOfSeasons = tvDetails.number_of_seasons || 0;

      // Fetch all seasons with episodes
      const seasonPromises = [];
      for (let i = 1; i <= numberOfSeasons; i++) {
        seasonPromises.push(
          axios.get(`${API_BASE_URL}/api/TMDB/tv/${item.id}/season/${i}`)
            .then(res => res.data.success ? res.data.season : null)
            .catch(() => null)
        );
      }

      const seasons = (await Promise.all(seasonPromises)).filter(s => s !== null);

      // Collect all season numbers and episode keys
      const allSeasonNumbers = seasons.map(s => s.season_number);
      const allEpisodes: string[] = [];
      seasons.forEach(season => {
        if (season.episodes) {
          season.episodes.forEach((ep: any) => {
            allEpisodes.push(`${season.season_number}-${ep.episode_number}`);
          });
        }
      });

      // Save series to monitored list
      const posterUrl = item.poster_path 
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
        : (item.posterUrl || null);

      const saveSeriesResponse = await axios.post(`${API_BASE_URL}/api/MonitoredSeries`, {
        userId: user.id,
        tmdbId: item.id,
        title: title,
        posterUrl,
        firstAirDate: item.first_air_date || null,
        overview: item.overview,
        qualityProfile: "any",
        minAvailability: "released",
        monitor: "all",
        selectedSeasons: allSeasonNumbers,
        selectedEpisodes: allEpisodes,
      });

      // Download each episode
      let successCount = 0;
      let failCount = 0;

      for (const season of seasons) {
        if (!season.episodes) continue;

        for (const episode of season.episodes) {
          try {
            // Search for torrents for this episode
            const torrentResponse = await axios.get(
              `${API_BASE_URL}/api/TMDB/tv/${item.id}/torrents`,
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
      if (saveSeriesResponse.data.series?.id && successCount > 0) {
        try {
          await axios.put(`${API_BASE_URL}/api/MonitoredSeries/${saveSeriesResponse.data.series.id}`, {
            status: "downloading",
          });
        } catch (error) {
          console.error("Error updating series status:", error);
        }
      }

      setDownloadSuccess((prev) => new Set(prev).add(seriesId));
      showNotification(
        'Series Added',
        `Series added to monitoring!\n\nSuccessfully queued: ${successCount} episodes\nFailed: ${failCount} episodes`,
        successCount > 0 ? 'success' : 'warning'
      );
      
      setTimeout(() => {
        setDownloadSuccess((prev) => {
          const next = new Set(prev);
          next.delete(seriesId);
          return next;
        });
      }, 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Download failed";
      showNotification('Download Error', errorMsg, 'error');
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(seriesId);
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

    const favoriteKey = `${item.id}-tv`;
    const isFavorited = favoriteIds.has(favoriteKey);
    
    setFavoritingIds((prev) => new Set(prev).add(item.id));

    try {
      const token = localStorage.getItem("token");
      
      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            tmdbId: item.id,
            mediaType: 'tv',
          },
        });
        
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(favoriteKey);
          return next;
        });
      } else {
        // Add to favorites
        const posterUrl = item.poster_path 
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
          : (item.posterUrl || null);

        const response = await axios.post(
          `${API_BASE_URL}/api/Favorites`,
          {
            tmdbId: item.id,
            mediaType: 'tv',
            title: item.name || item.title || '',
            posterUrl,
            overview: item.overview,
            releaseDate: item.first_air_date,
            voteAverage: item.vote_average,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        console.log('Favorite added successfully:', response.data);
        setFavoriteIds((prev) => new Set(prev).add(favoriteKey));
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || "Failed to update favorite";
      const errorDetails = error.response?.data?.details ? ` (${error.response.data.details})` : '';
      showNotification('Error', `${errorMsg}${errorDetails}`, 'error');
    } finally {
      setFavoritingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const clearFilters = () => {
    setFirstAirDateFrom("");
    setFirstAirDateTo("");
    setSelectedGenres(new Set());
    setKeywords("");
    setOriginalLanguage("all");
    setRuntimeMin("");
    setRuntimeMax("");
    setVoteAverageMin("");
    setVoteAverageMax("");
    setVoteCountMin("");
    setSelectedProviders(new Set());
  };

  const toggleProvider = (providerId: number) => {
    setSelectedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  const renderMediaCard = (item: TMDBMedia) => {
    const title = getMediaTitle(item);
    const year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : null;
    const posterUrl = item.posterUrl || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null);
    const isDownloading = downloading.has(item.id);
    const isDownloaded = downloadSuccess.has(item.id);
    const isFavorited = favoriteIds.has(`${item.id}-tv`);
    const isFavoriting = favoritingIds.has(item.id);

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
                alt={title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-default-200 flex items-center justify-center">
                <Tv size={48} className="text-default-400" />
              </div>
            )}
          
          {/* Media Type Badge - Top Left */}
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-10">
            <Chip 
              size="sm" 
              color="secondary" 
              variant="flat" 
              className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase backdrop-blur-md px-0.5 sm:px-1 py-0.5 h-4 sm:h-5"
            >
                Series
              </Chip>
          </div>

          {/* Rating Badge - Top Right */}
          {item.vote_average > 0 && (
            <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 bg-black/85 backdrop-blur-md px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] md:text-xs">
              <span className="font-semibold text-white">
                ⭐ {item.vote_average.toFixed(1)}
              </span>
            </div>
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
            title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Quick Download All Seasons'}
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
              {title}
            </h3>
            {year && (
              <p className="text-[9px] sm:text-[10px] md:text-xs text-white/70">{year}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

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
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                  {searchQuery ? (
                    <>
                      Search: &quot;{searchQuery}&quot;
                      {searchParams.get('type') === 'all' && ' (All Media)'}
                    </>
                  ) : (
                    'Series'
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Discover and explore TV series
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
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Search Movies & TV"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search size={18} className="text-secondary" />}
                className="flex-1"
                size="sm"
                classNames={{
                  inputWrapper: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
              />
              {indexers.length > 0 && (
                <Select
                  aria-label="Select indexer"
                  selectedKeys={new Set([selectedIndexer])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setSelectedIndexer(selected || "all");
                  }}
                  placeholder="All Indexers"
                  className="w-32 flex-shrink-0"
                  size="sm"
                  classNames={{
                    trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                  }}
                  items={[{ id: 'all', name: 'All Indexers' }, ...indexers]}
                >
                  {(indexer: any) => (
                    <SelectItem key={indexer.id.toString()} value={indexer.id.toString()}>
                      {indexer.name}
                    </SelectItem>
                  )}
                </Select>
              )}
            </div>
            <div className="flex gap-2">
              <Select
                aria-label="Sort series"
                selectedKeys={new Set([sortBy])}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setSortBy(selected || "popularity.desc");
                }}
                placeholder="Sort by"
                className="w-40 sm:w-48"
                size="sm"
                classNames={{
                  trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
              >
                <SelectItem key="popularity.desc" value="popularity.desc">Popularity Descending</SelectItem>
                <SelectItem key="popularity.asc" value="popularity.asc">Popularity Ascending</SelectItem>
                <SelectItem key="vote_average.desc" value="vote_average.desc">Rating Descending</SelectItem>
                <SelectItem key="first_air_date.desc" value="first_air_date.desc">First Air Date Descending</SelectItem>
                <SelectItem key="first_air_date.asc" value="first_air_date.asc">First Air Date Ascending</SelectItem>
              </Select>
              <Button
                variant={activeFilters > 0 ? "solid" : "bordered"}
                color={activeFilters > 0 ? "secondary" : "default"}
                startContent={<Filter size={18} />}
                onPress={() => setFiltersOpen(!filtersOpen)}
                size="sm"
                className={activeFilters > 0 ? "btn-glow" : "border-2 border-secondary/20 hover:border-secondary/40"}
              >
                <span className="hidden sm:inline">{activeFilters} Active</span>
                <span className="sm:hidden">{activeFilters}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <Card className="mb-6 card-interactive border-2 border-secondary/20 relative z-50">
            <CardBody className="p-4 sm:p-6 relative z-50">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  Filters
                </h2>
                <div className="flex gap-2">
                  {activeFilters > 0 && (
                    <Button
                      size="sm"
                      variant="light"
                      color="secondary"
                      startContent={<X size={16} />}
                      onPress={clearFilters}
                      className="text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Clear All</span>
                      <span className="sm:hidden">Clear</span>
                    </Button>
                  )}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setFiltersOpen(false)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* First Air Date */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">First Air Date</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={firstAirDateFrom}
                      onChange={(e) => setFirstAirDateFrom(e.target.value)}
                      size="sm"
                      startContent={<Calendar size={16} className="text-secondary" />}
                      classNames={{
                        inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={firstAirDateTo}
                      onChange={(e) => setFirstAirDateTo(e.target.value)}
                      size="sm"
                      classNames={{
                        inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                    />
                  </div>
                </div>

                {/* Genres */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Genres</label>
                  <Select
                    aria-label="Filter by genres"
                    selectedKeys={selectedGenres}
                    onSelectionChange={(keys) => setSelectedGenres(new Set(Array.from(keys).map(k => parseInt(k as string))))}
                    selectionMode="multiple"
                    placeholder="Select genres"
                    size="sm"
                    classNames={{
                      trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                  >
                    {genres.map((genre) => (
                      <SelectItem key={genre.id.toString()} value={genre.id.toString()}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Keywords</label>
                  <Input
                    placeholder="Search keywords…"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    size="sm"
                    startContent={<Search size={16} className="text-secondary" />}
                    classNames={{
                      inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                  />
                </div>

                {/* Original Language */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Original Language</label>
                  <Select
                    aria-label="Filter by original language"
                    selectedKeys={new Set([originalLanguage])}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setOriginalLanguage(selected || "all");
                    }}
                    size="sm"
                    classNames={{
                      trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                  >
                    <SelectItem key="all" value="all">Default (All Languages)</SelectItem>
                    <SelectItem key="en" value="en">English</SelectItem>
                    <SelectItem key="es" value="es">Spanish</SelectItem>
                    <SelectItem key="fr" value="fr">French</SelectItem>
                    <SelectItem key="de" value="de">German</SelectItem>
                    <SelectItem key="ja" value="ja">Japanese</SelectItem>
                    <SelectItem key="ko" value="ko">Korean</SelectItem>
                    <SelectItem key="zh" value="zh">Chinese</SelectItem>
                  </Select>
                </div>

                {/* Runtime */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Runtime (minutes)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={runtimeMin}
                      onChange={(e) => setRuntimeMin(e.target.value)}
                      size="sm"
                      classNames={{
                        inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={runtimeMax}
                      onChange={(e) => setRuntimeMax(e.target.value)}
                      size="sm"
                      classNames={{
                        inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                    />
                  </div>
                </div>

                {/* TMDB User Score */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">TMDB User Score</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      min="1"
                      max="10"
                      step="0.1"
                      value={voteAverageMin}
                      onChange={(e) => setVoteAverageMin(e.target.value)}
                      size="sm"
                      classNames={{
                        inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      min="1"
                      max="10"
                      step="0.1"
                      value={voteAverageMax}
                      onChange={(e) => setVoteAverageMax(e.target.value)}
                      size="sm"
                      classNames={{
                        inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                    />
                  </div>
                </div>

                {/* TMDB User Vote Count */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">TMDB User Vote Count</label>
                  <Input
                    type="number"
                    placeholder="Minimum votes"
                    value={voteCountMin}
                    onChange={(e) => setVoteCountMin(e.target.value)}
                    size="sm"
                    classNames={{
                      inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                  />
                </div>
              </div>

              {/* Streaming Services */}
              <div className="mt-4 sm:mt-6 space-y-3 border-t border-secondary/20 pt-4 sm:pt-6">
                <label className="text-xs sm:text-sm font-medium text-foreground">Streaming Services</label>
                
                <Select
                  selectedKeys={new Set([watchRegion])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setWatchRegion(selected || "US");
                    setSelectedProviders(new Set());
                  }}
                  size="sm"
                  className="w-full max-w-xs"
                  startContent={
                    <span className="text-lg">
                      {watchRegion === "US" ? "🇺🇸" :
                       watchRegion === "GB" ? "🇬🇧" :
                       watchRegion === "CA" ? "🇨🇦" :
                       watchRegion === "AU" ? "🇦🇺" :
                       watchRegion === "DE" ? "🇩🇪" :
                       watchRegion === "FR" ? "🇫🇷" :
                       watchRegion === "ES" ? "🇪🇸" :
                       watchRegion === "IT" ? "🇮🇹" :
                       watchRegion === "JP" ? "🇯🇵" :
                       watchRegion === "KR" ? "🇰🇷" : "🌍"}
                    </span>
                  }
                  classNames={{
                    trigger: "bg-content2 border border-secondary/20 hover:border-secondary/40",
                  }}
                >
                  <SelectItem key="US" value="US">🇺🇸 United States</SelectItem>
                  <SelectItem key="GB" value="GB">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem key="CA" value="CA">🇨🇦 Canada</SelectItem>
                  <SelectItem key="AU" value="AU">🇦🇺 Australia</SelectItem>
                  <SelectItem key="DE" value="DE">🇩🇪 Germany</SelectItem>
                  <SelectItem key="FR" value="FR">🇫🇷 France</SelectItem>
                  <SelectItem key="ES" value="ES">🇪🇸 Spain</SelectItem>
                  <SelectItem key="IT" value="IT">🇮🇹 Italy</SelectItem>
                  <SelectItem key="JP" value="JP">🇯🇵 Japan</SelectItem>
                  <SelectItem key="KR" value="KR">🇰🇷 South Korea</SelectItem>
                </Select>

                {loadingProviders ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : watchProviders.length > 0 ? (
                  <div className="overflow-x-auto pb-2 -mx-2 px-2">
                    <div className="flex gap-3 min-w-max">
                      {watchProviders.map((provider: any) => (
                        <button
                          key={provider.provider_id}
                          onClick={() => toggleProvider(provider.provider_id)}
                          className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                            selectedProviders.has(provider.provider_id)
                              ? 'border-secondary shadow-lg ring-2 ring-secondary ring-offset-2 bg-secondary/10'
                              : 'border-secondary/20 hover:border-secondary/40 bg-content2'
                          }`}
                          title={provider.provider_name}
                        >
                          {provider.logo_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-default-100 text-xs text-center p-1">
                              {provider.provider_name}
                            </div>
                          )}
                          {selectedProviders.has(provider.provider_id) && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-default-500">No streaming services available for this region.</p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Content Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : media.length > 0 ? (
          <>
            <div className="mb-4 text-xs sm:text-sm text-foreground/60">
              Showing {media.length} of {totalResults} results
            </div>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12 5xl:grid-cols-14 gap-2 sm:gap-3 md:gap-4 relative z-0">
              {media.map((item) => (
                <React.Fragment key={item.id}>
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
        ) : (
          <Card className="card-interactive">
            <CardBody className="text-center py-12 sm:py-16 px-4">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Tv className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No Series Found</h3>
                  <p className="text-sm sm:text-base text-foreground/60">
                    Try adjusting your search or filters to find more results.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Add Series Modal */}
      <AddSeriesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        media={selectedMedia}
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
    </div>
  );
};

export default SeriesPage;


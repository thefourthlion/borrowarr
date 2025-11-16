"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
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
  Download,
  Plus,
  Check,
  ExternalLink,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Star,
  Film,
  Tv,
  Globe,
  Award,
  Play,
  Maximize2,
  Heart,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/";
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=";

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

interface TorrentResult {
  id: string;
  protocol: "torrent" | "nzb";
  age: number;
  ageFormatted: string;
  title: string;
  indexer: string;
  indexerId: number;
  indexerPriority?: number; // Lower number = higher priority
  size: number;
  sizeFormatted: string;
  grabs: number;
  seeders: number | null;
  leechers: number | null;
  downloadUrl: string;
}

interface MovieDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  runtime?: number;
  budget?: number;
  revenue?: number;
  imdb_id?: string;
  homepage?: string;
  status?: string;
  tagline?: string;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
  credits?: {
    cast?: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>;
    crew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
  };
  videos?: {
    results?: Array<{ id: string; key: string; name: string; site: string; type: string; size: number }>;
  };
  release_dates?: {
    results?: Array<{ 
      iso_3166_1: string; 
      release_dates: Array<{ 
        certification: string; 
        release_date: string; 
        type: number;
        note?: string;
        descriptors?: string[];
      }> 
    }>;
  };
  belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null };
  original_language?: string;
  original_title?: string;
  original_name?: string;
}

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: TMDBMedia | null;
  onAddMovie?: () => void;
}

const AddMovieModal: React.FC<AddMovieModalProps> = ({
  isOpen,
  onClose,
  media,
  onAddMovie,
}) => {
  const { user } = useAuth();
  
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [torrents, setTorrents] = useState<TorrentResult[]>([]);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<string>>(new Set());
  const [downloadError, setDownloadError] = useState<Map<string, string>>(new Map());
  
  // Movie settings state
  const [monitor, setMonitor] = useState("movieOnly");
  const [minAvailability, setMinAvailability] = useState("released");
  const [qualityProfile, setQualityProfile] = useState("any");
  const [addingMovie, setAddingMovie] = useState(false);
  const [openSelects, setOpenSelects] = useState<Set<string>>(new Set());
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  
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

  // Fetch movie details when modal opens or media changes
  useEffect(() => {
    if (isOpen && media) {
      // Reset all state first to ensure clean slate for new media
      setMovieDetails(null);
      setTorrents([]);
      setTrailerKey(null);
      setIsFavorited(false);
      setDownloading(new Set());
      setDownloadSuccess(new Set());
      setDownloadError(new Map());
      setOpenSelects(new Set());
      setMonitor("movieOnly");
      setMinAvailability("released");
      setQualityProfile("any");
      
      // Then fetch new data
      fetchMovieDetails();
      fetchTorrents();
      checkIfFavorited();
    } else if (!isOpen) {
      // Only reset when closing
      setMovieDetails(null);
      setTorrents([]);
      setTrailerKey(null);
      setIsFavorited(false);
      setDownloading(new Set());
      setDownloadSuccess(new Set());
      setDownloadError(new Map());
      setOpenSelects(new Set());
      setMonitor("movieOnly");
      setMinAvailability("released");
      setQualityProfile("any");
    }
  }, [isOpen, media?.id]); // Changed dependency to media?.id to trigger on media change

  const fetchMovieDetails = async () => {
    if (!media) return;
    
    setLoadingDetails(true);
    try {
      const isTV = media.media_type === 'tv' || !!media.first_air_date;
      const endpoint = isTV 
        ? `${API_BASE_URL}/api/TMDB/tv/${media.id}`
        : `${API_BASE_URL}/api/TMDB/movie/${media.id}`;
      
      const response = await axios.get(endpoint);
      
      if (response.data.success) {
        const details = isTV ? response.data.tv : response.data.movie;
        setMovieDetails(details);
        
        // Find trailer video
        if (details.videos?.results) {
          const trailer = details.videos.results.find(
            (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
          );
          if (trailer) {
            setTrailerKey(trailer.key);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching movie details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchTorrents = async () => {
    if (!media) return;
    
    setLoadingTorrents(true);
    try {
      const title = media.title || media.name || '';
      const year = media.release_date 
        ? new Date(media.release_date).getFullYear() 
        : (media.first_air_date ? new Date(media.first_air_date).getFullYear() : '');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/TMDB/movie/${media.id}/torrents`,
        {
          params: {
            title: title,
            year: year,
            categoryIds: media.media_type === 'tv' ? '5000' : '2000',
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

  const handleDownloadTorrent = async (torrent: TorrentResult) => {
    setDownloading((prev) => new Set(prev).add(torrent.id));
    setDownloadError((prev) => {
      const next = new Map(prev);
      next.delete(torrent.id);
      return next;
    });

    try {
      // Extract quality from torrent title
      const titleLower = torrent.title.toLowerCase();
      let quality = 'SD';
      if (titleLower.includes('2160p') || titleLower.includes('4k') || titleLower.includes('uhd')) {
        quality = '2160p';
      } else if (titleLower.includes('1080p')) {
        quality = '1080p';
      } else if (titleLower.includes('720p')) {
        quality = '720p';
      }

      const downloadPayload = {
        downloadUrl: torrent.downloadUrl,
        protocol: torrent.protocol, // Pass protocol to help backend select correct client
        // History information
        releaseName: torrent.title,
        indexer: torrent.indexer,
        indexerId: torrent.indexerId,
        size: torrent.size,
        sizeFormatted: torrent.sizeFormatted,
        seeders: torrent.seeders,
        leechers: torrent.leechers,
        quality: quality,
        source: 'AddMovieModal',
        mediaType: 'movie',
        mediaTitle: media?.title || media?.name || '',
        tmdbId: media?.id || null,
      };

      console.log('[AddMovieModal] Sending download request with history data:', downloadPayload);

      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, downloadPayload);

      if (response.data.success) {
        setDownloadSuccess((prev) => new Set(prev).add(torrent.id));
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

  const filterTorrentsByQuality = (torrents: TorrentResult[], quality: string): TorrentResult[] => {
    if (quality === "any") return torrents;

    return torrents.filter(torrent => {
      const title = torrent.title.toLowerCase();
      
      switch (quality) {
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
  };

  const handleAddMovie = async () => {
    if (!user) {
      showNotification('Login Required', 'Please log in to add media to your monitored list', 'warning');
      return;
    }

    if (!media || torrents.length === 0) {
      showNotification('No Torrents', 'No torrents available for this media', 'warning');
      return;
    }

    const isTV = media.media_type === 'tv' || !!media.first_air_date;
    if (isTV) {
      showNotification('Not Supported', 'TV show monitoring is not yet implemented. Please use manual download for now.', 'info');
      return;
    }

    setAddingMovie(true);

    try {
      const filteredTorrents = filterTorrentsByQuality(torrents, qualityProfile);

      if (filteredTorrents.length === 0) {
        throw new Error(`No torrents found matching quality profile: ${qualityProfile}`);
      }

      const bestTorrent = filteredTorrents.reduce((best, current) => {
        // First compare by indexer priority (lower number = higher priority)
        const bestPriority = (best as any).indexerPriority ?? 25;
        const currentPriority = (current as any).indexerPriority ?? 25;
        if (currentPriority < bestPriority) return current;
        if (currentPriority > bestPriority) return best;
        
        // If priorities are equal, prefer higher seeders
        const bestSeeders = best.seeders || 0;
        const currentSeeders = current.seeders || 0;
        return currentSeeders > bestSeeders ? current : best;
      });

      const posterUrl = media.poster_path 
        ? `${TMDB_IMAGE_BASE_URL}${media.poster_path}` 
        : (media.posterUrl || null);

      const title = media.title || media.name || '';
      const releaseDate = media.release_date || null;

      if (!user) {
        showNotification('Login Required', 'Please log in to add media to your monitored list', 'warning');
        return;
      }

      const saveMovieResponse = await axios.post(`${API_BASE_URL}/api/MonitoredMovies`, {
        userId: user.id,
        tmdbId: media.id,
        title: title,
        posterUrl,
        releaseDate: releaseDate,
        overview: media.overview,
        qualityProfile,
        minAvailability,
        monitor,
      });

      const isUpdate = saveMovieResponse.data.isUpdate;
      const movieId = saveMovieResponse.data.movie?.id;

      // Check if file already exists before downloading
      if (movieId) {
        try {
          const checkResponse = await axios.post(`${API_BASE_URL}/api/MonitoredMovies/${movieId}/check-file`);
          if (checkResponse.data.result.status === 'found') {
            // File already exists!
            setTimeout(() => {
              onClose();
              showNotification('Already in Library', `Movie already exists in your library! Found: ${checkResponse.data.result.fileInfo.fileName}`, 'info');
              if (onAddMovie) onAddMovie();
            }, 1000);
            return;
          }
        } catch (error) {
          console.error('Error checking for existing file:', error);
          // Continue with download if check fails
        }
      }

      // Extract quality from torrent title
      const titleLower = bestTorrent.title.toLowerCase();
      let quality = 'SD';
      if (titleLower.includes('2160p') || titleLower.includes('4k') || titleLower.includes('uhd')) {
        quality = '2160p';
      } else if (titleLower.includes('1080p')) {
        quality = '1080p';
      } else if (titleLower.includes('720p')) {
        quality = '720p';
      }

      // Download with history information
      const downloadPayload = {
        downloadUrl: bestTorrent.downloadUrl,
        protocol: bestTorrent.protocol,
        // History information
        releaseName: bestTorrent.title,
        indexer: bestTorrent.indexer,
        indexerId: bestTorrent.indexerId,
        size: bestTorrent.size,
        sizeFormatted: bestTorrent.sizeFormatted,
        seeders: bestTorrent.seeders,
        leechers: bestTorrent.leechers,
        quality: quality,
        source: 'AddMovieModal',
        mediaType: 'movie',
        mediaTitle: title,
        tmdbId: media.id,
      };

      console.log('[AddMovieModal] Sending download request with history data:', downloadPayload);

      const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, downloadPayload);

      if (!downloadResponse.data.success) {
        throw new Error(downloadResponse.data.error || "Failed to download");
      }
      
      if (movieId) {
        await axios.put(`${API_BASE_URL}/api/MonitoredMovies/${movieId}`, {
          status: "downloading",
          downloadedTorrentId: bestTorrent.id,
          downloadedTorrentTitle: bestTorrent.title,
        });
      }
      
      setTimeout(() => {
        onClose();
        const message = isUpdate 
          ? `Updating monitored media! Downloading: ${bestTorrent.title}`
          : `Movie added to monitoring! Downloading: ${bestTorrent.title}`;
        showNotification('Success', message, 'success');
        if (onAddMovie) onAddMovie();
      }, 1000);
    } catch (error: any) {
      console.error("Error adding movie:", error);
      showNotification('Error', error.message || 'Failed to add movie', 'error');
    } finally {
      setAddingMovie(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!user || !media) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/Favorites/check`,
        {
          params: {
            tmdbId: media.id,
            mediaType: 'movie',
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setIsFavorited(response.data.isFavorited || false);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !media) {
      showNotification('Login Required', 'Please log in to add favorites', 'warning');
      return;
    }

    setIsFavoriting(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            tmdbId: media.id,
            mediaType: 'movie',
          },
        });
        
        setIsFavorited(false);
      } else {
        // Add to favorites
        const posterUrl = media.poster_path 
          ? `${TMDB_IMAGE_BASE_URL}${media.poster_path}` 
          : (media.posterUrl || null);

        await axios.post(
          `${API_BASE_URL}/api/Favorites`,
          {
            tmdbId: media.id,
            mediaType: 'movie',
            title: media.title || media.name || '',
            posterUrl,
            overview: media.overview,
            releaseDate: media.release_date,
            voteAverage: media.vote_average,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setIsFavorited(true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to update favorite";
      showNotification('Error', errorMsg, 'error');
    } finally {
      setIsFavoriting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setOpenSelects(new Set());
    }
  }, [isOpen]);

  const getYear = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear();
  };

  const getMediaTitle = () => {
    if (!media) return 'Unknown';
    return media.title || media.name || 'Unknown';
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDirector = () => {
    if (!movieDetails?.credits?.crew) return null;
    return movieDetails.credits.crew.find(person => person.job === 'Director');
  };

  const getTopCast = (limit = 5) => {
    if (!movieDetails?.credits?.cast) return [];
    return movieDetails.credits.cast
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .slice(0, limit);
  };

  const getUSRating = () => {
    if (!movieDetails?.release_dates?.results) return null;
    
    // Find US release dates
    const usRelease = movieDetails.release_dates.results.find(
      (release) => release.iso_3166_1 === 'US'
    );
    
    if (!usRelease || !usRelease.release_dates || usRelease.release_dates.length === 0) {
      return null;
    }
    
    // Get the theatrical release (type 3) or first available
    const theatricalRelease = usRelease.release_dates.find(
      (rd) => rd.type === 3
    ) || usRelease.release_dates[0];
    
    return {
      rating: theatricalRelease.certification || 'Not Rated',
      descriptors: theatricalRelease.descriptors || [],
      note: theatricalRelease.note,
    };
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById('trailer-iframe') as HTMLIFrameElement;
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if ((iframe as any).webkitRequestFullscreen) {
        (iframe as any).webkitRequestFullscreen();
      } else if ((iframe as any).mozRequestFullScreen) {
        (iframe as any).mozRequestFullScreen();
      } else if ((iframe as any).msRequestFullscreen) {
        (iframe as any).msRequestFullscreen();
      }
    }
  };

  if (!media) return null;

  const isTV = media.media_type === 'tv' || !!media.first_air_date;
  const director = getDirector();
  const topCast = getTopCast();

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (openSelects.size === 0) {
          onClose();
        }
      }}
      size="5xl"
      scrollBehavior="inside"
      shouldBlockScroll={true}
      isDismissable={openSelects.size === 0}
      classNames={{
        base: "bg-background",
        header: "border-b border-divider",
        footer: "border-t border-divider",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{getMediaTitle()}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-default-500">
                  {movieDetails?.release_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {isTV ? 'First aired' : 'Released'}: {getYear(movieDetails.release_date)}
                    </span>
                  )}
                  {movieDetails && movieDetails.vote_average > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      {movieDetails.vote_average.toFixed(1)}/10
                    </span>
                  )}
                  {movieDetails && movieDetails.vote_count && movieDetails.vote_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {movieDetails.vote_count.toLocaleString()} votes
                    </span>
                  )}
                  {movieDetails?.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatRuntime(movieDetails.runtime)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {user && (
                  <Button
                    size="sm"
                    variant="flat"
                    color={isFavorited ? "danger" : "default"}
                    startContent={
                      isFavoriting ? (
                        <Spinner size="sm" className="w-4 h-4" />
                      ) : (
                        <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                      )
                    }
                    onPress={toggleFavorite}
                    isDisabled={isFavoriting}
                  >
                    {isFavorited ? 'Unfavorite' : 'Favorite'}
                  </Button>
                )}
              {movieDetails?.imdb_id && (
                <Button
                  as="a"
                  href={`https://www.imdb.com/title/${movieDetails.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="flat"
                  startContent={<ExternalLink size={16} />}
                >
                  View on IMDb
                </Button>
              )}
              </div>
            </div>
            {movieDetails?.tagline && (
              <p className="text-sm text-default-400 italic mt-1">{movieDetails.tagline}</p>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="py-6">
          {loadingDetails ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Media Info with Poster */}
              <div className="flex gap-6">
                {media.posterUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={media.posterUrl}
                      alt={getMediaTitle()}
                      className="w-32 rounded-lg shadow-lg"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-default-600 leading-relaxed">
                    {movieDetails?.overview || media.overview || 'No overview available'}
                  </p>
                  
                  {/* Rating Information */}
                  {getUSRating() && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-default-600">Rating:</span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getUSRating()?.rating === 'R' || getUSRating()?.rating === 'NC-17' ? 'danger' : 
                                 getUSRating()?.rating === 'PG-13' ? 'warning' : 
                                 getUSRating()?.rating === 'PG' ? 'success' : 'default'}
                          className="font-bold"
                        >
                          {getUSRating()?.rating}
                        </Chip>
                        {getUSRating()?.descriptors && getUSRating()!.descriptors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {getUSRating()!.descriptors.map((descriptor, idx) => (
                              <Chip
                                key={idx}
                                size="sm"
                                variant="flat"
                                className="text-xs"
                              >
                                {descriptor}
                              </Chip>
                            ))}
                          </div>
                        )}
                        {getUSRating()?.note && (
                          <span className="text-xs text-default-500 italic">
                            {getUSRating()!.note}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* External Links */}
                  {(movieDetails?.imdb_id || movieDetails?.homepage || media.id) && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-default-600 mb-2">External Links:</p>
                      <div className="flex flex-wrap gap-2">
                        {movieDetails?.imdb_id && (
                          <>
                          <Button
                            as="a"
                            href={`https://www.imdb.com/title/${movieDetails.imdb_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="flat"
                            color="warning"
                            startContent={<ExternalLink size={14} />}
                            className="text-xs"
                          >
                            IMDb
                          </Button>
                            <Button
                              as="a"
                              href={`https://www.imdb.com/title/${movieDetails.imdb_id}/parentalguide`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="sm"
                              variant="flat"
                              color="warning"
                              startContent={<Users size={14} />}
                              className="text-xs"
                            >
                              Parents Guide
                            </Button>
                          </>
                        )}
                        {media.id && (
                          <Button
                            as="a"
                            href={`https://www.themoviedb.org/movie/${media.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<ExternalLink size={14} />}
                            className="text-xs"
                          >
                            TMDB
                          </Button>
                        )}
                        {movieDetails?.homepage && (
                          <Button
                            as="a"
                            href={movieDetails.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            variant="flat"
                            color="default"
                            startContent={<Globe size={14} />}
                            className="text-xs"
                          >
                            Official Site
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Info Grid */}
                  {movieDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {movieDetails.budget && movieDetails.budget > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Budget: <span className="font-medium">{formatCurrency(movieDetails.budget)}</span>
                          </span>
                        </div>
                      )}
                      {movieDetails.revenue && movieDetails.revenue > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign size={16} className="text-success" />
                          <span className="text-default-600">
                            Revenue: <span className="font-medium">{formatCurrency(movieDetails.revenue)}</span>
                          </span>
                        </div>
                      )}
                      {movieDetails.status && (
                        <div className="flex items-center gap-2 text-sm">
                          <Film size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Status: <span className="font-medium">{movieDetails.status}</span>
                          </span>
                        </div>
                      )}
                      {movieDetails.original_language && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Language: <span className="font-medium">{movieDetails.original_language.toUpperCase()}</span>
                          </span>
                        </div>
                      )}
                      {movieDetails.popularity && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Popularity: <span className="font-medium">{movieDetails.popularity.toFixed(0)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Genres */}
                  {movieDetails?.genres && movieDetails.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {movieDetails.genres.map((genre) => (
                        <Chip key={genre.id} size="sm" variant="flat" color="primary">
                          {genre.name}
                        </Chip>
                      ))}
                    </div>
                  )}

                  {/* Production Companies */}
                  {movieDetails?.production_companies && movieDetails.production_companies.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-default-600 mb-2">Production Companies:</p>
                      <div className="flex flex-wrap gap-2">
                        {movieDetails.production_companies.slice(0, 5).map((company) => (
                          <Chip key={company.id} size="sm" variant="flat">
                            {company.name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Director */}
                  {director && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-default-600">
                        <span className="font-semibold">Director:</span> {director.name}
                      </p>
                    </div>
                  )}

                  {/* Top Cast */}
                  {topCast.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-default-600 mb-2">Cast:</p>
                      <div className="flex flex-wrap gap-2">
                        {topCast.map((actor) => (
                          <Chip key={actor.id} size="sm" variant="flat" className="text-xs">
                            {actor.name} {actor.character && `as ${actor.character}`}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trailer Video */}
              {trailerKey && (
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Trailer</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<Maximize2 size={16} />}
                        onPress={handleFullscreen}
                      >
                        Fullscreen
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        as="a"
                        href={`${YOUTUBE_WATCH_URL}${trailerKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        startContent={<ExternalLink size={16} />}
                      >
                        Watch on YouTube
                      </Button>
                    </div>
                  </div>
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      id="trailer-iframe"
                      src={`${YOUTUBE_EMBED_URL}${trailerKey}?autoplay=0&rel=0&modestbranding=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title="Movie Trailer"
                    />
                  </div>
                </div>
              )}

              {/* Movie Settings */}
              <Card className="bg-content2">
                <CardBody className="p-4">
                  <div 
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Select
                      label="Monitor"
                      labelPlacement="outside"
                      placeholder="Select monitor option"
                      selectedKeys={monitor ? new Set([monitor]) : new Set()}
                      onSelectionChange={(keys) => {
                        const keysArray = Array.from(keys);
                        if (keysArray.length > 0) {
                          const selected = keysArray[0] as string;
                          setMonitor(selected);
                        }
                      }}
                      onOpenChange={(open) => {
                        setOpenSelects((prev) => {
                          const next = new Set(prev);
                          if (open) {
                            next.add("monitor");
                          } else {
                            next.delete("monitor");
                          }
                          return next;
                        });
                      }}
                      size="sm"
                      variant="bordered"
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
                      selectedKeys={minAvailability ? new Set([minAvailability]) : new Set()}
                      onSelectionChange={(keys) => {
                        const keysArray = Array.from(keys);
                        if (keysArray.length > 0) {
                          const selected = keysArray[0] as string;
                          setMinAvailability(selected);
                        }
                      }}
                      onOpenChange={(open) => {
                        setOpenSelects((prev) => {
                          const next = new Set(prev);
                          if (open) {
                            next.add("availability");
                          } else {
                            next.delete("availability");
                          }
                          return next;
                        });
                      }}
                      size="sm"
                      variant="bordered"
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
                      selectedKeys={qualityProfile ? new Set([qualityProfile]) : new Set()}
                      onSelectionChange={(keys) => {
                        const keysArray = Array.from(keys);
                        if (keysArray.length > 0) {
                          const selected = keysArray[0] as string;
                          setQualityProfile(selected);
                        }
                      }}
                      onOpenChange={(open) => {
                        setOpenSelects((prev) => {
                          const next = new Set(prev);
                          if (open) {
                            next.add("quality");
                          } else {
                            next.delete("quality");
                          }
                          return next;
                        });
                      }}
                      size="sm"
                      variant="bordered"
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
                  <div className="mt-4">
                    <p className="text-xs text-default-500">
                      💡 Click &quot;Add Movie&quot; to automatically download the best torrent matching your quality profile, or manually select a specific torrent below.
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Torrents Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Available Torrents</h3>
                
                {loadingTorrents ? (
                  <div className="flex justify-center items-center py-8">
                    <Spinner />
                  </div>
                ) : torrents.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {torrents.map((torrent) => (
                      <Card key={torrent.id} className="hover:bg-content2">
                        <CardBody className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{torrent.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-default-500">
                                <span>{torrent.indexer}</span>
                                <span>{torrent.sizeFormatted}</span>
                                <span>👤 {torrent.seeders || 0}</span>
                              </div>
                              {downloadError.has(torrent.id) && (
                                <p className="text-xs text-danger mt-1">
                                  {downloadError.get(torrent.id)}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              color={downloadSuccess.has(torrent.id) ? "success" : downloadError.has(torrent.id) ? "danger" : "primary"}
                              startContent={
                                downloadSuccess.has(torrent.id) ? (
                                  <Check size={16} />
                                ) : (
                                  <Download size={16} />
                                )
                              }
                              onPress={() => handleDownloadTorrent(torrent)}
                              isLoading={downloading.has(torrent.id)}
                              isDisabled={downloading.has(torrent.id)}
                            >
                              {downloadSuccess.has(torrent.id) ? "Downloaded" : "Download"}
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-default-50">
                    <CardBody className="text-center py-8">
                      <p className="text-default-500">No torrents found for this movie</p>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
          {isTV ? (
            <Button 
              color="primary" 
              startContent={<Plus size={20} />}
              isDisabled={true}
              title="TV show monitoring not yet implemented"
            >
              Add TV Show (Coming Soon)
            </Button>
          ) : (
            <Button 
              color="primary" 
              startContent={<Plus size={20} />}
              onPress={handleAddMovie}
              isLoading={addingMovie}
              isDisabled={!media || torrents.length === 0 || loadingTorrents}
            >
              Add Movie
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>

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

export default AddMovieModal;


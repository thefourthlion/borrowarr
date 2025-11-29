"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ShoppingCart,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";
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
  const [hasSearchedTorrents, setHasSearchedTorrents] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<string>>(new Set());
  const [downloadError, setDownloadError] = useState<Map<string, string>>(new Map());
  
  // Movie settings state
  const [monitor, setMonitor] = useState("movieOnly");
  const [minAvailability, setMinAvailability] = useState("released");
  const [qualityProfile, setQualityProfile] = useState("any");
  const [addingMovie, setAddingMovie] = useState(false);
  
  // User settings from system page
  const [userSettings, setUserSettings] = useState<{
    minQuality: string;
    maxQuality: string;
    autoDownload: boolean;
  } | null>(null);
  const [openSelects, setOpenSelects] = useState<Set<string>>(new Set());
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  
  // Hidden state
  const [isHidden, setIsHidden] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  
  // Validation state
  const [hasIndexers, setHasIndexers] = useState(false);
  const [hasDownloadClients, setHasDownloadClients] = useState(false);
  const [checkingRequirements, setCheckingRequirements] = useState(false);
  
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

  // Ref to track the last successfully fetched media ID
  const lastFetchedMediaIdRef = useRef<number | null>(null);
  // Track if a fetch is currently in progress
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

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

  // Check if user has indexers and download clients
  const checkRequirements = async () => {
    if (!user) {
      setHasIndexers(false);
      setHasDownloadClients(false);
      return;
    }

    setCheckingRequirements(true);
    try {
      const token = localStorage.getItem('accessToken'); // Fixed: use 'accessToken' not 'token'
      
      // Check indexers
      const indexersResponse = await axios.get(`${API_BASE_URL}/api/Indexers/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const indexers = indexersResponse.data.data || indexersResponse.data || [];
      const activeIndexers = indexers.filter((idx: any) => idx.enabled);
      setHasIndexers(activeIndexers.length > 0);
      
      // Check download clients
      const clientsResponse = await axios.get(`${API_BASE_URL}/api/DownloadClients/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const clients = clientsResponse.data.data || clientsResponse.data || [];
      const activeClients = clients.filter((client: any) => client.enabled); // Fixed: use 'enabled' not 'isActive'
      setHasDownloadClients(activeClients.length > 0);
    } catch (error) {
      console.error('Error checking requirements:', error);
      setHasIndexers(false);
      setHasDownloadClients(false);
    } finally {
      setCheckingRequirements(false);
    }
  };

  const validateBeforeAction = (): boolean => {
    if (!user) {
      showNotification(
        'Sign In Required',
        'Please sign in to download content. Click on "Login" in the navigation menu to get started.',
        'warning'
      );
      return false;
    }

    if (!hasIndexers) {
      showNotification(
        'Indexers Required',
        'You need to configure at least one indexer before downloading content. Go to Settings → Indexers to add an indexer.',
        'warning'
      );
      return false;
    }

    if (!hasDownloadClients) {
      showNotification(
        'Download Client Required',
        'You need to configure a download client before downloading content. Go to Settings → Download Clients to add a client.',
        'warning'
      );
      return false;
    }

    return true;
  };

  // Fetch user's quality settings from system page
  const fetchUserSettings = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/Settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setUserSettings({
          minQuality: response.data.minQuality || '720p',
          maxQuality: response.data.maxQuality || '1080p',
          autoDownload: response.data.autoDownload ?? true,
        });
        console.log('[AddMovieModal] User settings loaded:', response.data.minQuality, response.data.maxQuality);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  // Quality ranking for comparison (higher number = higher quality)
  const getQualityRank = (quality: string): number => {
    const qualityLower = quality.toLowerCase();
    if (qualityLower.includes('2160p') || qualityLower.includes('4k') || qualityLower.includes('uhd')) return 4;
    if (qualityLower.includes('1080p')) return 3;
    if (qualityLower.includes('720p')) return 2;
    if (qualityLower.includes('480p') || qualityLower.includes('sd')) return 1;
    return 0; // Unknown
  };

  // Detect quality from filename
  const detectQualityFromFilename = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '2160p';
    if (lower.includes('1080p')) return '1080p';
    if (lower.includes('720p')) return '720p';
    if (lower.includes('480p')) return '480p';
    return 'SD';
  };

  // Check if existing file meets the minimum quality threshold
  const fileMeetsQualityThreshold = (existingQuality: string, minQuality: string): boolean => {
    const existingRank = getQualityRank(existingQuality);
    const minRank = getQualityRank(minQuality);
    return existingRank >= minRank;
  };

  // Get the best torrent by seeders count (prioritize seeders over indexer priority for auto-download)
  const getBestTorrentBySeeders = (torrents: TorrentResult[]): TorrentResult | null => {
    if (torrents.length === 0) return null;
    
    return torrents.reduce((best, current) => {
      const bestSeeders = best.seeders || 0;
      const currentSeeders = current.seeders || 0;
      
      // Prioritize by seeders first
      if (currentSeeders > bestSeeders) return current;
      if (currentSeeders < bestSeeders) return best;
      
      // If seeders are equal, use indexer priority as tiebreaker
      const bestPriority = (best as any).indexerPriority ?? 25;
      const currentPriority = (current as any).indexerPriority ?? 25;
      return currentPriority < bestPriority ? current : best;
    });
  };

  // Fetch movie details when modal opens or media changes
  useEffect(() => {
    // Skip if modal is not open or no media
    if (!isOpen || !media || !media.id) {
      return;
    }

    // Cancel any previous fetch
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    // Check if we already fetched this media and have cached data
    const isSameMedia = lastFetchedMediaIdRef.current === media.id;
    
    // Always reset state when opening modal for a different media
    if (!isSameMedia) {
      setMovieDetails(null);
      setTorrents([]);
      setHasSearchedTorrents(false);
      setTrailerKey(null);
      setIsFavorited(false);
      setIsHidden(false);
      setDownloading(new Set());
      setDownloadSuccess(new Set());
      setDownloadError(new Map());
      setOpenSelects(new Set());
      setMonitor("movieOnly");
      setMinAvailability("released");
      setQualityProfile("any");
    }
    
    // Create abort controller for this fetch
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;
    
    // Fetch movie details when modal opens (torrents loaded on demand)
    const doFetch = async () => {
      try {
        await Promise.all([
          fetchMovieDetails(),
          checkIfFavorited(),
          checkIfHidden(),
          checkRequirements(),
          fetchUserSettings(),
        ]);
        
        // Mark as successfully fetched only if not aborted
        if (!abortController.signal.aborted) {
          lastFetchedMediaIdRef.current = media.id;
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching modal data:', error);
        }
      }
    };
    
    doFetch();
    
    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [isOpen, media?.id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow closing animation
      const timer = setTimeout(() => {
        lastFetchedMediaIdRef.current = null;
        setMovieDetails(null);
        setTorrents([]);
        setHasSearchedTorrents(false);
        setTrailerKey(null);
        setIsFavorited(false);
        setIsHidden(false);
        setDownloading(new Set());
        setDownloadSuccess(new Set());
        setDownloadError(new Map());
        setOpenSelects(new Set());
        setMonitor("movieOnly");
        setMinAvailability("released");
        setQualityProfile("any");
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  const fetchTorrents = async (retryCount = 0): Promise<TorrentResult[]> => {
    if (!media) return [];
    
    setLoadingTorrents(true);
    setHasSearchedTorrents(true);
    
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1500; // 1.5 seconds between retries
    
    try {
      const token = localStorage.getItem('accessToken');
      const title = media.title || media.name || '';
      const year = media.release_date 
        ? new Date(media.release_date).getFullYear() 
        : (media.first_air_date ? new Date(media.first_air_date).getFullYear() : '');
      
      // Build search query: "Movie Title year"
      const searchQuery = year ? `${title} ${year}` : title;
      
      console.log(`[AddMovieModal] Searching for: "${searchQuery}" (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      
      // Use the Search API endpoint to search for torrents - fetch all results
      // Add fresh=true on first attempt to bypass cache and get fresh results
      const response = await axios.get(
        `${API_BASE_URL}/api/Search`,
        {
          params: {
            query: searchQuery,
            categoryIds: media.media_type === 'tv' ? '5000' : '2000',
            limit: 1000, // Large limit to get all results
            fresh: retryCount === 0 ? 'true' : undefined, // Force fresh results on first attempt
          },
          headers: token ? {
            Authorization: `Bearer ${token}`,
          } : undefined,
          timeout: 45000, // Increased timeout for slower indexers
        }
      );

      const results = response.data.results || [];
      console.log(`[AddMovieModal] Search returned ${results.length} results (attempt ${retryCount + 1})`);

      // If no results and we haven't exceeded retries, wait and try again
      // This handles cases where indexers are slow to respond on first query
      if (results.length === 0 && retryCount < MAX_RETRIES) {
        console.log(`[AddMovieModal] No results, retrying in ${RETRY_DELAY}ms...`);
        setLoadingTorrents(true); // Keep loading state
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        // Recursive retry
        return fetchTorrents(retryCount + 1);
      }

      // Sort by seeders first (highest seeders = best), then by indexer priority as tiebreaker
      const sortedResults = [...results].sort((a: TorrentResult, b: TorrentResult) => {
        // Prioritize by seeders (descending - most seeders first)
        const aSeeders = a.seeders ?? 0;
        const bSeeders = b.seeders ?? 0;
        if (aSeeders !== bSeeders) {
          return bSeeders - aSeeders;
        }
        // If seeders are equal, use indexer priority (lower number = higher priority)
        const aPriority = a.indexerPriority ?? 25;
        const bPriority = b.indexerPriority ?? 25;
        return aPriority - bPriority;
      });
      
      setTorrents(sortedResults);
      setLoadingTorrents(false);
      return sortedResults;
    } catch (error) {
      console.error("Error fetching torrents:", error);
      
      // Retry on error if we haven't exceeded retries
      if (retryCount < MAX_RETRIES) {
        console.log(`[AddMovieModal] Error occurred, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchTorrents(retryCount + 1);
      }
      
      setTorrents([]);
      setLoadingTorrents(false);
      return [];
    }
  };

  const handleDownloadTorrent = async (torrent: TorrentResult) => {
    if (!validateBeforeAction()) {
      return;
    }

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
        mediaType: 'movies', // Must match category name in download client settings
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
    if (!validateBeforeAction()) {
      return;
    }

    if (!media) {
      showNotification('No Media', 'No media selected', 'warning');
      return;
    }

    const isTV = media.media_type === 'tv' || !!media.first_air_date;
    if (isTV) {
      showNotification('Not Supported', 'TV show monitoring is not yet implemented. Please use manual download for now.', 'info');
      return;
    }

    setAddingMovie(true);

    try {
      const posterUrl = media.poster_path 
        ? `${TMDB_IMAGE_BASE_URL}${media.poster_path}` 
        : (media.posterUrl || null);

      const title = media.title || media.name || '';
      const releaseDate = media.release_date || null;

      // Check if user has auto_approve permission
      const hasAutoApprove = user?.permissions?.auto_approve || user?.permissions?.admin;

      // If user doesn't have auto_approve, create a request instead
      if (!hasAutoApprove) {
        console.log('[AddMovieModal] User does not have auto_approve permission, creating request...');
        
        const requestResponse = await axios.post(`${API_BASE_URL}/api/MediaRequests`, {
          mediaType: 'movie',
          tmdbId: media.id,
          title: title,
          overview: media.overview,
          posterPath: media.poster_path,
          backdropPath: movieDetails?.backdrop_path || null,
          releaseDate: releaseDate,
          qualityProfile,
        });

        if (requestResponse.data.autoApproved) {
          // Request was auto-approved (shouldn't happen but handle it)
          showNotification('✅ Request Approved', 'Your request has been auto-approved and added to monitoring!', 'success');
        } else {
          showNotification('📨 Request Submitted', 'Your request has been submitted for admin approval. You\'ll be notified when it\'s reviewed.', 'info');
        }

        setTimeout(() => {
          onClose();
          if (onAddMovie) onAddMovie();
        }, 500);
        return;
      }

      // User has auto_approve - proceed with normal monitoring flow
      // Get minimum quality from user settings (system page) or use modal selection as fallback
      const effectiveMinQuality = userSettings?.minQuality || qualityProfile;
      console.log('[AddMovieModal] Using quality threshold:', effectiveMinQuality, '(from user settings:', userSettings?.minQuality, ')');

      // Check if file already exists - if so, check if it meets quality threshold
      let fileAlreadyExists = false;
      let existingFileInfo: { fileName: string; fileSizeFormatted: string } | null = null;
      let existingFileMeetsQuality = false;
      let existingFileQuality = 'unknown';
      
      try {
        console.log('[AddMovieModal] Checking if file exists for:', { userId: user!.id, title, releaseDate });
        const checkExistsResponse = await axios.post(`${API_BASE_URL}/api/MonitoredMovies/check-exists`, {
          userId: user!.id,
          title: title,
          releaseDate: releaseDate,
          tmdbId: media.id,
        });

        console.log('[AddMovieModal] Check exists response:', checkExistsResponse.data);

        if (checkExistsResponse.data.exists) {
          fileAlreadyExists = true;
          existingFileInfo = checkExistsResponse.data.fileInfo;
          
          // Detect quality of existing file
          existingFileQuality = detectQualityFromFilename(existingFileInfo?.fileName || '');
          existingFileMeetsQuality = fileMeetsQualityThreshold(existingFileQuality, effectiveMinQuality);
          
          console.log('[AddMovieModal] File already exists:', existingFileInfo);
          console.log('[AddMovieModal] Existing file quality:', existingFileQuality, 'Meets threshold:', existingFileMeetsQuality);
        }
      } catch (error: any) {
        console.error('[AddMovieModal] Error checking for existing file:', error?.response?.data || error?.message || error);
        // Continue if check fails (directory might not be configured)
      }

      // Save movie to monitoring list and get user's autoDownload setting
      const saveMovieResponse = await axios.post(`${API_BASE_URL}/api/MonitoredMovies`, {
        userId: user!.id,
        tmdbId: media.id,
        title: title,
        posterUrl,
        releaseDate: releaseDate,
        overview: media.overview,
        qualityProfile,
        minAvailability,
        monitor,
        status: fileAlreadyExists ? 'downloaded' : 'monitoring', // Set status based on file existence
      });

      const isUpdate = saveMovieResponse.data.isUpdate;
      const movieId = saveMovieResponse.data.movie?.id;
      const autoDownload = saveMovieResponse.data.autoDownload ?? true;

      console.log(`[AddMovieModal] Movie saved. autoDownload: ${autoDownload}, fileAlreadyExists: ${fileAlreadyExists}, existingFileMeetsQuality: ${existingFileMeetsQuality}`);

      // If file already exists AND meets quality threshold, show success and close
      if (fileAlreadyExists && existingFileMeetsQuality) {
        setTimeout(() => {
          onClose();
          const message = isUpdate 
            ? `Movie monitoring updated! File already exists in library:\n${existingFileInfo?.fileName} (${existingFileQuality})`
            : `Movie added to monitoring! Already downloaded:\n${existingFileInfo?.fileName} (${existingFileInfo?.fileSizeFormatted}, ${existingFileQuality})`;
          showNotification('✅ Success', message, 'success');
          if (onAddMovie) onAddMovie();
        }, 500);
        return;
      }

      // If file exists but doesn't meet quality threshold, log and continue to download better version
      if (fileAlreadyExists && !existingFileMeetsQuality) {
        console.log(`[AddMovieModal] Existing file quality (${existingFileQuality}) is below threshold (${effectiveMinQuality}). Will download better quality.`);
      }

      // If autoDownload is disabled, just add to monitoring without downloading
      if (!autoDownload) {
        setTimeout(() => {
          onClose();
          const message = isUpdate 
            ? `Movie monitoring updated! Will check for file periodically.`
            : `Movie added to monitoring! Auto-download is disabled - will check for file periodically.`;
          showNotification('Success', message, 'success');
          if (onAddMovie) onAddMovie();
        }, 500);
        return;
      }

      // autoDownload is enabled - search for torrents if not already searched
      let availableTorrents = torrents;
      
      if (availableTorrents.length === 0) {
        // No torrents searched yet - use the robust search with retry logic
        console.log('[AddMovieModal] Auto-download enabled, searching for torrents with retry logic...');
        availableTorrents = await fetchTorrents();
      }
      
      if (availableTorrents.length === 0) {
        // No torrents found - add to monitoring for periodic checks
        setTimeout(() => {
          onClose();
          const message = isUpdate 
            ? `Movie monitoring updated! No downloads found yet - will check periodically.`
            : `Movie added to monitoring! No downloads available now - will check periodically.`;
          showNotification('Success', message, 'info');
          if (onAddMovie) onAddMovie();
        }, 500);
        return;
      }

      // Filter torrents by quality - use user settings minQuality from system page
      const effectiveQualityFilter = effectiveMinQuality === 'any' ? 'any' : 
                                      effectiveMinQuality.includes('1080') ? 'hd-1080p' :
                                      effectiveMinQuality.includes('720') ? 'hd-720p' :
                                      effectiveMinQuality.includes('2160') || effectiveMinQuality.includes('4k') ? 'ultra-hd' :
                                      qualityProfile; // fallback to modal selection
      
      const filteredTorrents = filterTorrentsByQuality(availableTorrents, effectiveQualityFilter);

      if (filteredTorrents.length === 0) {
        // No torrents matching quality - will be downloaded on next check
        const qualityMessage = fileAlreadyExists && !existingFileMeetsQuality
          ? `Movie added to monitoring! Current file (${existingFileQuality}) is below your quality threshold (${effectiveMinQuality}). No higher quality torrents found yet - will check periodically.`
          : `Movie added to monitoring! No torrents matching quality profile "${effectiveMinQuality}" - will download when available.`;
        setTimeout(() => {
          onClose();
          showNotification('Success', qualityMessage, 'info');
          if (onAddMovie) onAddMovie();
        }, 500);
        return;
      }

      // Get the best torrent - prioritize by SEEDERS first (most seeders = best), then indexer priority as tiebreaker
      const bestTorrent = getBestTorrentBySeeders(filteredTorrents);
      
      if (!bestTorrent) {
        setTimeout(() => {
          onClose();
          showNotification('Success', 'Movie added to monitoring! No suitable torrents found.', 'info');
          if (onAddMovie) onAddMovie();
        }, 500);
        return;
      }
      
      console.log(`[AddMovieModal] Selected best torrent with ${bestTorrent.seeders} seeders: ${bestTorrent.title}`);

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
        mediaType: 'movies', // Must match category name in download client settings
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
        let message;
        if (fileAlreadyExists && !existingFileMeetsQuality) {
          message = `Upgrading quality! Your ${existingFileQuality} file will be replaced with ${quality}.\nDownloading: ${bestTorrent.title}`;
        } else {
          message = isUpdate 
            ? `Updating monitored media! Downloading: ${bestTorrent.title}`
            : `Movie added to monitoring! Downloading: ${bestTorrent.title}`;
        }
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
      const token = localStorage.getItem('accessToken'); // Fixed: use 'accessToken' not 'token'
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
      const token = localStorage.getItem('accessToken'); // Fixed: use 'accessToken' not 'token'
      
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

  const checkIfHidden = async () => {
    if (!user || !media) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${API_BASE_URL}/api/HiddenMedia`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.data.success && response.data.hiddenIds?.movies) {
        setIsHidden(response.data.hiddenIds.movies.includes(media.id));
      }
    } catch (error) {
      console.error('Error checking hidden status:', error);
    }
  };

  const toggleHidden = async () => {
    if (!user || !media) {
      showNotification('Login Required', 'Please log in to hide content', 'warning');
      return;
    }

    setIsHiding(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (isHidden) {
        // Unhide
        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia/unhide`,
          {
            tmdbId: media.id,
            mediaType: 'movie',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setIsHidden(false);
        showNotification('Success', 'Movie unhidden', 'success');
      } else {
        // Hide
        const posterPath = media.poster_path || null;

        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia/hide`,
          {
            tmdbId: media.id,
            mediaType: 'movie',
            title: media.title || media.name || '',
            posterPath,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setIsHidden(true);
        showNotification('Success', 'Movie hidden from discover pages', 'success');
      }
    } catch (error: any) {
      console.error('Error toggling hidden:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to update hidden status";
      showNotification('Error', errorMsg, 'error');
    } finally {
      setIsHiding(false);
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
                  <>
                    <Button
                      size="sm"
                      variant="flat"
                      color={isHidden ? "warning" : "default"}
                      startContent={
                        isHiding ? (
                          <Spinner size="sm" className="w-4 h-4" />
                        ) : isHidden ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )
                      }
                      onPress={toggleHidden}
                      isDisabled={isHiding}
                    >
                      {isHidden ? 'Unhide' : 'Hide'}
                    </Button>
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
                  </>
                )}
                <Button
                  as="a"
                  href={`https://www.amazon.com/s?k=${encodeURIComponent((media.title || media.name || '') + " " + (media.release_date ? new Date(media.release_date).getFullYear() : "") + " blu-ray")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="flat"
                  startContent={<ShoppingCart size={16} />}
                >
                  Buy on Amazon
                </Button>
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
                        <Button
                          as="a"
                          href={`https://www.amazon.com/s?k=${encodeURIComponent((media.title || media.name || '') + " " + (media.release_date ? new Date(media.release_date).getFullYear() : "") + " blu-ray")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          variant="flat"
                          className="bg-[#FF9900] text-white"
                          startContent={<ShoppingCart size={14} />}
                        >
                          Amazon
                        </Button>
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
                        <Button
                          as="a"
                          href={`http://localhost:3012/pages/search?q=${encodeURIComponent(media.title || media.name || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          variant="flat"
                          color="secondary"
                          startContent={<Search size={14} />}
                          className="text-xs"
                        >
                          Search Torrents
                        </Button>
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
                      {user?.permissions?.auto_approve || user?.permissions?.admin 
                        ? '💡 Click "Monitor Movie" to add this movie to your library. If auto-download is enabled and torrents are found, the best torrent matching your quality profile will be downloaded automatically.'
                        : '💡 Click "Request Movie" to submit a request for admin approval. Once approved, it will be added to your monitored list.'}
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Torrents Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Available Torrents</h3>
                  {hasSearchedTorrents && torrents.length > 0 && (
                    <Chip size="sm" variant="flat" color="secondary">
                      {torrents.length} result{torrents.length !== 1 ? 's' : ''}
                    </Chip>
                  )}
                </div>
                
                {loadingTorrents ? (
                  <Card className="bg-gradient-to-br from-secondary/20 via-primary/10 to-secondary/20 border border-secondary/30">
                    <CardBody className="py-12 px-6">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <Spinner size="lg" color="secondary" />
                        <p className="text-sm text-default-500">Searching indexers for torrents...</p>
                      </div>
                    </CardBody>
                  </Card>
                ) : !hasSearchedTorrents ? (
                  <Card className="bg-gradient-to-br from-secondary/20 via-primary/10 to-secondary/20 border border-secondary/30">
                    <CardBody className="py-10 px-6">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                          <Search size={32} className="text-secondary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-foreground mb-1">Search for Torrents</h4>
                          <p className="text-sm text-default-500 max-w-sm">
                            Click the button below to search indexers for available downloads
                          </p>
                        </div>
                        <Button
                          size="lg"
                          color="secondary"
                          variant="shadow"
                          className="mt-2 px-8 py-6 text-lg font-semibold bg-gradient-to-r from-secondary to-primary hover:opacity-90 transition-all duration-200 hover:scale-105"
                          startContent={<Search size={24} />}
                          onPress={() => fetchTorrents()}
                        >
                          Search Indexers
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ) : torrents.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {torrents.map((torrent) => (
                      <Card key={torrent.id} className="hover:bg-content2">
                        <CardBody className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{torrent.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-default-500">
                                <Chip size="sm" variant="flat" color="secondary" className="text-xs">
                                  {torrent.indexer}
                                </Chip>
                                <span>{torrent.sizeFormatted}</span>
                                {torrent.protocol === "torrent" && (
                                  <span className="flex items-center gap-1">
                                    🌱 <span className="font-semibold">{torrent.seeders || 0}</span>
                                  </span>
                                )}
                                {torrent.protocol === "torrent" && torrent.leechers !== null && (
                                  <span className="flex items-center gap-1">
                                    📥 {torrent.leechers}
                                  </span>
                                )}
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
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        className="mt-4"
                        startContent={<Search size={16} />}
                        onPress={() => fetchTorrents()}
                        isLoading={loadingTorrents}
                      >
                        Search Again
                      </Button>
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
              Monitor TV Show (Coming Soon)
            </Button>
          ) : (
            <Button 
              color="primary" 
              startContent={<Plus size={20} />}
              onPress={handleAddMovie}
              isLoading={addingMovie}
              isDisabled={!media || loadingDetails}
            >
              {user?.permissions?.auto_approve || user?.permissions?.admin ? 'Monitor Movie' : 'Request Movie'}
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


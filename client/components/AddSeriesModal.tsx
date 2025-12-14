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
} from "@nextui-org/modal";
import {
  ExternalLink,
  Calendar,
  Clock,
  Users,
  Star,
  Tv,
  Globe,
  Download,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
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

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date?: string;
  still_path: string | null;
  vote_average: number;
  runtime?: number;
}

interface Season {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  episode_count: number;
  air_date?: string;
  poster_path: string | null;
  episodes?: Episode[];
}

interface TVShowDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  number_of_seasons: number;
  number_of_episodes: number;
  status?: string;
  tagline?: string;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string; logo_path: string | null }>;
  networks?: Array<{ id: number; name: string; logo_path: string | null }>;
  credits?: {
    cast?: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>;
    crew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
  };
  videos?: {
    results?: Array<{ id: string; key: string; name: string; site: string; type: string; size: number }>;
  };
  seasons?: Season[];
  imdb_id?: string;
  homepage?: string;
  original_language?: string;
  content_ratings?: {
    results?: Array<{
      iso_3166_1: string;
      rating: string;
      descriptors?: string[];
    }>;
  };
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

interface SelectedEpisode {
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface AddSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: TMDBMedia | null;
  onAddSeries?: () => void;
  onCastClick?: (castMember: { id: number; name: string }) => void;
}

const AddSeriesModal: React.FC<AddSeriesModalProps> = ({
  isOpen,
  onClose,
  media,
  onAddSeries,
  onCastClick,
}) => {
  const { user } = useAuth();
  
  const [tvShowDetails, setTvShowDetails] = useState<TVShowDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [selectAllSeasons, setSelectAllSeasons] = useState(true);
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Map<string, boolean>>(new Map());
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Set<string>>(new Set());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());
  const [addingSeries, setAddingSeries] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  
  // Torrent selection state
  const [episodeShowingTorrents, setEpisodeShowingTorrents] = useState<string | null>(null);
  const [episodeTorrents, setEpisodeTorrents] = useState<Map<string, TorrentResult[]>>(new Map());
  const [loadingEpisodeTorrents, setLoadingEpisodeTorrents] = useState<Map<string, boolean>>(new Map());
  const [downloadingTorrents, setDownloadingTorrents] = useState<Set<string>>(new Set());
  const [downloadTorrentSuccess, setDownloadTorrentSuccess] = useState<Set<string>>(new Set());
  const [downloadTorrentErrors, setDownloadTorrentErrors] = useState<Map<string, string>>(new Map());
  
  // Complete series/season torrent state
  const [showingCompleteSeriesTorrents, setShowingCompleteSeriesTorrents] = useState(false);
  const [completeSeriesTorrents, setCompleteSeriesTorrents] = useState<TorrentResult[]>([]);
  const [loadingCompleteSeriesTorrents, setLoadingCompleteSeriesTorrents] = useState(false);
  const [selectedSeasonForComplete, setSelectedSeasonForComplete] = useState<number | null>(null);
  
  // Individual season torrent state
  const [seasonShowingTorrents, setSeasonShowingTorrents] = useState<number | null>(null);
  const [seasonTorrents, setSeasonTorrents] = useState<Map<number, TorrentResult[]>>(new Map());
  const [loadingSeasonTorrents, setLoadingSeasonTorrents] = useState<Map<number, boolean>>(new Map());

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
  
  // User settings from system page
  const [userSettings, setUserSettings] = useState<{
    minQuality: string;
    maxQuality: string;
    autoDownload: boolean;
  } | null>(null);
  
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
      const token = localStorage.getItem('accessToken') // Fixed: use 'accessToken' not 'token';
      
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
        console.log('[AddSeriesModal] User settings loaded:', response.data.minQuality, response.data.maxQuality);
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

  // Get the best torrent by indexer priority first, then seeders as tiebreaker
  const getBestTorrent = (torrents: TorrentResult[]): TorrentResult | null => {
    if (torrents.length === 0) return null;
    
    return torrents.reduce((best, current) => {
      // First compare by indexer priority (lower = higher priority)
      const bestPriority = best.indexerPriority ?? 25;
      const currentPriority = current.indexerPriority ?? 25;
      
      if (currentPriority < bestPriority) return current;
      if (currentPriority > bestPriority) return best;
      
      // If priority is equal, use seeders as tiebreaker
      const bestSeeders = best.seeders || 0;
      const currentSeeders = current.seeders || 0;
      return currentSeeders > bestSeeders ? current : best;
    });
  };

  // Filter torrents by quality - use user settings
  const filterTorrentsByQuality = (torrents: TorrentResult[], minQuality: string): TorrentResult[] => {
    if (!minQuality || minQuality === 'any') return torrents;

    const minRank = getQualityRank(minQuality);
    
    return torrents.filter(torrent => {
      const torrentQuality = detectQualityFromFilename(torrent.title);
      const torrentRank = getQualityRank(torrentQuality);
      return torrentRank >= minRank;
    });
  };

  // Reset state when modal opens/closes or media changes
  useEffect(() => {
    // Skip if modal is not open or no media
    if (!isOpen || !media || !media.id) {
      return;
    }

    // Cancel any previous fetch
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    // Check if we already fetched this media
    const isSameMedia = lastFetchedMediaIdRef.current === media.id;
    
    // Always reset state when opening modal for a different media
    if (!isSameMedia) {
      setTvShowDetails(null);
      setSeasons([]);
      setSelectedSeasons(new Set());
      setSelectedEpisodes(new Set());
      setSelectAllSeasons(true);
      setExpandedSeasons(new Set());
      setTrailerKey(null);
      setEpisodeShowingTorrents(null);
      setEpisodeTorrents(new Map());
      setLoadingEpisodeTorrents(new Map());
      setDownloadingTorrents(new Set());
      setDownloadTorrentSuccess(new Set());
      setDownloadTorrentErrors(new Map());
      setShowingCompleteSeriesTorrents(false);
      setCompleteSeriesTorrents([]);
      setLoadingCompleteSeriesTorrents(false);
      setSelectedSeasonForComplete(null);
      setSeasonShowingTorrents(null);
      setSeasonTorrents(new Map());
      setLoadingSeasonTorrents(new Map());
      setDownloadingEpisodes(new Map());
      setDownloadedEpisodes(new Set());
      setDownloadErrors(new Map());
      setIsFavorited(false);
      setIsHidden(false);
    }
    
    // Create abort controller for this fetch
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;
    
    // Always fetch data when modal opens
    const doFetch = async () => {
      try {
        await Promise.all([
          fetchTVShowDetails(),
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
        setTvShowDetails(null);
        setSeasons([]);
        setSelectedSeasons(new Set());
        setSelectedEpisodes(new Set());
        setSelectAllSeasons(true);
        setExpandedSeasons(new Set());
        setTrailerKey(null);
        setEpisodeShowingTorrents(null);
        setEpisodeTorrents(new Map());
        setLoadingEpisodeTorrents(new Map());
        setDownloadingTorrents(new Set());
        setDownloadTorrentSuccess(new Set());
        setDownloadTorrentErrors(new Map());
        setShowingCompleteSeriesTorrents(false);
        setCompleteSeriesTorrents([]);
        setLoadingCompleteSeriesTorrents(false);
        setSelectedSeasonForComplete(null);
        setSeasonShowingTorrents(null);
        setSeasonTorrents(new Map());
        setLoadingSeasonTorrents(new Map());
        setDownloadingEpisodes(new Map());
        setDownloadedEpisodes(new Set());
        setDownloadErrors(new Map());
        setIsFavorited(false);
        setIsHidden(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // When select all seasons changes, update individual season selections
  useEffect(() => {
    if (selectAllSeasons && seasons.length > 0) {
      const allSeasonNumbers = new Set(seasons.map(s => s.season_number));
      setSelectedSeasons(allSeasonNumbers);
      // Also select all episodes
      const allEpisodes = new Set<string>();
      seasons.forEach(season => {
        if (season.episodes) {
          season.episodes.forEach(ep => {
            allEpisodes.add(`${season.season_number}-${ep.episode_number}`);
          });
        }
      });
      setSelectedEpisodes(allEpisodes);
    }
  }, [selectAllSeasons, seasons]);

  const fetchTVShowDetails = async () => {
    if (!media) return;
    
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/tv/${media.id}`);
      
      if (response.data.success) {
        const details = response.data.tv;
        setTvShowDetails(details);
        
        // Find trailer video
        if (details.videos?.results) {
          const trailer = details.videos.results.find(
            (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
          );
          if (trailer) {
            setTrailerKey(trailer.key);
          }
        }

        // Fetch all seasons
        await fetchAllSeasons(details.id, details.number_of_seasons || 0);
      }
    } catch (error) {
      console.error("Error fetching TV show details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchAllSeasons = async (tvId: number, numberOfSeasons: number) => {
    setLoadingSeasons(true);
    try {
      const seasonPromises = [];
      for (let i = 0; i <= numberOfSeasons; i++) {
        seasonPromises.push(
          axios.get(`${API_BASE_URL}/api/TMDB/tv/${tvId}/season/${i}`)
            .then(res => res.data.success ? res.data.season : null)
            .catch(err => {
              console.error(`Error fetching season ${i}:`, err);
              return null;
            })
        );
      }

      const seasonResults = await Promise.all(seasonPromises);
      const validSeasons = seasonResults.filter(s => s !== null) as Season[];
      
      // Sort by season number
      validSeasons.sort((a, b) => a.season_number - b.season_number);
      
      setSeasons(validSeasons);
      
      // Select all seasons and episodes by default
      if (validSeasons.length > 0) {
        const allSeasonNumbers = new Set(validSeasons.map(s => s.season_number));
        setSelectedSeasons(allSeasonNumbers);
        
        const allEpisodes = new Set<string>();
        validSeasons.forEach(season => {
          if (season.episodes) {
            season.episodes.forEach(ep => {
              allEpisodes.add(`${season.season_number}-${ep.episode_number}`);
            });
          }
        });
        setSelectedEpisodes(allEpisodes);
      }
    } catch (error) {
      console.error("Error fetching seasons:", error);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setSelectedSeasons(prev => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
        // Deselect all episodes in this season
        setSelectedEpisodes(prevEp => {
          const nextEp = new Set(prevEp);
          seasons.forEach(season => {
            if (season.season_number === seasonNumber && season.episodes) {
              season.episodes.forEach(ep => {
                nextEp.delete(`${seasonNumber}-${ep.episode_number}`);
              });
            }
          });
          return nextEp;
        });
      } else {
        next.add(seasonNumber);
        // Select all episodes in this season
        setSelectedEpisodes(prevEp => {
          const nextEp = new Set(prevEp);
          const season = seasons.find(s => s.season_number === seasonNumber);
          if (season?.episodes) {
            season.episodes.forEach(ep => {
              nextEp.add(`${seasonNumber}-${ep.episode_number}`);
            });
          }
          return nextEp;
        });
      }
      return next;
    });
    setSelectAllSeasons(false);
  };

  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    const episodeKey = `${seasonNumber}-${episodeNumber}`;
    setSelectedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeKey)) {
        next.delete(episodeKey);
        // Check if all episodes in this season are deselected
        const season = seasons.find(s => s.season_number === seasonNumber);
        if (season?.episodes) {
          const allDeselected = season.episodes.every(ep => 
            !next.has(`${seasonNumber}-${ep.episode_number}`)
          );
          if (allDeselected) {
            setSelectedSeasons(prevSeasons => {
              const nextSeasons = new Set(prevSeasons);
              nextSeasons.delete(seasonNumber);
              return nextSeasons;
            });
          }
        }
      } else {
        next.add(episodeKey);
        // Ensure season is selected
        setSelectedSeasons(prev => {
          const nextSeasons = new Set(prev);
          nextSeasons.add(seasonNumber);
          return nextSeasons;
        });
      }
      return next;
    });
    setSelectAllSeasons(false);
  };

  const toggleSelectAllSeasons = () => {
    const newValue = !selectAllSeasons;
    setSelectAllSeasons(newValue);
    
    if (newValue) {
      const allSeasonNumbers = new Set(seasons.map(s => s.season_number));
      setSelectedSeasons(allSeasonNumbers);
      
      const allEpisodes = new Set<string>();
      seasons.forEach(season => {
        if (season.episodes) {
          season.episodes.forEach(ep => {
            allEpisodes.add(`${season.season_number}-${ep.episode_number}`);
          });
        }
      });
      setSelectedEpisodes(allEpisodes);
    } else {
      setSelectedSeasons(new Set());
      setSelectedEpisodes(new Set());
    }
  };

  const toggleSeasonExpansion = (seasonNumber: number) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  const fetchEpisodeTorrents = async (seasonNumber: number, episodeNumber: number, retryCount = 0) => {
    if (!media) return;

    const episodeKey = `${seasonNumber}-${episodeNumber}`;
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1500;
    
    setLoadingEpisodeTorrents(prev => new Map(prev).set(episodeKey, true));
    setEpisodeShowingTorrents(episodeKey);

    try {
      const token = localStorage.getItem('accessToken');
      const title = media.name || media.title || '';

      // Build search query: "Title S01E01"
      const searchQuery = `${title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;

      console.log(`[AddSeriesModal] Searching for: "${searchQuery}" (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

      // Use the Search API endpoint to search for torrents - fetch all results
      const torrentResponse = await axios.get(
        `${API_BASE_URL}/api/Search`,
        {
          params: {
            query: searchQuery,
            categoryIds: '5000', // TV shows category
            limit: 1000, // Large limit to get all results
            fresh: retryCount === 0 ? 'true' : undefined, // Force fresh results on first attempt
          },
          headers: token ? {
            Authorization: `Bearer ${token}`,
          } : undefined,
          timeout: 45000,
        }
      );

      const results = torrentResponse.data.results || [];
      console.log(`[AddSeriesModal] Search returned ${results.length} results (attempt ${retryCount + 1})`);

      // If no results and we haven't exceeded retries, wait and try again
      if (results.length === 0 && retryCount < MAX_RETRIES) {
        console.log(`[AddSeriesModal] No results, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchEpisodeTorrents(seasonNumber, episodeNumber, retryCount + 1);
      }

      // Sort by indexer priority first (lower = higher priority), then by seeders as tiebreaker
      const sortedResults = [...results].sort((a: TorrentResult, b: TorrentResult) => {
        // First compare by indexer priority (lower number = higher priority)
        const aPriority = a.indexerPriority ?? 25;
        const bPriority = b.indexerPriority ?? 25;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Then sort by seeders (descending)
        const aSeeders = a.seeders ?? 0;
        const bSeeders = b.seeders ?? 0;
        return bSeeders - aSeeders;
      });
      
      setEpisodeTorrents(prev => {
        const next = new Map(prev);
        next.set(episodeKey, sortedResults);
        return next;
      });
    } catch (error: any) {
      // Retry on error if we haven't exceeded retries
      if (retryCount < MAX_RETRIES) {
        console.log(`[AddSeriesModal] Error occurred, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchEpisodeTorrents(seasonNumber, episodeNumber, retryCount + 1);
      }
      console.error("Error fetching episode torrents:", error);
      setEpisodeTorrents(prev => {
        const next = new Map(prev);
        next.set(episodeKey, []);
        return next;
      });
    } finally {
      setLoadingEpisodeTorrents(prev => {
        const next = new Map(prev);
        next.delete(episodeKey);
        return next;
      });
    }
  };

  const handleDownloadTorrent = async (torrent: TorrentResult, seasonNumber?: number, episodeNumber?: number) => {
    if (!validateBeforeAction()) {
      return;
    }

    const torrentId = torrent.id;
    
    setDownloadingTorrents(prev => new Set(prev).add(torrentId));
    setDownloadTorrentErrors(prev => {
      const next = new Map(prev);
      next.delete(torrentId);
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
        source: 'AddSeriesModal',
        mediaType: 'tv',
        mediaTitle: media?.name || media?.title || '',
        tmdbId: media?.id || null,
        seasonNumber: seasonNumber || null,
        episodeNumber: episodeNumber || null,
      };

      console.log('[AddSeriesModal] Sending download request with history data:', downloadPayload);

      const response = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, downloadPayload);

      if (response.data.success) {
        setDownloadTorrentSuccess(prev => new Set(prev).add(torrentId));
        
        // If it's an episode download, mark the episode as downloaded
        if (seasonNumber !== undefined && episodeNumber !== undefined) {
          const episodeKey = `${seasonNumber}-${episodeNumber}`;
          setDownloadedEpisodes(prev => new Set(prev).add(episodeKey));
        }
        
        setTimeout(() => {
          setDownloadTorrentSuccess(prev => {
            const next = new Set(prev);
            next.delete(torrentId);
            return next;
          });
        }, 3000);
      } else {
        throw new Error(response.data.error || "Failed to download");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Download failed";
      setDownloadTorrentErrors(prev => new Map(prev).set(torrentId, errorMsg));
      setTimeout(() => {
        setDownloadTorrentErrors(prev => {
          const next = new Map(prev);
          next.delete(torrentId);
          return next;
        });
      }, 5000);
    } finally {
      setDownloadingTorrents(prev => {
        const next = new Set(prev);
        next.delete(torrentId);
        return next;
      });
    }
  };

  const fetchCompleteSeriesTorrents = async (seasonNumber?: number, retryCount = 0) => {
    if (!media) return;

    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1500;

    setLoadingCompleteSeriesTorrents(true);
    setSelectedSeasonForComplete(seasonNumber || null);
    setShowingCompleteSeriesTorrents(true);

    try {
      const title = media.name || media.title || '';
      const year = media.first_air_date ? new Date(media.first_air_date).getFullYear() : '';

      // Build search query
      let searchQuery = title;
      if (seasonNumber !== undefined) {
        // Complete season: "Show Name S01 Complete"
        searchQuery += ` S${String(seasonNumber).padStart(2, '0')} Complete`;
      } else {
        // Complete series: "Show Name Complete" or "Show Name All Seasons"
        searchQuery += ' Complete';
      }
      
      if (year) {
        searchQuery += ` ${year}`;
      }

      console.log(`[AddSeriesModal] Searching complete series: "${searchQuery}" (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

      // Use the Search API endpoint to search for torrents - fetch all results
      const torrentResponse = await axios.get(
        `${API_BASE_URL}/api/Search`,
        {
          params: {
            query: searchQuery,
            categoryIds: '5000', // TV shows category
            limit: 1000, // Large limit to get all results
            fresh: retryCount === 0 ? 'true' : undefined,
          },
          timeout: 45000,
        }
      );

      const results = torrentResponse.data.results || [];
      console.log(`[AddSeriesModal] Complete series search returned ${results.length} results (attempt ${retryCount + 1})`);

      // If no results and we haven't exceeded retries, wait and try again
      if (results.length === 0 && retryCount < MAX_RETRIES) {
        console.log(`[AddSeriesModal] No results, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchCompleteSeriesTorrents(seasonNumber, retryCount + 1);
      }

      // Sort by indexer priority first (lower = higher priority), then by seeders as tiebreaker
      const sortedResults = [...results].sort((a: TorrentResult, b: TorrentResult) => {
        // First compare by indexer priority (lower number = higher priority)
        const aPriority = a.indexerPriority ?? 25;
        const bPriority = b.indexerPriority ?? 25;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Then sort by seeders (descending)
        const aSeeders = a.seeders ?? 0;
        const bSeeders = b.seeders ?? 0;
        return bSeeders - aSeeders;
      });
      
      setCompleteSeriesTorrents(sortedResults);
    } catch (error: any) {
      console.error("Error fetching complete series torrents:", error);
      
      // Retry on error if we haven't exceeded retries
      if (retryCount < MAX_RETRIES) {
        console.log(`[AddSeriesModal] Error occurred, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchCompleteSeriesTorrents(seasonNumber, retryCount + 1);
      }
      
      const errorMessage = error.response?.data?.error || error.message || "Failed to fetch torrents";
      console.error("Error details:", errorMessage);
      setCompleteSeriesTorrents([]);
      // Optionally show error to user
      if (error.response?.status === 500) {
        showNotification('Search Error', `Error searching for complete series torrents: ${errorMessage}`, 'error');
      }
    } finally {
      setLoadingCompleteSeriesTorrents(false);
    }
  };

  const fetchSeasonTorrents = async (seasonNumber: number, retryCount = 0) => {
    if (!media) return;

    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1500;

    setLoadingSeasonTorrents(prev => new Map(prev).set(seasonNumber, true));
    setSeasonShowingTorrents(seasonNumber);

    try {
      const title = media.name || media.title || '';
      const year = media.first_air_date ? new Date(media.first_air_date).getFullYear() : '';

      // Build search query: "Show Name S01"
      let searchQuery = `${title} S${String(seasonNumber).padStart(2, '0')}`;
      if (year) {
        searchQuery += ` ${year}`;
      }

      console.log(`[AddSeriesModal] Searching season: "${searchQuery}" (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

      // Use the Search API endpoint to search for torrents - fetch all results
      const torrentResponse = await axios.get(
        `${API_BASE_URL}/api/Search`,
        {
          params: {
            query: searchQuery,
            categoryIds: '5000', // TV shows category
            limit: 1000, // Large limit to get all results
            fresh: retryCount === 0 ? 'true' : undefined,
          },
          timeout: 45000,
        }
      );

      const results = torrentResponse.data.results || [];
      console.log(`[AddSeriesModal] Season search returned ${results.length} results (attempt ${retryCount + 1})`);

      // If no results and we haven't exceeded retries, wait and try again
      if (results.length === 0 && retryCount < MAX_RETRIES) {
        console.log(`[AddSeriesModal] No results, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchSeasonTorrents(seasonNumber, retryCount + 1);
      }

      // Sort by indexer priority first (lower = higher priority), then by seeders as tiebreaker
      const sortedResults = [...results].sort((a: TorrentResult, b: TorrentResult) => {
        // First compare by indexer priority (lower number = higher priority)
        const aPriority = a.indexerPriority ?? 25;
        const bPriority = b.indexerPriority ?? 25;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Then sort by seeders (descending)
        const aSeeders = a.seeders ?? 0;
        const bSeeders = b.seeders ?? 0;
        return bSeeders - aSeeders;
      });
      
      setSeasonTorrents(prev => {
        const next = new Map(prev);
        next.set(seasonNumber, sortedResults);
        return next;
      });
    } catch (error: any) {
      // Retry on error if we haven't exceeded retries
      if (retryCount < MAX_RETRIES) {
        console.log(`[AddSeriesModal] Error occurred, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchSeasonTorrents(seasonNumber, retryCount + 1);
      }

      console.error("Error fetching season torrents:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to fetch torrents";
      console.error("Error details:", errorMessage);
      setSeasonTorrents(prev => {
        const next = new Map(prev);
        next.set(seasonNumber, []);
        return next;
      });
      // Optionally show error to user
      if (error.response?.status === 500) {
        showNotification('Search Error', `Error searching for season torrents: ${errorMessage}`, 'error');
      }
    } finally {
      setLoadingSeasonTorrents(prev => {
        const next = new Map(prev);
        next.delete(seasonNumber);
        return next;
      });
    }
  };

  const downloadEpisode = async (seasonNumber: number, episodeNumber: number, episodeName: string) => {
    if (!validateBeforeAction()) {
      return;
    }

    if (!media) {
      return;
    }

    const episodeKey = `${seasonNumber}-${episodeNumber}`;
    setDownloadingEpisodes(prev => new Map(prev).set(episodeKey, true));
    setDownloadErrors(prev => {
      const next = new Map(prev);
      next.delete(episodeKey);
      return next;
    });

    try {
      const token = localStorage.getItem('accessToken');
      const title = media.name || media.title || '';

      // Build search query: "Title S01E01"
      const searchQuery = `${title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;

      // Robust search with retry logic for reliable results
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 1500;
      let allResults: TorrentResult[] = [];
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[AddSeriesModal] Auto-download searching for: "${searchQuery}" (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        
        try {
          const torrentResponse = await axios.get(
            `${API_BASE_URL}/api/Search`,
            {
              params: {
                query: searchQuery,
                categoryIds: '5000', // TV shows category
                limit: 1000,
                fresh: attempt === 0 ? 'true' : undefined, // Fresh results on first attempt
              },
              headers: token ? {
                Authorization: `Bearer ${token}`,
              } : undefined,
              timeout: 45000,
            }
          );

          allResults = torrentResponse.data.results || [];
          console.log(`[AddSeriesModal] Search returned ${allResults.length} results (attempt ${attempt + 1})`);
          
          // If we got results, break out of retry loop
          if (allResults.length > 0) {
            break;
          }
          
          // No results - wait and retry if we haven't exhausted retries
          if (attempt < MAX_RETRIES) {
            console.log(`[AddSeriesModal] No results, retrying in ${RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
        } catch (searchError) {
          console.error(`[AddSeriesModal] Search attempt ${attempt + 1} failed:`, searchError);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
        }
      }

      if (allResults.length === 0) {
        throw new Error(`No torrents found for ${title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`);
      }

      // Filter torrents by minimum quality from user settings
      const effectiveMinQuality = userSettings?.minQuality || '720p';
      const qualityFilteredTorrents = filterTorrentsByQuality(allResults, effectiveMinQuality);
      
      if (qualityFilteredTorrents.length === 0) {
        throw new Error(`No torrents matching quality threshold (${effectiveMinQuality}) found for ${title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`);
      }

      // Get the best torrent - prioritize by indexer priority first, then seeders
      const bestTorrent = getBestTorrent(qualityFilteredTorrents);
      
      if (!bestTorrent) {
        throw new Error(`No suitable torrents found for ${title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`);
      }
      
      console.log(`[AddSeriesModal] Selected best torrent with ${bestTorrent.seeders} seeders: ${bestTorrent.title}`);

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

      // Download the torrent
      const downloadPayload = {
        downloadUrl: bestTorrent.downloadUrl,
        protocol: bestTorrent.protocol, // Pass protocol to help backend select correct client
        // History information
        releaseName: bestTorrent.title,
        indexer: bestTorrent.indexer,
        indexerId: bestTorrent.indexerId,
        size: bestTorrent.size,
        sizeFormatted: bestTorrent.sizeFormatted,
        seeders: bestTorrent.seeders,
        leechers: bestTorrent.leechers,
        quality: quality,
        source: 'AddSeriesModal',
        mediaType: 'tv',
        mediaTitle: title,
        tmdbId: media.id,
        seasonNumber: seasonNumber,
        episodeNumber: episodeNumber,
      };

      console.log('[AddSeriesModal] Sending download request with history data:', downloadPayload);

      const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, downloadPayload);

      if (downloadResponse.data.success) {
        setDownloadedEpisodes(prev => new Set(prev).add(episodeKey));
      } else {
        throw new Error(downloadResponse.data.error || "Failed to download");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "Download failed";
      setDownloadErrors(prev => new Map(prev).set(episodeKey, errorMsg));
    } finally {
      setDownloadingEpisodes(prev => {
        const next = new Map(prev);
        next.delete(episodeKey);
        return next;
      });
    }
  };

  const handleAddSeries = async () => {
    if (!validateBeforeAction()) {
      return;
    }

    if (!media || selectedEpisodes.size === 0) {
      showNotification('Selection Required', 'Please select at least one episode to monitor', 'warning');
      return;
    }

    setAddingSeries(true);

    try {
      // Get all selected episodes
      const episodesToDownload: SelectedEpisode[] = [];
      const selectedSeasonsArray: number[] = [];
      const selectedEpisodesArray: string[] = [];
      
      seasons.forEach(season => {
        if (season.episodes && selectedSeasons.has(season.season_number)) {
          if (!selectedSeasonsArray.includes(season.season_number)) {
            selectedSeasonsArray.push(season.season_number);
          }
          season.episodes.forEach(ep => {
            const episodeKey = `${season.season_number}-${ep.episode_number}`;
            if (selectedEpisodes.has(episodeKey)) {
              episodesToDownload.push({
                seasonNumber: season.season_number,
                episodeNumber: ep.episode_number,
                episodeName: ep.name,
              });
              selectedEpisodesArray.push(episodeKey);
            }
          });
        }
      });

      const title = media.name || media.title || '';

      // Check if user has auto_approve permission
      const hasAutoApprove = user?.permissions?.auto_approve || user?.permissions?.admin;

      // If user doesn't have auto_approve, create a request instead
      if (!hasAutoApprove) {
        console.log('[AddSeriesModal] User does not have auto_approve permission, creating request...');
        
        const posterUrl = media.poster_path 
          ? `${TMDB_IMAGE_BASE_URL}${media.poster_path}` 
          : (media.posterUrl || null);

        const requestResponse = await axios.post(`${API_BASE_URL}/api/MediaRequests`, {
          mediaType: 'series',
          tmdbId: media.id,
          title: title,
          overview: media.overview,
          posterPath: media.poster_path,
          backdropPath: tvShowDetails?.backdrop_path || null,
          releaseDate: media.first_air_date || null,
          selectedSeasons: selectedSeasonsArray,
          selectedEpisodes: selectedEpisodesArray,
          qualityProfile: 'any',
        });

        if (requestResponse.data.autoApproved) {
          showNotification('✅ Request Approved', 'Your request has been auto-approved and added to monitoring!', 'success');
        } else {
          const episodeCount = selectedEpisodesArray.length;
          showNotification('📨 Request Submitted', `Your request for ${episodeCount} episode${episodeCount > 1 ? 's' : ''} has been submitted for admin approval.`, 'info');
        }

        setTimeout(() => {
          onClose();
          if (onAddSeries) onAddSeries();
        }, 500);
        return;
      }

      // User has auto_approve - proceed with normal monitoring flow

      // Get minimum quality from user settings
      const effectiveMinQuality = userSettings?.minQuality || '720p';
      console.log('[AddSeriesModal] Using quality threshold:', effectiveMinQuality);

      // Check which episodes already exist in library - also check if they meet quality threshold
      let existingEpisodes: Set<string> = new Set();
      let existingButBelowQuality: Set<string> = new Set();
      let episodesToActuallyDownload = [...episodesToDownload];
      let allEpisodesExist = false;
      
      try {
        const checkExistsResponse = await axios.post(`${API_BASE_URL}/api/MonitoredSeries/check-exists`, {
          userId: user!.id,
          title: title,
          episodes: episodesToDownload.map(ep => ({
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
          })),
        });

        if (checkExistsResponse.data.success && checkExistsResponse.data.results) {
          // Mark existing episodes and check quality
          for (const result of checkExistsResponse.data.results) {
            if (result.exists) {
              const episodeKey = `${result.seasonNumber}-${result.episodeNumber}`;
              const existingQuality = detectQualityFromFilename(result.fileInfo?.fileName || '');
              const meetsQuality = fileMeetsQualityThreshold(existingQuality, effectiveMinQuality);
              
              if (meetsQuality) {
                existingEpisodes.add(episodeKey);
              } else {
                // Episode exists but below quality threshold - needs re-download
                existingButBelowQuality.add(episodeKey);
                console.log(`[AddSeriesModal] Episode ${episodeKey} exists at ${existingQuality} but below threshold ${effectiveMinQuality}`);
              }
            }
          }
          
          // Check if ALL episodes exist AND meet quality
          allEpisodesExist = existingEpisodes.size === episodesToDownload.length;
          
          // Filter out only episodes that exist AND meet quality threshold
          episodesToActuallyDownload = episodesToDownload.filter(
            ep => !existingEpisodes.has(`${ep.seasonNumber}-${ep.episodeNumber}`)
          );
          
          // Log info about episodes
          if (existingEpisodes.size > 0) {
            console.log(`[AddSeriesModal] ${existingEpisodes.size} episodes already exist at good quality`);
          }
          if (existingButBelowQuality.size > 0) {
            console.log(`[AddSeriesModal] ${existingButBelowQuality.size} episodes exist but need quality upgrade`);
          }
          console.log(`[AddSeriesModal] ${episodesToActuallyDownload.length} episodes to download`);
        }
      } catch (error) {
        console.log('[AddSeriesModal] Could not check for existing episodes, continuing with all...');
        // Continue if check fails
      }

      // Save series to database and get user's autoDownload setting
      const posterUrl = media.poster_path 
        ? `${TMDB_IMAGE_BASE_URL}${media.poster_path}` 
        : (media.posterUrl || null);

      const firstAirDate = media.first_air_date || null;

      const saveSeriesResponse = await axios.post(`${API_BASE_URL}/api/MonitoredSeries`, {
        userId: user!.id,
        tmdbId: media.id,
        title: title,
        posterUrl,
        firstAirDate: firstAirDate,
        overview: media.overview,
        qualityProfile: "any", // Can be made configurable later
        minAvailability: "released", // Can be made configurable later
        monitor: "all", // Can be made configurable later
        selectedSeasons: selectedSeasonsArray,
        selectedEpisodes: selectedEpisodesArray,
        status: allEpisodesExist ? 'downloaded' : 'monitoring', // Set status based on file existence
      });

      const seriesId = saveSeriesResponse.data.series?.id;
      const isUpdate = saveSeriesResponse.data.isUpdate;
      const autoDownload = saveSeriesResponse.data.autoDownload ?? true;

      console.log(`[AddSeriesModal] Series saved. autoDownload: ${autoDownload}, allEpisodesExist: ${allEpisodesExist}`);

      // If all episodes already exist, show success and close
      if (allEpisodesExist) {
        setTimeout(() => {
          onClose();
          const message = isUpdate 
            ? `Series monitoring updated! All ${existingEpisodes.size} episodes already exist in library.`
            : `Series added to monitoring! All ${existingEpisodes.size} episodes already downloaded.`;
          showNotification('✅ Success', message, 'success');
          if (onAddSeries) onAddSeries();
        }, 500);
        return;
      }

      // If autoDownload is disabled, just add to monitoring without downloading
      if (!autoDownload) {
        setTimeout(() => {
          onClose();
          let message = isUpdate 
            ? `Series monitoring updated! Will check for files periodically.`
            : `Series added to monitoring! Auto-download is disabled - will check for files periodically.`;
          if (existingEpisodes.size > 0) {
            message += `\n\n${existingEpisodes.size} episodes already exist in library.`;
          }
          showNotification('Success', message, 'success');
          if (onAddSeries) onAddSeries();
        }, 500);
        return;
      }

      // autoDownload is enabled - proceed with downloading episodes (only missing ones)
      let successCount = 0;
      let failCount = 0;

      for (const episode of episodesToActuallyDownload) {
        try {
          await downloadEpisode(episode.seasonNumber, episode.episodeNumber, episode.episodeName);
          successCount++;
          // Small delay between downloads to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failCount++;
          console.error(`Failed to download ${episode.episodeName}:`, error);
        }
      }

      // Update series status if we have a seriesId
      if (seriesId) {
        try {
          const newStatus = existingEpisodes.size > 0 && episodesToActuallyDownload.length === 0 
            ? "downloaded" 
            : (successCount > 0 ? "downloading" : "monitoring");
          await axios.put(`${API_BASE_URL}/api/MonitoredSeries/${seriesId}`, {
            status: newStatus,
          });
        } catch (error) {
          console.error("Error updating series status:", error);
        }
      }

      // Close modal and show summary
      setTimeout(() => {
        onClose();
        let summaryMessage = `Series added to monitoring!\n\n`;
        if (existingEpisodes.size > 0) {
          summaryMessage += `Already in library (${effectiveMinQuality}+): ${existingEpisodes.size} episodes\n`;
        }
        if (existingButBelowQuality.size > 0) {
          summaryMessage += `Quality upgrade needed: ${existingButBelowQuality.size} episodes\n`;
        }
        if (episodesToActuallyDownload.length > 0) {
          summaryMessage += `Successfully queued: ${successCount} episodes\nFailed: ${failCount} episodes`;
        } else if (existingEpisodes.size === 0 && existingButBelowQuality.size === 0) {
          summaryMessage += `Will search for downloads automatically.`;
        }
        
        showNotification(
          'Series Added',
          summaryMessage,
          successCount > 0 || existingEpisodes.size > 0 ? 'success' : 'info'
        );
        if (onAddSeries) onAddSeries();
      }, 1000);
    } catch (error: any) {
      console.error("Error adding series:", error);
      showNotification('Error', error.message || 'Failed to add series', 'error');
    } finally {
      setAddingSeries(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!user || !media) return;
    
    try {
      const token = localStorage.getItem('accessToken') // Fixed: use 'accessToken' not 'token';
      const response = await axios.get(
        `${API_BASE_URL}/api/Favorites/check`,
        {
          params: {
            tmdbId: media.id,
            mediaType: 'tv',
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
      const token = localStorage.getItem('accessToken') // Fixed: use 'accessToken' not 'token';
      
      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            tmdbId: media.id,
            mediaType: 'tv',
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
            mediaType: 'tv',
            title: media.name || media.title || '',
            posterUrl,
            overview: media.overview,
            releaseDate: media.first_air_date,
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
      
      if (response.data.success && response.data.hiddenIds?.series) {
        setIsHidden(response.data.hiddenIds.series.includes(media.id));
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
            mediaType: 'series',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setIsHidden(false);
        showNotification('Success', 'Series unhidden', 'success');
      } else {
        // Hide
        const posterPath = media.poster_path || null;

        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia/hide`,
          {
            tmdbId: media.id,
            mediaType: 'series',
            title: media.name || media.title || '',
            posterPath,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setIsHidden(true);
        showNotification('Success', 'Series hidden from discover pages', 'success');
      }
    } catch (error: any) {
      console.error('Error toggling hidden:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to update hidden status";
      showNotification('Error', errorMsg, 'error');
    } finally {
      setIsHiding(false);
    }
  };

  const getYear = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear();
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    return `${minutes}m`;
  };

  const getUSRating = () => {
    if (!tvShowDetails?.content_ratings?.results) return null;
    
    // Find US content rating
    const usRating = tvShowDetails.content_ratings.results.find(
      (rating) => rating.iso_3166_1 === 'US'
    );
    
    if (!usRating) return null;
    
    return {
      rating: usRating.rating || 'Not Rated',
      descriptors: usRating.descriptors || [],
    };
  };

  if (!media) return null;

  const selectedEpisodesCount = selectedEpisodes.size;
  const totalEpisodesCount = seasons.reduce((sum, season) => 
    sum + (season.episodes?.length || 0), 0
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      shouldBlockScroll={true}
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
                <h2 className="text-2xl font-bold">{media.name || media.title || 'Unknown'}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-default-500">
                  {tvShowDetails?.first_air_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      First aired: {getYear(tvShowDetails.first_air_date)}
                    </span>
                  )}
                  {tvShowDetails && tvShowDetails.vote_average > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      {tvShowDetails.vote_average.toFixed(1)}/10
                    </span>
                  )}
                  {tvShowDetails?.number_of_seasons && (
                    <span className="flex items-center gap-1">
                      <Tv size={14} />
                      {tvShowDetails.number_of_seasons} {tvShowDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                    </span>
                  )}
                  {tvShowDetails?.number_of_episodes && (
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {tvShowDetails.number_of_episodes} Episodes
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
                  href={`https://www.amazon.com/s?k=${encodeURIComponent((media.name || media.title || '') + " " + (media.first_air_date ? new Date(media.first_air_date).getFullYear() : "") + " blu-ray")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="flat"
                  startContent={<ShoppingCart size={16} />}
                >
                  Buy on Amazon
                </Button>
              {tvShowDetails?.imdb_id && (
                <Button
                  as="a"
                  href={`https://www.imdb.com/title/${tvShowDetails.imdb_id}`}
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
            {tvShowDetails?.tagline && (
              <p className="text-sm text-default-400 italic mt-1">{tvShowDetails.tagline}</p>
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
              {/* Show Info */}
              <div className="flex gap-6">
                {media.posterUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={media.posterUrl}
                      alt={media.name || media.title || 'Unknown'}
                      className="w-32 rounded-lg shadow-lg"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-default-600 leading-relaxed">
                    {tvShowDetails?.overview || media.overview || 'No overview available'}
                  </p>
                  
                  {/* Rating Information */}
                  {getUSRating() && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-default-600">Rating:</span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getUSRating()?.rating === 'TV-MA' ? 'danger' : 
                                 getUSRating()?.rating === 'TV-14' ? 'warning' : 
                                 getUSRating()?.rating === 'TV-PG' ? 'success' : 
                                 getUSRating()?.rating === 'TV-G' || getUSRating()?.rating === 'TV-Y' ? 'success' : 'default'}
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
                      </div>
                    </div>
                  )}
                  
                  {/* External Links */}
                  {(tvShowDetails?.imdb_id || tvShowDetails?.homepage || media.id) && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-default-600 mb-2">External Links:</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          as="a"
                          href={`https://www.amazon.com/s?k=${encodeURIComponent((media.name || media.title || '') + " " + (media.first_air_date ? new Date(media.first_air_date).getFullYear() : "") + " blu-ray")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          variant="flat"
                          className="bg-[#FF9900] text-white"
                          startContent={<ShoppingCart size={14} />}
                        >
                          Amazon
                        </Button>
                        {tvShowDetails?.imdb_id && (
                          <>
                          <Button
                            as="a"
                            href={`https://www.imdb.com/title/${tvShowDetails.imdb_id}`}
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
                              href={`https://www.imdb.com/title/${tvShowDetails.imdb_id}/parentalguide`}
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
                            href={`https://www.themoviedb.org/tv/${media.id}`}
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
                        {tvShowDetails?.homepage && (
                          <Button
                            as="a"
                            href={tvShowDetails.homepage}
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
                          href={`http://localhost:3012/pages/search?q=${encodeURIComponent(media.name || media.title || '')}`}
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
                  {tvShowDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {tvShowDetails.status && (
                        <div className="flex items-center gap-2 text-sm">
                          <Tv size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Status: <span className="font-medium">{tvShowDetails.status}</span>
                          </span>
                        </div>
                      )}
                      {tvShowDetails.original_language && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Language: <span className="font-medium">{tvShowDetails.original_language.toUpperCase()}</span>
                          </span>
                        </div>
                      )}
                      {tvShowDetails.popularity && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star size={16} className="text-default-400" />
                          <span className="text-default-600">
                            Popularity: <span className="font-medium">{tvShowDetails.popularity.toFixed(0)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Genres */}
                  {tvShowDetails?.genres && tvShowDetails.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {tvShowDetails.genres.map((genre) => (
                        <Chip key={genre.id} size="sm" variant="flat" color="secondary">
                          {genre.name}
                        </Chip>
                      ))}
                    </div>
                  )}

                  {/* Networks */}
                  {tvShowDetails?.networks && tvShowDetails.networks.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-default-600 mb-2">Networks:</p>
                      <div className="flex flex-wrap gap-2">
                        {tvShowDetails.networks.slice(0, 5).map((network) => (
                          <Chip key={network.id} size="sm" variant="flat">
                            {network.name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Creator/Showrunner */}
                  {tvShowDetails?.credits?.crew && (() => {
                    const creator = tvShowDetails.credits.crew.find(person => 
                      person.job === 'Creator' || person.job === 'Executive Producer' || person.department === 'Production'
                    );
                    if (creator) {
                      return (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-default-600">
                            <span className="font-semibold">Creator:</span> {creator.name}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Top Cast with Photos */}
                  {tvShowDetails?.credits?.cast && tvShowDetails.credits.cast.length > 0 && (() => {
                    const topCast = tvShowDetails.credits.cast
                      .sort((a, b) => (a.order || 999) - (b.order || 999))
                      .slice(0, 10);
                    return (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-default-600 mb-3">Cast:</p>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {topCast.map((actor) => (
                            <div 
                              key={actor.id} 
                              className={`flex-shrink-0 text-center group ${onCastClick ? 'cursor-pointer' : ''}`}
                              onClick={() => onCastClick && onCastClick({ id: actor.id, name: actor.name })}
                            >
                              <div className={`relative w-16 h-16 rounded-full overflow-hidden bg-default-100 mb-1 mx-auto ${onCastClick ? 'group-hover:ring-2 group-hover:ring-primary transition-all' : ''}`}>
                                {actor.profile_path ? (
                                  <img
                                    src={`${TMDB_IMAGE_BASE_URL}${actor.profile_path}`}
                                    alt={actor.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Users size={24} className="text-default-400" />
                                  </div>
                                )}
                              </div>
                              <p className={`text-xs font-medium truncate max-w-[70px] ${onCastClick ? 'group-hover:text-primary' : ''}`}>
                                {actor.name}
                              </p>
                              {actor.character && (
                                <p className="text-[10px] text-default-500 truncate max-w-[70px]">
                                  {actor.character}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
                        onPress={() => {
                          const iframe = document.getElementById('tv-trailer-iframe') as HTMLIFrameElement;
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
                        }}
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
                      id="tv-trailer-iframe"
                      src={`${YOUTUBE_EMBED_URL}${trailerKey}?autoplay=0&rel=0&modestbranding=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title="TV Show Trailer"
                    />
                  </div>
                </div>
              )}

              {/* Season/Episode Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Select Seasons & Episodes</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-default-500">
                      {selectedEpisodesCount} of {totalEpisodesCount} episodes selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          // Select all episodes
                          const allEpisodes = new Set<string>();
                          seasons.forEach(season => {
                            if (season.episodes) {
                              season.episodes.forEach(ep => {
                                allEpisodes.add(`${season.season_number}-${ep.episode_number}`);
                              });
                            }
                          });
                          setSelectedEpisodes(allEpisodes);
                          const allSeasonNumbers = new Set(seasons.map(s => s.season_number));
                          setSelectedSeasons(allSeasonNumbers);
                          setSelectAllSeasons(true);
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          // Unselect all episodes
                          setSelectedEpisodes(new Set());
                          setSelectedSeasons(new Set());
                          setSelectAllSeasons(false);
                        }}
                      >
                        Unselect All
                      </Button>
                    </div>
                  </div>
                </div>

                {loadingSeasons ? (
                  <div className="flex justify-center items-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {seasons.map((season) => {
                      const isExpanded = expandedSeasons.has(season.season_number);
                      const isSeasonSelected = selectedSeasons.has(season.season_number);
                      const seasonEpisodes = season.episodes || [];
                      const selectedInSeason = seasonEpisodes.filter(ep => 
                        selectedEpisodes.has(`${season.season_number}-${ep.episode_number}`)
                      ).length;

                      return (
                        <Card key={season.id} className="hover:bg-content2">
                          <CardBody className="p-4">
                            <div className="flex items-center gap-3">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => toggleSeasonExpansion(season.season_number)}
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </Button>
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isSeasonSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSeason(season.season_number);
                                  }}
                                  className="w-4 h-4 rounded border-default-300 text-primary focus:ring-primary focus:ring-2 cursor-pointer flex-shrink-0"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="font-semibold">
                                    {season.name || `Season ${season.season_number}`}
                                  </span>
                                  <span className="text-sm text-default-500">
                                    ({selectedInSeason}/{seasonEpisodes.length} episodes)
                                  </span>
                                  {season.air_date && (
                                    <span className="text-xs text-default-400">
                                      {getYear(season.air_date)}
                                    </span>
                                  )}
                                </div>
                              </label>
                              <Button
                                size="sm"
                                color={seasonShowingTorrents === season.season_number ? "secondary" : "primary"}
                                variant="flat"
                                startContent={<Download size={14} />}
                                onPress={() => {
                                  if (seasonShowingTorrents === season.season_number) {
                                    setSeasonShowingTorrents(null);
                                  } else {
                                    fetchSeasonTorrents(season.season_number);
                                  }
                                }}
                                isLoading={loadingSeasonTorrents.get(season.season_number)}
                              >
                                {seasonShowingTorrents === season.season_number ? "Hide" : "Search"}
                              </Button>
                            </div>

                            {/* Season Torrents List */}
                            {seasonShowingTorrents === season.season_number && (
                              <div className="mt-4 ml-8">
                                {loadingSeasonTorrents.get(season.season_number) ? (
                                  <div className="flex justify-center items-center py-4">
                                    <Spinner size="sm" />
                                  </div>
                                ) : (seasonTorrents.get(season.season_number) || []).length > 0 ? (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-default-500">Season {season.season_number} Torrents</span>
                                      <Chip size="sm" variant="flat" color="secondary">
                                        {(seasonTorrents.get(season.season_number) || []).length} result{(seasonTorrents.get(season.season_number) || []).length !== 1 ? 's' : ''}
                                      </Chip>
                                    </div>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {seasonTorrents.get(season.season_number)?.map((torrent) => {
                                      const torrentId = torrent.id;
                                      const isDownloadingTorrent = downloadingTorrents.has(torrentId);
                                      const isDownloadedTorrent = downloadTorrentSuccess.has(torrentId);
                                      const torrentError = downloadTorrentErrors.get(torrentId);

                                      return (
                                        <Card key={torrent.id} className="hover:bg-content2">
                                          <CardBody className="p-3">
                                            <div className="flex items-center justify-between gap-4">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{torrent.title}</p>
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
                                                {torrentError && (
                                                  <p className="text-xs text-danger mt-1">
                                                    {torrentError}
                                                  </p>
                                                )}
                                              </div>
                                              <Button
                                                size="sm"
                                                color={isDownloadedTorrent ? "success" : torrentError ? "danger" : "primary"}
                                                startContent={
                                                  isDownloadedTorrent ? (
                                                    <Check size={14} />
                                                  ) : (
                                                    <Download size={14} />
                                                  )
                                                }
                                                onPress={() => handleDownloadTorrent(torrent)}
                                                isLoading={isDownloadingTorrent}
                                                isDisabled={isDownloadingTorrent || isDownloadedTorrent}
                                              >
                                                {isDownloadedTorrent ? "Downloaded" : "Download"}
                                              </Button>
                                            </div>
                                          </CardBody>
                                        </Card>
                                      );
                                    })}
                                    </div>
                                  </div>
                                ) : (
                                  <Card className="bg-default-50">
                                    <CardBody className="text-center py-4">
                                      <p className="text-sm text-default-500">No torrents found for Season {season.season_number}</p>
                                    </CardBody>
                                  </Card>
                                )}
                              </div>
                            )}

                            {isExpanded && seasonEpisodes.length > 0 && (
                              <div className="ml-8 mt-3 space-y-2">
                                {seasonEpisodes.map((episode) => {
                                  const episodeKey = `${season.season_number}-${episode.episode_number}`;
                                  const isSelected = selectedEpisodes.has(episodeKey);
                                  const isDownloading = downloadingEpisodes.get(episodeKey);
                                  const isDownloaded = downloadedEpisodes.has(episodeKey);
                                  const error = downloadErrors.get(episodeKey);
                                  const isShowingTorrents = episodeShowingTorrents === episodeKey;
                                  const torrents = episodeTorrents.get(episodeKey) || [];
                                  const isLoadingTorrents = loadingEpisodeTorrents.get(episodeKey);

                                  return (
                                    <div key={episode.id}>
                                      <div
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-content1"
                                      >
                                        <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              toggleEpisode(season.season_number, episode.episode_number);
                                            }}
                                            className="w-4 h-4 rounded border-default-300 text-primary focus:ring-primary focus:ring-2 cursor-pointer flex-shrink-0"
                                          />
                                          <div className="flex flex-col flex-1">
                                            <span className="text-sm font-medium">
                                              E{String(episode.episode_number).padStart(2, '0')}: {episode.name}
                                            </span>
                                            {episode.air_date && (
                                              <span className="text-xs text-default-400">
                                                {episode.air_date}
                                              </span>
                                            )}
                                          </div>
                                        </label>
                                        <Button
                                          size="sm"
                                          color={isDownloaded ? "success" : error ? "danger" : isShowingTorrents ? "secondary" : "primary"}
                                          startContent={
                                            isDownloaded ? (
                                              <Check size={14} />
                                            ) : (
                                              <Download size={14} />
                                            )
                                          }
                                          onPress={() => {
                                            if (isShowingTorrents) {
                                              setEpisodeShowingTorrents(null);
                                            } else {
                                              fetchEpisodeTorrents(season.season_number, episode.episode_number);
                                            }
                                          }}
                                          isLoading={isLoadingTorrents}
                                          isDisabled={isDownloading || isDownloaded}
                                        >
                                          {isDownloaded ? "Downloaded" : isShowingTorrents ? "Hide" : "Search"}
                                        </Button>
                                        {error && (
                                          <p className="text-xs text-danger ml-2">{error}</p>
                                        )}
                                      </div>

                                      {/* Torrents List */}
                                      {isShowingTorrents && (
                                        <div className="ml-6 mt-2 mb-2">
                                          {isLoadingTorrents ? (
                                            <div className="flex justify-center items-center py-4">
                                              <Spinner size="sm" />
                                            </div>
                                          ) : torrents.length > 0 ? (
                                            <div>
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-default-500">Episode Torrents</span>
                                                <Chip size="sm" variant="flat" color="secondary">
                                                  {torrents.length} result{torrents.length !== 1 ? 's' : ''}
                                                </Chip>
                                              </div>
                                              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                              {torrents.map((torrent) => {
                                                const torrentId = torrent.id;
                                                const isDownloadingTorrent = downloadingTorrents.has(torrentId);
                                                const isDownloadedTorrent = downloadTorrentSuccess.has(torrentId);
                                                const torrentError = downloadTorrentErrors.get(torrentId);

                                                return (
                                                  <Card key={torrent.id} className="hover:bg-content2">
                                                    <CardBody className="p-3">
                                                      <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                          <p className="font-medium text-sm truncate">{torrent.title}</p>
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
                                                          {torrentError && (
                                                            <p className="text-xs text-danger mt-1">
                                                              {torrentError}
                                                            </p>
                                                          )}
                                                        </div>
                                                        <Button
                                                          size="sm"
                                                          color={isDownloadedTorrent ? "success" : torrentError ? "danger" : "primary"}
                                                          startContent={
                                                            isDownloadedTorrent ? (
                                                              <Check size={14} />
                                                            ) : (
                                                              <Download size={14} />
                                                            )
                                                          }
                                                          onPress={() => handleDownloadTorrent(torrent, season.season_number, episode.episode_number)}
                                                          isLoading={isDownloadingTorrent}
                                                          isDisabled={isDownloadingTorrent || isDownloadedTorrent}
                                                        >
                                                          {isDownloadedTorrent ? "Downloaded" : "Download"}
                                                        </Button>
                                                      </div>
                                                    </CardBody>
                                                  </Card>
                                                );
                                              })}
                                              </div>
                                            </div>
                                          ) : (
                                            <Card className="bg-default-50">
                                              <CardBody className="text-center py-4">
                                                <p className="text-sm text-default-500">No torrents found for this episode</p>
                                              </CardBody>
                                            </Card>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
          <Button 
            color="primary" 
            startContent={<Plus size={20} />}
            onPress={handleAddSeries}
            isLoading={addingSeries}
            isDisabled={!media || selectedEpisodes.size === 0 || loadingSeasons}
          >
            {user?.permissions?.auto_approve || user?.permissions?.admin 
              ? `Monitor Series (${selectedEpisodesCount} episodes)`
              : `Request Series (${selectedEpisodesCount} episodes)`}
          </Button>
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

export default AddSeriesModal;


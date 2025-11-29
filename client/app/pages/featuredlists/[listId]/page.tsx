"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import {
  ChevronLeft,
  Search,
  Star,
  Calendar,
  Heart,
  Film,
  Tv,
  Download,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Users,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import AddMovieModal from "@/components/AddMovieModal";
import AddSeriesModal from "@/components/AddSeriesModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/context/AuthContext";
import "@/styles/FeaturedLists.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";
const TMDB_API_KEY = "02ad41cf73db27ff46061d6f52a97342";
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
  vote_count?: number;
  popularity?: number;
  genre_ids: number[];
  genres?: string[];
  media_type?: 'movie' | 'tv';
}

interface LetterboxdList {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  author: string;
  authorUrl: string;
  listUrl: string;
  filmCount: number;
  likes: number;
  comments: number;
  category: string;
  featured: boolean;
  posterUrls: string[];
  scrapedFilms: any[];
  lastScrapedAt: string;
}

const FeaturedListDetail = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const listSlug = params.listId as string;

  const [listData, setListData] = useState<LetterboxdList | null>(null);
  const [media, setMedia] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [scrapingList, setScrapingList] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  
  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set());
  
  // Hidden media state
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [hidingIds, setHidingIds] = useState<Set<number>>(new Set());
  
  // Download state
  const [downloading, setDownloading] = useState<Set<number>>(new Set());
  const [downloadSuccess, setDownloadSuccess] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchListData();
    if (user) {
      fetchFavorites();
      fetchHiddenMedia();
    }
  }, [listSlug, user]);

  const fetchListData = async () => {
    setLoading(true);
    try {
      // First try to fetch from our database
      const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists/${listSlug}`);
      
      if (response.data.success && response.data.list) {
        setListData(response.data.list);
        
        // Get movies based on the list title
        await fetchMediaForList(response.data.list);
      } else {
        router.push('/pages/featuredlists');
      }
    } catch (error) {
      console.error('Error fetching list:', error);
      router.push('/pages/featuredlists');
    }
  };

  const fetchMediaForList = async (list: LetterboxdList, page: number = 1) => {
    if (page > 1) {
      setLoadingMore(true);
    }

    try {
      // Extract genre/type from list title for better TMDB searches
      const titleLower = list.title.toLowerCase();
      let endpoint = '/movie/top_rated';
      let extraParams: Record<string, string> = {};

      // Map list titles to TMDB endpoints/filters
      if (titleLower.includes('horror')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '27', sort_by: 'vote_average.desc', 'vote_count.gte': '300' };
      } else if (titleLower.includes('sci-fi') || titleLower.includes('science fiction')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '878', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('documentary')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '99', sort_by: 'vote_average.desc', 'vote_count.gte': '200' };
      } else if (titleLower.includes('animated') || titleLower.includes('animation')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '16', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('western')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '37', sort_by: 'vote_average.desc', 'vote_count.gte': '200' };
      } else if (titleLower.includes('comedy') || titleLower.includes('comedies')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '35', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('thriller')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '53', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('action')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '28', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('drama')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '18', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('romance') || titleLower.includes('romantic')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '10749', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('noir') || titleLower.includes('crime')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '80', sort_by: 'vote_average.desc', 'vote_count.gte': '300' };
      } else if (titleLower.includes('war')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '10752', sort_by: 'vote_average.desc', 'vote_count.gte': '300' };
      } else if (titleLower.includes('music') || titleLower.includes('musical')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '10402', sort_by: 'vote_average.desc', 'vote_count.gte': '200' };
      } else if (titleLower.includes('mystery')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '9648', sort_by: 'vote_average.desc', 'vote_count.gte': '300' };
      } else if (titleLower.includes('fantasy')) {
        endpoint = '/discover/movie';
        extraParams = { with_genres: '14', sort_by: 'vote_average.desc', 'vote_count.gte': '500' };
      } else if (titleLower.includes('fans') || titleLower.includes('popular') || titleLower.includes('million') || titleLower.includes('watched')) {
        endpoint = '/movie/popular';
      } else if (titleLower.includes('upcoming')) {
        endpoint = '/movie/upcoming';
      } else if (titleLower.includes('trending')) {
        endpoint = '/trending/movie/week';
      } else if (titleLower.includes('narrative') || titleLower.includes('feature') || titleLower.includes('top 250')) {
        endpoint = '/movie/top_rated';
      } else if (titleLower.includes('series') || titleLower.includes('tv') || titleLower.includes('show')) {
        endpoint = '/tv/top_rated';
      }

      const params: Record<string, string> = {
        api_key: TMDB_API_KEY,
        page: String(page),
        language: 'en-US',
        ...extraParams,
      };

      const urlParams = new URLSearchParams(params);
      const response = await fetch(`https://api.themoviedb.org/3${endpoint}?${urlParams}`);
      const data = await response.json();

      if (data.results) {
        const mediaType = endpoint.includes('/tv') ? 'tv' : 'movie';
        const formattedMedia = data.results.map((item: any) => ({
          ...item,
          posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
          media_type: mediaType,
        }));

        if (page === 1) {
          setMedia(formattedMedia);
        } else {
          setMedia(prev => [...prev, ...formattedMedia]);
        }

        setCurrentPage(page);
        setTotalPages(data.total_pages || 1);
        setHasMore(page < (data.total_pages || 1) && page < 25); // Limit to 25 pages
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loadingMore && listData) {
      fetchMediaForList(listData, currentPage + 1);
    }
  };

  const handleScrapeList = async () => {
    if (!listData) return;
    
    setScrapingList(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE_URL}/api/FeaturedLists/scrape/${listSlug}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh list data
      await fetchListData();
    } catch (error) {
      console.error('Error scraping list:', error);
    } finally {
      setScrapingList(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/Favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const favorites = response.data.favorites || [];
      const ids = new Set<string>(favorites.map((fav: any) => `${fav.tmdbId}-${fav.mediaType}`));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchHiddenMedia = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/HiddenMedia`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const hiddenMedia = response.data.hiddenMedia || [];
      const ids = new Set<number>(hiddenMedia.map((h: any) => h.tmdbId));
      setHiddenIds(ids);
    } catch (error) {
      console.error('Error fetching hidden media:', error);
    }
  };

  const toggleFavorite = async (mediaItem: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    const mediaType = mediaItem.media_type || 'movie';
    const favoriteKey = `${mediaItem.id}-${mediaType}`;
    const isFavorited = favoriteIds.has(favoriteKey);
    
    setFavoritingIds(prev => new Set(prev).add(mediaItem.id));
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (isFavorited) {
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { tmdbId: mediaItem.id, mediaType },
        });
        
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(favoriteKey);
          return next;
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/api/Favorites`,
          {
            tmdbId: mediaItem.id,
            mediaType,
            title: mediaItem.title || mediaItem.name || '',
            posterUrl: mediaItem.posterUrl,
            overview: mediaItem.overview,
            releaseDate: mediaItem.release_date || mediaItem.first_air_date,
            voteAverage: mediaItem.vote_average,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setFavoriteIds(prev => new Set(prev).add(favoriteKey));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoritingIds(prev => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  };

  const toggleHidden = async (mediaItem: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    const mediaType = mediaItem.media_type || 'movie';
    const isHidden = hiddenIds.has(mediaItem.id);
    
    setHidingIds(prev => new Set(prev).add(mediaItem.id));
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (isHidden) {
        await axios.delete(`${API_BASE_URL}/api/HiddenMedia`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { tmdbId: mediaItem.id, mediaType },
        });
        
        setHiddenIds(prev => {
          const next = new Set(prev);
          next.delete(mediaItem.id);
          return next;
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia`,
          {
            tmdbId: mediaItem.id,
            mediaType,
            title: mediaItem.title || mediaItem.name || '',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setHiddenIds(prev => new Set(prev).add(mediaItem.id));
      }
    } catch (error) {
      console.error('Error toggling hidden:', error);
    } finally {
      setHidingIds(prev => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  };

  const handleQuickDownload = async (mediaItem: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (downloading.has(mediaItem.id) || downloadSuccess.has(mediaItem.id)) return;
    
    setDownloading(prev => new Set(prev).add(mediaItem.id));
    
    try {
      // Open modal for download instead of quick download
      setSelectedMedia(mediaItem);
      setIsModalOpen(true);
      setDownloadSuccess(prev => new Set(prev).add(mediaItem.id));
    } catch (error) {
      console.error('Error handling download:', error);
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  };

  const handleMediaClick = (mediaItem: TMDBMedia) => {
    setSelectedMedia(mediaItem);
    setIsModalOpen(true);
  };

  // Sort and filter media
  const sortedMedia = [...media].sort((a, b) => {
    switch (sortBy) {
      case 'vote_average.desc':
        return (b.vote_average || 0) - (a.vote_average || 0);
      case 'vote_average.asc':
        return (a.vote_average || 0) - (b.vote_average || 0);
      case 'release_date.desc':
        return new Date(b.release_date || b.first_air_date || 0).getTime() - 
               new Date(a.release_date || a.first_air_date || 0).getTime();
      case 'release_date.asc':
        return new Date(a.release_date || a.first_air_date || 0).getTime() - 
               new Date(b.release_date || b.first_air_date || 0).getTime();
      case 'popularity.desc':
      default:
        return (b.popularity || 0) - (a.popularity || 0);
    }
  });

  const filteredMedia = searchQuery
    ? sortedMedia.filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        return title.includes(searchQuery.toLowerCase());
      })
    : sortedMedia;

  // Filter out hidden media
  const visibleMedia = filteredMedia.filter(item => !hiddenIds.has(item.id));

  const renderMediaCard = (item: TMDBMedia) => {
    const title = item.title || item.name || 'Untitled';
    const year = item.release_date 
      ? new Date(item.release_date).getFullYear() 
      : item.first_air_date 
        ? new Date(item.first_air_date).getFullYear() 
        : null;
    const posterUrl = item.posterUrl || (item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null);
    const mediaType = item.media_type || 'movie';
    const isFavorited = favoriteIds.has(`${item.id}-${mediaType}`);
    const isFavoriting = favoritingIds.has(item.id);
    const isHidden = hiddenIds.has(item.id);
    const isHiding = hidingIds.has(item.id);
    const isDownloading = downloading.has(item.id);
    const isDownloaded = downloadSuccess.has(item.id);

    return (
      <div
        key={item.id}
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
              {mediaType === 'tv' ? (
                <Tv size={48} className="text-default-400" />
              ) : (
                <Film size={48} className="text-default-400" />
              )}
            </div>
          )}
          
          {/* Media Type Badge - Top Left */}
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-10">
            <Chip 
              size="sm" 
              color={mediaType === 'tv' ? "secondary" : "primary"}
              variant="flat" 
              className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase backdrop-blur-md px-0.5 sm:px-1 py-0.5 h-4 sm:h-5"
            >
              {mediaType === 'tv' ? 'TV' : 'Movie'}
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

          {/* Hide Button */}
          {user && (
            <button
              onClick={(e) => toggleHidden(item, e)}
              disabled={isHiding}
              className={`absolute bottom-0.5 right-14 sm:bottom-1 sm:right-[4.5rem] z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isHidden
                  ? 'bg-warning/90 hover:bg-warning'
                  : 'bg-default-500/60 hover:bg-default-500/80'
              } ${isHiding ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isHidden ? 'Unhide' : 'Hide (never show again)'}
            >
              {isHiding ? (
                <Spinner size="sm" color="white" className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : isHidden ? (
                <EyeOff size={14} className="sm:w-4 sm:h-4 text-white" />
              ) : (
                <Eye size={14} className="sm:w-4 sm:h-4 text-white" />
              )}
            </button>
          )}

          {/* Favorite Button */}
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

          {/* Download Button */}
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

          {/* Title and Year Overlay */}
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

  if (loading && !listData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  const mediaType = listData?.title.toLowerCase().includes('tv') || 
                    listData?.title.toLowerCase().includes('series') || 
                    listData?.title.toLowerCase().includes('show') 
                    ? 'tv' : 'movie';

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Back button and title */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              isIconOnly
              variant="flat"
              onPress={() => router.push('/pages/featuredlists')}
              className="border-2 border-secondary/20 hover:border-secondary/40"
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                {listData?.title || 'Featured List'}
              </h1>
              {listData?.description && (
                <p className="text-xs sm:text-sm text-foreground/60 mt-1 line-clamp-1">
                  {listData.description}
                </p>
              )}
            </div>
          </div>

          {/* List meta info */}
          {listData && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {listData.author && (
                <Chip size="sm" variant="flat" className="bg-content2">
                  <span className="text-xs">by {listData.author.replace('/', '')}</span>
                </Chip>
              )}
              {listData.filmCount > 0 && (
                <Chip size="sm" variant="flat" startContent={<Film size={12} />} className="bg-content2">
                  {listData.filmCount.toLocaleString()} films
                </Chip>
              )}
              {listData.likes > 0 && (
                <Chip size="sm" variant="flat" startContent={<Heart size={12} />} className="bg-content2">
                  {listData.likes.toLocaleString()}
                </Chip>
              )}
              {listData.comments > 0 && (
                <Chip size="sm" variant="flat" startContent={<MessageCircle size={12} />} className="bg-content2">
                  {listData.comments}
                </Chip>
              )}
              {listData.listUrl && (
                <Button
                  as="a"
                  href={listData.listUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="flat"
                  startContent={<ExternalLink size={14} />}
                  className="bg-content2 text-xs"
                >
                  Letterboxd
                </Button>
              )}
              <Button
                size="sm"
                variant="flat"
                startContent={<RefreshCw size={14} className={scrapingList ? 'animate-spin' : ''} />}
                onPress={handleScrapeList}
                isLoading={scrapingList}
                className="bg-content2 text-xs"
              >
                Refresh
              </Button>
            </div>
          )}

          {/* Search and sort controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search size={18} className="text-default-400" />}
                classNames={{
                  inputWrapper: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
                isClearable
                onClear={() => setSearchQuery("")}
                size="sm"
              />
            </div>
            <Select
              aria-label="Sort by"
              selectedKeys={new Set([sortBy])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSortBy(selected || "popularity.desc");
              }}
              placeholder="Sort by"
              className="w-full sm:w-48"
              size="sm"
              classNames={{
                trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
              }}
            >
              <SelectItem key="popularity.desc" value="popularity.desc">Popularity ↓</SelectItem>
              <SelectItem key="vote_average.desc" value="vote_average.desc">Rating ↓</SelectItem>
              <SelectItem key="vote_average.asc" value="vote_average.asc">Rating ↑</SelectItem>
              <SelectItem key="release_date.desc" value="release_date.desc">Newest First</SelectItem>
              <SelectItem key="release_date.asc" value="release_date.asc">Oldest First</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : visibleMedia.length > 0 ? (
          <>
            <div className="mb-4 text-xs sm:text-sm text-foreground/60">
              Showing {visibleMedia.length} {mediaType === 'tv' ? 'series' : 'movies'}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
              {visibleMedia.map((item) => renderMediaCard(item))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  color="secondary"
                  variant="flat"
                  onPress={loadMore}
                  isLoading={loadingMore}
                  size="lg"
                  className="border-2 border-secondary/20"
                >
                  Load More
                </Button>
              </div>
            )}

            {!hasMore && visibleMedia.length > 0 && (
              <div className="text-center py-8 text-xs sm:text-sm text-foreground/60">
                No more results to load
              </div>
            )}
          </>
        ) : (
          <Card className="bg-content1 border border-secondary/20">
            <CardBody className="text-center py-16">
              <Film size={64} className="mx-auto mb-4 text-default-300" />
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-default-500 mb-4">
                {searchQuery 
                  ? `No ${mediaType === 'tv' ? 'series' : 'movies'} matching "${searchQuery}"`
                  : `No ${mediaType === 'tv' ? 'series' : 'movies'} available in this list yet.`
                }
              </p>
              {searchQuery && (
                <Button color="secondary" variant="flat" onPress={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modals */}
      {selectedMedia && (
        mediaType === 'tv' || selectedMedia.media_type === 'tv' ? (
          <AddSeriesModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedMedia(null);
            }}
            media={selectedMedia}
            onAddSeries={() => {
              if (user) {
                fetchFavorites();
              }
            }}
          />
        ) : (
          <AddMovieModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedMedia(null);
            }}
            media={selectedMedia}
            onAddMovie={() => {
              if (user) {
                fetchFavorites();
              }
            }}
          />
        )
      )}
    </div>
  );
};

export default FeaturedListDetail;

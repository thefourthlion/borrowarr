"use client";
import React, { useState, useEffect } from "react";
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
  Heart,
  Film,
  Tv,
  Download,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import AddMovieModal from "@/components/AddMovieModal";
import AddSeriesModal from "@/components/AddSeriesModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PlexBadge } from "@/components/PlexBadge";
import { usePlexLibrary } from "@/hooks/usePlexLibrary";
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
  media_type?: "movie" | "tv";
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
  const { hasConnection, isInPlex } = usePlexLibrary();
  const listSlug = params.listId as string;

  const [listData, setListData] = useState<LetterboxdList | null>(null);
  const [media, setMedia] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [downloadSuccess, setDownloadSuccess] = useState<Set<number>>(
    new Set(),
  );

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
      const response = await axios.get(
        `${API_BASE_URL}/api/FeaturedLists/${listSlug}`,
      );

      if (response.data.success && response.data.list) {
        setListData(response.data.list);

        // Get movies based on the list title
        await fetchMediaForList(response.data.list);
      } else {
        router.push("/pages/featuredlists");
      }
    } catch (error) {
      console.error("Error fetching list:", error);
      router.push("/pages/featuredlists");
    }
  };

  const fetchMediaForList = async (list: LetterboxdList) => {
    try {
      // Use scraped films when available - these are the actual movies from the list
      const scraped = list.scrapedFilms || [];
      if (scraped.length > 0) {
        const mediaFromScraped: TMDBMedia[] = scraped.map(
          (
            f: {
              slug?: string;
              title?: string;
              posterUrl?: string;
              position?: number;
            },
            idx: number,
          ) => {
            const yearMatch = (f.slug || "").match(/-(\d{4})$/);
            const year = yearMatch ? yearMatch[1] : null;
            return {
              id: 1000000 + idx,
              title: f.title || "Unknown",
              overview: "",
              poster_path: null,
              posterUrl: f.posterUrl || null,
              release_date: year ? `${year}-01-01` : undefined,
              vote_average: 0,
              genre_ids: [],
              media_type: "movie" as const,
            };
          },
        );
        // Preserve original list order (scraped films come in order from API)
        setMedia(mediaFromScraped);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Fallback: no scraped films - use TMDB keyword search from list title
      const titleLower = list.title.toLowerCase();
      let endpoint = "/movie/top_rated";
      let extraParams: Record<string, string> = {};

      // Map list titles to TMDB endpoints/filters
      if (titleLower.includes("horror")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "27",
          sort_by: "vote_average.desc",
          "vote_count.gte": "300",
        };
      } else if (
        titleLower.includes("sci-fi") ||
        titleLower.includes("science fiction")
      ) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "878",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (titleLower.includes("documentary")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "99",
          sort_by: "vote_average.desc",
          "vote_count.gte": "200",
        };
      } else if (
        titleLower.includes("animated") ||
        titleLower.includes("animation")
      ) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "16",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (titleLower.includes("western")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "37",
          sort_by: "vote_average.desc",
          "vote_count.gte": "200",
        };
      } else if (
        titleLower.includes("comedy") ||
        titleLower.includes("comedies")
      ) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "35",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (titleLower.includes("thriller")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "53",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (titleLower.includes("action")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "28",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (titleLower.includes("drama")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "18",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (
        titleLower.includes("romance") ||
        titleLower.includes("romantic")
      ) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "10749",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (titleLower.includes("noir") || titleLower.includes("crime")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "80",
          sort_by: "vote_average.desc",
          "vote_count.gte": "300",
        };
      } else if (titleLower.includes("war")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "10752",
          sort_by: "vote_average.desc",
          "vote_count.gte": "300",
        };
      } else if (
        titleLower.includes("music") ||
        titleLower.includes("musical")
      ) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "10402",
          sort_by: "vote_average.desc",
          "vote_count.gte": "200",
        };
      } else if (titleLower.includes("mystery")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "9648",
          sort_by: "vote_average.desc",
          "vote_count.gte": "300",
        };
      } else if (titleLower.includes("fantasy")) {
        endpoint = "/discover/movie";
        extraParams = {
          with_genres: "14",
          sort_by: "vote_average.desc",
          "vote_count.gte": "500",
        };
      } else if (
        titleLower.includes("fans") ||
        titleLower.includes("popular") ||
        titleLower.includes("million") ||
        titleLower.includes("watched")
      ) {
        endpoint = "/movie/popular";
      } else if (titleLower.includes("upcoming")) {
        endpoint = "/movie/upcoming";
      } else if (titleLower.includes("trending")) {
        endpoint = "/trending/movie/week";
      } else if (
        titleLower.includes("narrative") ||
        titleLower.includes("feature") ||
        titleLower.includes("top 250")
      ) {
        endpoint = "/movie/top_rated";
      } else if (
        titleLower.includes("series") ||
        titleLower.includes("tv") ||
        titleLower.includes("show")
      ) {
        endpoint = "/tv/top_rated";
      }

      const mediaType = endpoint.includes("/tv") ? "tv" : "movie";
      const maxPages = 13; // Fetch up to 13 pages (260 items) - TMDB returns 20 per page
      let allMedia: TMDBMedia[] = [];

      // Fetch all pages in parallel
      const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
      const fetchPromises = pageNumbers.map(async (page) => {
        const params: Record<string, string> = {
          api_key: TMDB_API_KEY,
          page: String(page),
          language: "en-US",
          ...extraParams,
        };

        const urlParams = new URLSearchParams(params);
        const response = await fetch(
          `https://api.themoviedb.org/3${endpoint}?${urlParams}`,
        );
        const data = await response.json();

        if (data.results) {
          return data.results.map((item: any) => ({
            ...item,
            posterUrl: item.poster_path
              ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
              : null,
            media_type: mediaType,
          }));
        }
        return [];
      });

      const results = await Promise.all(fetchPromises);
      allMedia = results.flat();

      // Remove duplicates by ID
      const uniqueMedia = Array.from(
        new Map(allMedia.map((item) => [item.id, item])).values(),
      );

      setMedia(uniqueMedia);
      setHasMore(false);
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeList = async () => {
    if (!listData) return;

    setScrapingList(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${API_BASE_URL}/api/FeaturedLists/scrape/${listSlug}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Refresh list data
      await fetchListData();
    } catch (error) {
      console.error("Error scraping list:", error);
    } finally {
      setScrapingList(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/Favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const favorites = response.data.favorites || [];
      const ids = new Set<string>(
        favorites.map((fav: any) => `${fav.tmdbId}-${fav.mediaType}`),
      );
      setFavoriteIds(ids);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchHiddenMedia = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/HiddenMedia`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const hiddenMedia = response.data.hiddenMedia || [];
      const ids = new Set<number>(hiddenMedia.map((h: any) => h.tmdbId));
      setHiddenIds(ids);
    } catch (error) {
      console.error("Error fetching hidden media:", error);
    }
  };

  const toggleFavorite = async (mediaItem: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) return;

    const mediaType = mediaItem.media_type || "movie";
    const favoriteKey = `${mediaItem.id}-${mediaType}`;
    const isFavorited = favoriteIds.has(favoriteKey);

    setFavoritingIds((prev) => new Set(prev).add(mediaItem.id));

    try {
      const token = localStorage.getItem("accessToken");

      if (isFavorited) {
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { tmdbId: mediaItem.id, mediaType },
        });

        setFavoriteIds((prev) => {
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
            title: mediaItem.title || mediaItem.name || "",
            posterUrl: mediaItem.posterUrl,
            overview: mediaItem.overview,
            releaseDate: mediaItem.release_date || mediaItem.first_air_date,
            voteAverage: mediaItem.vote_average,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setFavoriteIds((prev) => new Set(prev).add(favoriteKey));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setFavoritingIds((prev) => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  };

  const toggleHidden = async (mediaItem: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) return;

    const mediaType = mediaItem.media_type || "movie";
    const isHidden = hiddenIds.has(mediaItem.id);

    setHidingIds((prev) => new Set(prev).add(mediaItem.id));

    try {
      const token = localStorage.getItem("accessToken");

      if (isHidden) {
        await axios.delete(`${API_BASE_URL}/api/HiddenMedia`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { tmdbId: mediaItem.id, mediaType },
        });

        setHiddenIds((prev) => {
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
            title: mediaItem.title || mediaItem.name || "",
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setHiddenIds((prev) => new Set(prev).add(mediaItem.id));
      }
    } catch (error) {
      console.error("Error toggling hidden:", error);
    } finally {
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(mediaItem.id);
        return next;
      });
    }
  };

  const handleQuickDownload = async (
    mediaItem: TMDBMedia,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    if (downloading.has(mediaItem.id) || downloadSuccess.has(mediaItem.id))
      return;

    setDownloading((prev) => new Set(prev).add(mediaItem.id));

    try {
      // Open modal for download instead of quick download
      setSelectedMedia(mediaItem);
      setIsModalOpen(true);
      setDownloadSuccess((prev) => new Set(prev).add(mediaItem.id));
    } catch (error) {
      console.error("Error handling download:", error);
    } finally {
      setDownloading((prev) => {
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
  // Scraped films use id >= 1000000; preserve list order when sorting by popularity (default)
  const sortedMedia = [...media].sort((a, b) => {
    switch (sortBy) {
      case "vote_average.desc":
        return (b.vote_average || 0) - (a.vote_average || 0);
      case "vote_average.asc":
        return (a.vote_average || 0) - (b.vote_average || 0);
      case "release_date.desc":
        return (
          new Date(b.release_date || b.first_air_date || 0).getTime() -
          new Date(a.release_date || a.first_air_date || 0).getTime()
        );
      case "release_date.asc":
        return (
          new Date(a.release_date || a.first_air_date || 0).getTime() -
          new Date(b.release_date || b.first_air_date || 0).getTime()
        );
      case "popularity.desc":
      default:
        // Preserve list order for scraped films (no TMDB popularity)
        if ((a.id as number) >= 1000000 && (b.id as number) >= 1000000) {
          return (a.id as number) - (b.id as number);
        }
        return (b.popularity || 0) - (a.popularity || 0);
    }
  });

  const filteredMedia = searchQuery
    ? sortedMedia.filter((item) => {
        const title = (item.title || item.name || "").toLowerCase();
        return title.includes(searchQuery.toLowerCase());
      })
    : sortedMedia;

  // Filter out hidden media
  const visibleMedia = filteredMedia.filter((item) => !hiddenIds.has(item.id));

  const renderMediaCard = (item: TMDBMedia) => {
    const title = item.title || item.name || "Untitled";
    const year = item.release_date
      ? new Date(item.release_date).getFullYear()
      : item.first_air_date
        ? new Date(item.first_air_date).getFullYear()
        : null;
    const posterUrl =
      item.posterUrl ||
      (item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null);
    const mediaType = item.media_type || "movie";
    const isFavorited = favoriteIds.has(`${item.id}-${mediaType}`);
    const isFavoriting = favoritingIds.has(item.id);
    const isHidden = hiddenIds.has(item.id);
    const isHiding = hidingIds.has(item.id);
    const isDownloading = downloading.has(item.id);
    const isDownloaded = downloadSuccess.has(item.id);

    return (
      <div
        className="cursor-pointer group transition-all duration-300 hover:scale-105 hover:-translate-y-1"
        key={item.id}
        onClick={() => handleMediaClick(item)}
        style={{ height: "100%" }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md sm:rounded-lg md:rounded-xl border border-secondary/20 hover:border-secondary/60 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-secondary/20 transition-all duration-300">
          {posterUrl ? (
            <img
              alt={title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
              src={posterUrl}
            />
          ) : null}
          <PlexBadge
            show={
              !!user &&
              hasConnection &&
              isInPlex(
                title,
                year ?? undefined,
                (item.media_type || mediaType) === "tv" ? "tv" : "movie",
              )
            }
            title="On Plex"
          />
          {!posterUrl && (
            <div className="w-full h-full bg-default-200 flex items-center justify-center">
              {mediaType === "tv" ? (
                <Tv className="text-default-400" size={48} />
              ) : (
                <Film className="text-default-400" size={48} />
              )}
            </div>
          )}

          {/* Media Type Badge - Top Left */}
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-10">
            <Chip
              className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase backdrop-blur-md px-0.5 sm:px-1 py-0.5 h-4 sm:h-5"
              color={mediaType === "tv" ? "secondary" : "primary"}
              size="sm"
              variant="flat"
            >
              {mediaType === "tv" ? "TV" : "Movie"}
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
              className={`absolute bottom-0.5 right-14 sm:bottom-1 sm:right-[4.5rem] z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isHidden
                  ? "bg-warning/90 hover:bg-warning"
                  : "bg-default-500/60 hover:bg-default-500/80"
              } ${isHiding ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isHiding}
              onClick={(e) => toggleHidden(item, e)}
              title={isHidden ? "Unhide" : "Hide (never show again)"}
            >
              {isHiding ? (
                <Spinner
                  className="w-3 h-3 sm:w-4 sm:h-4"
                  color="white"
                  size="sm"
                />
              ) : isHidden ? (
                <EyeOff className="sm:w-4 sm:h-4 text-white" size={14} />
              ) : (
                <Eye className="sm:w-4 sm:h-4 text-white" size={14} />
              )}
            </button>
          )}

          {/* Favorite Button */}
          {user && (
            <button
              className={`absolute bottom-0.5 right-7 sm:bottom-1 sm:right-10 z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
                isFavorited
                  ? "bg-danger/90 hover:bg-danger"
                  : "bg-secondary/60 hover:bg-secondary/80"
              } ${isFavoriting ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isFavoriting}
              onClick={(e) => toggleFavorite(item, e)}
              title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
            >
              {isFavoriting ? (
                <Spinner
                  className="w-3 h-3 sm:w-4 sm:h-4"
                  color="white"
                  size="sm"
                />
              ) : (
                <Heart
                  className={`sm:w-4 sm:h-4 ${isFavorited ? "text-white fill-white" : "text-purple-300"}`}
                  size={14}
                />
              )}
            </button>
          )}

          {/* Download Button */}
          <button
            className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
              isDownloaded
                ? "bg-success/90 hover:bg-success"
                : "bg-secondary/90 hover:bg-secondary"
            } ${isDownloading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isDownloading || isDownloaded}
            onClick={(e) => handleQuickDownload(item, e)}
            title={
              isDownloaded
                ? "Downloaded"
                : isDownloading
                  ? "Downloading..."
                  : "Quick Download"
            }
          >
            {isDownloading ? (
              <Spinner
                className="w-3 h-3 sm:w-4 sm:h-4"
                color="white"
                size="sm"
              />
            ) : isDownloaded ? (
              <Check className="sm:w-4 sm:h-4 text-white" size={14} />
            ) : (
              <Download className="sm:w-4 sm:h-4 text-white" size={14} />
            )}
          </button>

          {/* Title and Year Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 group-hover:from-black/98 group-hover:via-black/90">
            <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm text-white line-clamp-2 mb-0.5 leading-tight">
              {title}
            </h3>
            {year && (
              <p className="text-[9px] sm:text-[10px] md:text-xs text-white/70">
                {year}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && !listData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner color="secondary" size="lg" />
      </div>
    );
  }

  const mediaType =
    listData?.title.toLowerCase().includes("tv") ||
    listData?.title.toLowerCase().includes("series") ||
    listData?.title.toLowerCase().includes("show")
      ? "tv"
      : "movie";

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />

      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-16 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Back button and title */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              className="border-2 border-secondary/20 hover:border-secondary/40"
              isIconOnly
              onPress={() => router.push("/pages/featuredlists")}
              variant="flat"
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                {listData?.title || "Featured List"}
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
                <Chip className="bg-content2" size="sm" variant="flat">
                  <span className="text-xs">
                    by {listData.author.replace("/", "")}
                  </span>
                </Chip>
              )}
              {listData.filmCount > 0 && (
                <Chip
                  className="bg-content2"
                  size="sm"
                  startContent={<Film size={12} />}
                  variant="flat"
                >
                  {listData.filmCount.toLocaleString()} films
                </Chip>
              )}
              {listData.likes > 0 && (
                <Chip
                  className="bg-content2"
                  size="sm"
                  startContent={<Heart size={12} />}
                  variant="flat"
                >
                  {listData.likes.toLocaleString()}
                </Chip>
              )}
              {listData.comments > 0 && (
                <Chip
                  className="bg-content2"
                  size="sm"
                  startContent={<MessageCircle size={12} />}
                  variant="flat"
                >
                  {listData.comments}
                </Chip>
              )}
              {listData.listUrl && (
                <Button
                  as="a"
                  className="bg-content2 text-xs"
                  href={listData.listUrl}
                  rel="noopener noreferrer"
                  size="sm"
                  startContent={<ExternalLink size={14} />}
                  target="_blank"
                  variant="flat"
                >
                  Letterboxd
                </Button>
              )}
              <Button
                className="bg-content2 text-xs"
                isLoading={scrapingList}
                onPress={handleScrapeList}
                size="sm"
                startContent={
                  <RefreshCw
                    className={scrapingList ? "animate-spin" : ""}
                    size={14}
                  />
                }
                variant="flat"
              >
                Refresh
              </Button>
            </div>
          )}

          {/* Search and sort controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <Input
                classNames={{
                  inputWrapper:
                    "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
                isClearable
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
                placeholder="Search titles..."
                size="sm"
                startContent={<Search className="text-default-400" size={18} />}
                value={searchQuery}
              />
            </div>
            <Select
              aria-label="Sort by"
              className="w-full sm:w-48"
              classNames={{
                trigger:
                  "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
              }}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSortBy(selected || "popularity.desc");
              }}
              placeholder="Sort by"
              selectedKeys={new Set([sortBy])}
              size="sm"
            >
              <SelectItem key="popularity.desc" value="popularity.desc">
                Popularity ↓
              </SelectItem>
              <SelectItem key="vote_average.desc" value="vote_average.desc">
                Rating ↓
              </SelectItem>
              <SelectItem key="vote_average.asc" value="vote_average.asc">
                Rating ↑
              </SelectItem>
              <SelectItem key="release_date.desc" value="release_date.desc">
                Newest First
              </SelectItem>
              <SelectItem key="release_date.asc" value="release_date.asc">
                Oldest First
              </SelectItem>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner color="secondary" size="lg" />
          </div>
        ) : visibleMedia.length > 0 ? (
          <>
            {!listData?.scrapedFilms?.length && (
              <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-foreground/80">
                This list hasn&apos;t been scraped yet. Click{" "}
                <strong>Refresh</strong> above to load the actual films from
                Letterboxd.
              </div>
            )}
            <div className="mb-4 text-xs sm:text-sm text-foreground/60">
              Showing {visibleMedia.length}{" "}
              {mediaType === "tv" ? "series" : "movies"}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
              {visibleMedia.map((item) => renderMediaCard(item))}
            </div>
          </>
        ) : (
          <Card className="bg-content1 border border-secondary/20">
            <CardBody className="text-center py-16">
              <Film className="mx-auto mb-4 text-default-300" size={64} />
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-default-500 mb-4">
                {searchQuery
                  ? `No ${mediaType === "tv" ? "series" : "movies"} matching "${searchQuery}"`
                  : `No ${mediaType === "tv" ? "series" : "movies"} available in this list yet.`}
              </p>
              {searchQuery && (
                <Button
                  color="secondary"
                  onPress={() => setSearchQuery("")}
                  variant="flat"
                >
                  Clear Search
                </Button>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modals */}
      {selectedMedia &&
        (mediaType === "tv" || selectedMedia.media_type === "tv" ? (
          <AddSeriesModal
            isOpen={isModalOpen}
            media={selectedMedia}
            onAddSeries={() => {
              if (user) {
                fetchFavorites();
              }
            }}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedMedia(null);
            }}
          />
        ) : (
          <AddMovieModal
            isOpen={isModalOpen}
            media={selectedMedia}
            onAddMovie={() => {
              if (user) {
                fetchFavorites();
              }
            }}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedMedia(null);
            }}
          />
        ))}
    </div>
  );
};

export default FeaturedListDetail;

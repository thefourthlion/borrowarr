"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
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
} from "@nextui-org/modal";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Film,
  ChevronLeft,
  Search,
  Filter,
  X,
  Calendar,
  Download,
  Check,
  Heart,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import AddMovieModal from "@/components/AddMovieModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/context/AuthContext";
import { PlexBadge } from "@/components/PlexBadge";
import { usePlexLibrary } from "@/hooks/usePlexLibrary";

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
  media_type?: "movie" | "tv";
}

interface Genre {
  id: number;
  name: string;
}

const getProviderDedupeKey = (provider: any) => {
  const name = String(provider.provider_name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (name === "amazon video" || name === "amazon prime video") return "amazon";
  if (name === "apple tv" || name === "apple tv store") return "apple";

  return name
    .replace(/\s+amazon channel$/, "")
    .replace(/\s+apple tv channel$/, "")
    .replace(/\s+roku premium channel$/, "")
    .replace(/\s+store$/, "")
    .replace(/\s+premium plus$/, "")
    .replace(/\s+premium$/, "")
    .replace(/\s+essential$/, "")
    .replace(/\s+/g, " ")
    .trim();
};

const isProviderVariant = (provider: any) => {
  const name = String(provider.provider_name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return (
    (name.includes("apple tv") && name !== "apple tv") ||
    (name.startsWith("amazon prime video") &&
      name !== "amazon prime video") ||
    name === "amazon video" ||
    name.includes(" amazon channel") ||
    name.includes(" apple tv channel") ||
    name.includes(" roku premium channel")
  );
};

const dedupeWatchProviders = (providers: any[]) => {
  const seen = new Set<string>();

  return providers.filter((provider) => {
    if (isProviderVariant(provider)) return false;

    const key = getProviderDedupeKey(provider);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const MoviesPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { hasConnection, isInPlex } = usePlexLibrary();
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
  const [downloadSuccess, setDownloadSuccess] = useState<Set<number>>(
    new Set(),
  );

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set());

  // Hidden media state
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [hidingIds, setHidingIds] = useState<Set<number>>(new Set());

  // Parental Guide data state
  const [parentalGuideData, setParentalGuideData] = useState<
    Map<
      number,
      {
        hasNudity: boolean;
        nuditySeverity: string;
        violence: string;
        profanity: string;
        alcohol: string;
        frightening: string;
      }
    >
  >(new Map());
  const [loadingParentalGuideData, setLoadingParentalGuideData] =
    useState(false);

  // Modal state for notifications
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [urlGenreName, setUrlGenreName] = useState<string | null>(null);
  const [selectedStudioName, setSelectedStudioName] = useState<string | null>(
    null,
  );

  // Person (cast) filter state
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(
    null,
  );

  // Handle URL query parameters
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    const urlType = searchParams.get("type"); // 'all', 'movie', or undefined (defaults to 'movie')
    const urlIndexerId = searchParams.get("indexerId");
    const urlGenres = searchParams.get("genres");
    const urlGenreName = searchParams.get("genreName");
    const urlStudio = searchParams.get("studio");
    const urlStudioName = searchParams.get("studioName");
    const urlSortBy = searchParams.get("sortBy");
    const urlId = searchParams.get("id"); // Single movie ID to show modal
    const urlPersonId = searchParams.get("person");
    const urlPersonName = searchParams.get("personName");

    setSearchQuery(urlQuery || "");
    if (urlIndexerId) {
      setSelectedIndexer(urlIndexerId);
    } else {
      setSelectedIndexer("all");
    }
    if (urlGenres) {
      // Support comma-separated genre IDs
      const genreIds = urlGenres
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      setSelectedGenres(new Set(genreIds));
      setUrlGenreName(urlGenreName);
      setFiltersOpen(true);
    } else {
      setSelectedGenres(new Set());
      setUrlGenreName(null);
    }
    if (urlStudio) {
      if (urlStudioName) {
        setSelectedStudioName(urlStudioName);
      } else {
        setSelectedStudioName(null);
        axios
          .get(`${API_BASE_URL}/api/TMDB/company/${urlStudio}`)
          .then((response) => {
            if (response.data.success && response.data.company?.name) {
              setSelectedStudioName(response.data.company.name);
            }
          })
          .catch((error) => {
            console.error("Error fetching studio details:", error);
          });
      }
    } else {
      setSelectedStudioName(null);
    }
    setKeywords(searchParams.get("keywords") || "");
    setSortBy(urlSortBy || "popularity.desc");
    setOriginalLanguage(searchParams.get("originalLanguage") || "all");
    if (urlPersonId) {
      const personId = parseInt(urlPersonId, 10);
      if (!isNaN(personId)) {
        setSelectedPersonId(personId);
        setSelectedPersonName(urlPersonName || null);
      }
    } else {
      setSelectedPersonId(null);
      setSelectedPersonName(null);
    }
    if (urlId) {
      // If a specific movie ID is provided, open the modal for that movie
      const movieId = parseInt(urlId, 10);
      if (!isNaN(movieId)) {
        // Fetch and open modal for this movie
        axios
          .get(`${API_BASE_URL}/api/TMDB/movie/${movieId}`)
          .then((res) => {
            if (res.data.success && res.data.movie) {
              setSelectedMedia(res.data.movie);
              setIsModalOpen(true);
            }
          })
          .catch((err) => console.error("Error fetching movie:", err));
      }
    }
  }, [searchParams]);

  const [sortBy, setSortBy] = useState("popularity.desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);

  // Filter values
  const [releaseDateFrom, setReleaseDateFrom] = useState("");
  const [releaseDateTo, setReleaseDateTo] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Set<number>>(new Set());
  const [keywords, setKeywords] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("all");
  const [runtimeMin, setRuntimeMin] = useState("");
  const [runtimeMax, setRuntimeMax] = useState("");
  const [voteAverageMin, setVoteAverageMin] = useState("");
  const [voteAverageMax, setVoteAverageMax] = useState("");
  const [voteCountMin, setVoteCountMin] = useState("");
  const [watchRegion, setWatchRegion] = useState("US");
  const [selectedProviders, setSelectedProviders] = useState<Set<number>>(
    new Set(),
  );

  // Parental Guide Filters
  const [nudityFilter, setNudityFilter] = useState("all"); // "all", "none", "mild", "moderate", "severe"
  const [violenceFilter, setViolenceFilter] = useState("all");
  const [profanityFilter, setProfanityFilter] = useState("all");
  const [alcoholFilter, setAlcoholFilter] = useState("all");
  const [frighteningFilter, setFrighteningFilter] = useState("all");

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [watchProviders, setWatchProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [indexers, setIndexers] = useState<any[]>([]);
  const [selectedIndexer, setSelectedIndexer] = useState<string>("all");

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const fetchRequestIdRef = useRef(0);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      router.replace(
        queryString
          ? `/pages/discover/movies?${queryString}`
          : "/pages/discover/movies",
        { scroll: false },
      );
    },
    [router, searchParams],
  );

  const showNotification = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
  ) => {
    setNotificationModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeNotification = () => {
    setNotificationModal((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    setReleaseDateFrom("");
    setReleaseDateTo("");
    setRuntimeMin("");
    setRuntimeMax("");
    setVoteCountMin("");
    setNudityFilter("all");
    setViolenceFilter("all");
    setProfanityFilter("all");
    setAlcoholFilter("all");
    setFrighteningFilter("all");
  }, []);

  // Fetch genres
  useEffect(() => {
    setLoadingGenres(true);
    axios
      .get(`${API_BASE_URL}/api/TMDB/genres`, { params: { type: "movie" } })
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
    axios
      .get(`${API_BASE_URL}/api/TMDB/watch/providers`, {
        params: { region: watchRegion, type: "movie" },
      })
      .then((response) => {
        if (response.data.success) {
          setWatchProviders(dedupeWatchProviders(response.data.providers || []));
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

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    axios
      .get(`${API_BASE_URL}/api/Indexers/read`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (response.data.data) {
          setIndexers(
            response.data.data.filter((idx: any) => idx.enabled) || [],
          );
        }
      })
      .catch((error) => {
        console.error("Error fetching indexers:", error);
      });
  }, [user]);

  // Fetch favorites
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("accessToken");
      axios
        .get(`${API_BASE_URL}/api/Favorites/ids?mediaType=movie`, {
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

  // Fetch hidden media
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("accessToken");
      axios
        .get(`${API_BASE_URL}/api/HiddenMedia?mediaType=movie`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          if (response.data.success && response.data.hiddenIds?.movies) {
            setHiddenIds(new Set(response.data.hiddenIds.movies));
          }
        })
        .catch((error) => {
          console.error("Error fetching hidden media:", error);
        });
    }
  }, [user]);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (selectedGenres.size > 0) count++;
    if (keywords.trim()) count++;
    if (searchParams.get("studio")) count++;
    if (originalLanguage !== "all") count++;
    if (voteAverageMin) count++;
    if (voteAverageMax) count++;
    if (selectedProviders.size > 0) count++;
    setActiveFilters(count);
  }, [
    selectedGenres,
    keywords,
    searchParams,
    originalLanguage,
    voteAverageMin,
    voteAverageMax,
    selectedProviders,
  ]);

  // Fetch movies
  const fetchMovies = useCallback(
    async (page = 1, append = false) => {
      const requestId = ++fetchRequestIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        let endpoint: string;
        const params: any = { page };
        const paramQuery = searchParams.get("q") || debouncedSearchQuery;
        const paramGenres = searchParams.get("genres");
        const paramSortBy = searchParams.get("sortBy") || sortBy;
        const paramOriginalLanguage =
          searchParams.get("originalLanguage") || originalLanguage;
        const paramKeywords = searchParams.get("keywords") || keywords;
        const paramIndexer = searchParams.get("indexerId") || selectedIndexer;
        const paramStudio = searchParams.get("studio");

        // If searching by person (cast member), use person movies endpoint
        if (selectedPersonId) {
          endpoint = `${API_BASE_URL}/api/TMDB/person/${selectedPersonId}/movies`;
          params.sortBy = paramSortBy;
        }
        // If searching, use search endpoint
        else if (paramQuery.trim()) {
          endpoint = `${API_BASE_URL}/api/TMDB/search`;
          params.query = paramQuery.trim();
          // Get search type from URL or default to 'movie' for movies page
          const urlType = searchParams.get("type");
          params.type = urlType === "all" ? "both" : "movie";
          // Add indexer filter if selected
          if (paramIndexer !== "all") {
            params.indexerIds = paramIndexer;
          }
        } else {
          // Use discover endpoint with all filters
          endpoint = `${API_BASE_URL}/api/TMDB/discover/movies`;

          // Add all filter parameters
          params.sortBy = paramSortBy;
          if (paramGenres) {
            params.genres = paramGenres;
          } else if (selectedGenres.size > 0) {
            params.genres = Array.from(selectedGenres).join(",");
          }
          if (paramOriginalLanguage !== "all") {
            params.originalLanguage = paramOriginalLanguage;
          }
          if (voteAverageMin) params.voteAverageMin = voteAverageMin;
          if (voteAverageMax) params.voteAverageMax = voteAverageMax;
          if (paramKeywords.trim()) params.keywords = paramKeywords.trim();
          if (paramStudio) params.studio = paramStudio;
          if (selectedProviders.size > 0) {
            params.watchProviders = Array.from(selectedProviders).join("|");
            params.watchRegion = watchRegion;
          }
        }

        const response = await axios.get(endpoint, { params });
        if (requestId !== fetchRequestIdRef.current) return;

        if (response.data.success) {
          const results = response.data.results || [];

          if (append) {
            setMedia((prev) => {
              // Create a Map to deduplicate by item.id
              const existingIds = new Set(
                prev.map((item: TMDBMedia) => item.id),
              );
              const newResults = results.filter(
                (item: TMDBMedia) => !existingIds.has(item.id),
              );
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
        if (requestId !== fetchRequestIdRef.current) return;
        console.error("Error fetching movies:", error);
      } finally {
        if (requestId === fetchRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [
      debouncedSearchQuery,
      sortBy,
      releaseDateFrom,
      releaseDateTo,
      selectedGenres,
      originalLanguage,
      runtimeMin,
      runtimeMax,
      voteAverageMin,
      voteAverageMax,
      voteCountMin,
      keywords,
      watchRegion,
      selectedProviders,
      nudityFilter,
      violenceFilter,
      profanityFilter,
      alcoholFilter,
      frighteningFilter,
      searchParams,
      selectedPersonId,
      selectedIndexer,
    ],
  );

  // Fetch parental guide data for visible movies when any content filter is active
  useEffect(() => {
    const hasActiveFilter =
      nudityFilter !== "all" ||
      violenceFilter !== "all" ||
      profanityFilter !== "all" ||
      alcoholFilter !== "all" ||
      frighteningFilter !== "all";

    if (!hasActiveFilter || media.length === 0) {
      return;
    }

    const fetchParentalGuideData = async () => {
      setLoadingParentalGuideData(true);
      console.log("🔍 Starting parental guide data fetch...");
      try {
        // Get IMDb IDs for current movies that we don't have data for yet
        const moviesNeedingData = media.filter(
          (movie) => !parentalGuideData.has(movie.id),
        );
        console.log(
          `📊 Movies needing parental guide data: ${moviesNeedingData.length}`,
        );

        if (moviesNeedingData.length === 0) {
          console.log("✅ All movies already have parental guide data");
          setLoadingParentalGuideData(false);
          return;
        }

        // Fetch movie details to get IMDb IDs (in batches)
        const batchSize = 10;
        const imdbIdMap = new Map<number, string>();

        for (let i = 0; i < moviesNeedingData.length; i += batchSize) {
          const batch = moviesNeedingData.slice(i, i + batchSize);
          console.log(
            `📦 Fetching IMDb IDs for batch ${Math.floor(i / batchSize) + 1} (${batch.length} movies)`,
          );
          const detailsPromises = batch.map((movie) =>
            axios
              .get(`${API_BASE_URL}/api/TMDB/movie/${movie.id}`)
              .then((res) => ({
                tmdbId: movie.id,
                title: movie.title,
                imdbId: res.data.movie?.imdb_id,
              }))
              .catch(() => ({
                tmdbId: movie.id,
                title: movie.title,
                imdbId: null,
              })),
          );

          const results = await Promise.all(detailsPromises);
          results.forEach(({ tmdbId, title, imdbId }) => {
            if (imdbId) {
              console.log(`  ✓ ${title} (TMDb:${tmdbId}) → ${imdbId}`);
              imdbIdMap.set(tmdbId, imdbId);
            } else {
              console.log(`  ✗ ${title} (TMDb:${tmdbId}) - No IMDb ID`);
            }
          });
        }

        console.log(`📊 Total movies with IMDb IDs: ${imdbIdMap.size}`);

        if (imdbIdMap.size === 0) {
          setLoadingParentalGuideData(false);
          return;
        }

        // Fetch parental guide data
        const items = Array.from(imdbIdMap.entries()).map(
          ([tmdbId, imdbId]) => ({
            imdbId,
            tmdbId,
            mediaType: "movie",
          }),
        );

        console.log(
          `🌐 Querying parental guide API with ${items.length} items...`,
        );
        const response = await axios
          .post(`${API_BASE_URL}/api/ParentalGuide/check-batch`, {
            items,
          })
          .catch((err) => {
            console.warn("❌ Parental guide API error:", err.message);
            return { data: { success: true, nudityMap: {} } };
          });

        console.log(`✅ Parental guide API response:`, response.data);

        if (response.data.success && response.data.nudityMap) {
          const newParentalGuideData = new Map(parentalGuideData);
          let mappedCount = 0;

          // Map IMDb IDs back to TMDb IDs
          Object.entries(response.data.nudityMap).forEach(
            ([imdbId, data]: [string, any]) => {
              // Find the TMDb ID for this IMDb ID
              let tmdbId: number | null = null;
              imdbIdMap.forEach((iid, tid) => {
                if (iid === imdbId && tmdbId === null) {
                  tmdbId = tid;
                }
              });

              if (tmdbId) {
                const movieTitle =
                  moviesNeedingData.find((m) => m.id === tmdbId)?.title ||
                  "Unknown";
                console.log(
                  `  ✓ ${movieTitle} (${imdbId}): Nudity=${data.severity}, Violence=${data.violence}, Profanity=${data.profanity}`,
                );
                newParentalGuideData.set(tmdbId, {
                  hasNudity: data.hasNudity,
                  nuditySeverity: data.severity,
                  violence: data.violence || "None",
                  profanity: data.profanity || "None",
                  alcohol: data.alcohol || "None",
                  frightening: data.frightening || "None",
                });
                mappedCount++;
              } else {
                console.warn(
                  `  ⚠️ Could not map IMDb ID ${imdbId} back to TMDb ID`,
                );
              }
            },
          );

          console.log(
            `📊 Mapped ${mappedCount} movies with parental guide data`,
          );
          setParentalGuideData(newParentalGuideData);
        }
      } catch (error) {
        console.warn(
          "Error fetching parental guide data (this is normal if server was just started):",
          error,
        );
      } finally {
        setLoadingParentalGuideData(false);
      }
    };

    fetchParentalGuideData();
  }, [
    media,
    nudityFilter,
    violenceFilter,
    profanityFilter,
    alcoholFilter,
    frighteningFilter,
  ]);

  useEffect(() => {
    setMedia([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchMovies(1, false);
  }, [fetchMovies]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore || !hasMore) return;

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user is 200px from bottom
      if (scrollTop + windowHeight >= documentHeight - 200) {
        const nextPage = currentPage + 1;
        if (nextPage <= totalPages) {
          fetchMovies(nextPage, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentPage, totalPages, hasMore, loading, loadingMore, fetchMovies]);

  const getMediaTitle = (item: TMDBMedia) => {
    return item.title || item.name || "Unknown";
  };

  const handleMediaClick = (item: TMDBMedia) => {
    setSelectedMedia(item);
    setIsModalOpen(true);
  };

  const handleQuickDownload = async (item: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      showNotification(
        "Login Required",
        "Please log in to download movies",
        "warning",
      );
      return;
    }

    const movieId = item.id;
    setDownloading((prev) => new Set(prev).add(movieId));

    try {
      const title = item.title || item.name || "";
      const year = item.release_date
        ? new Date(item.release_date).getFullYear()
        : item.first_air_date
          ? new Date(item.first_air_date).getFullYear()
          : "";

      const hasAutoApprove =
        user?.permissions?.auto_approve || user?.permissions?.admin;

      if (!hasAutoApprove) {
        await axios.post(`${API_BASE_URL}/api/MediaRequests`, {
          mediaType: "movie",
          tmdbId: item.id,
          title,
          overview: item.overview,
          posterPath: item.poster_path,
          releaseDate: item.release_date || null,
          qualityProfile: "any",
        });

        setDownloadSuccess((prev) => new Set(prev).add(movieId));
        showNotification(
          "Request Submitted",
          `${title} has been submitted for admin approval.`,
          "info",
        );
        setTimeout(() => {
          setDownloadSuccess((prev) => {
            const next = new Set(prev);
            next.delete(movieId);
            return next;
          });
        }, 3000);
        return;
      }

      // Build search query: "Movie Title year"
      const searchQuery = year ? `${title} ${year}` : title;

      // Search for torrents using the Search API
      const token = localStorage.getItem("accessToken");
      const torrentResponse = await axios.get(`${API_BASE_URL}/api/Search`, {
        params: {
          query: searchQuery,
          categoryIds: "2000", // Movies
          limit: 100,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: 30000,
      });

      const results = torrentResponse.data.results || [];

      if (results.length === 0) {
        throw new Error(`No torrents found for ${title}`);
      }

      // Sort by indexer priority first (lower = higher priority), then by seeders
      results.sort((a: any, b: any) => {
        const aPriority = a.indexerPriority ?? 25;
        const bPriority = b.indexerPriority ?? 25;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        const aSeeders = a.seeders ?? 0;
        const bSeeders = b.seeders ?? 0;
        return bSeeders - aSeeders;
      });

      // Get the best torrent (first after sorting)
      const bestTorrent = results[0];

      // Extract quality from torrent title
      const titleLower = bestTorrent.title.toLowerCase();
      let quality = "SD";
      if (
        titleLower.includes("2160p") ||
        titleLower.includes("4k") ||
        titleLower.includes("uhd")
      ) {
        quality = "2160p";
      } else if (titleLower.includes("1080p")) {
        quality = "1080p";
      } else if (titleLower.includes("720p")) {
        quality = "720p";
      }

      // Save movie to monitored list
      const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : item.posterUrl || null;

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
        status: "downloading",
      });

      // Download the torrent with full history data
      const downloadResponse = await axios.post(
        `${API_BASE_URL}/api/DownloadClients/grab`,
        {
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
          source: "QuickDownload",
          mediaType: "movies",
          mediaTitle: title,
          tmdbId: item.id,
        },
      );

      if (downloadResponse.data.success) {
        setDownloadSuccess((prev) => new Set(prev).add(movieId));
        showNotification(
          "Download Started",
          `Downloading: ${bestTorrent.title}`,
          "success",
        );
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
      const errorMsg =
        error.response?.data?.error || error.message || "Download failed";
      showNotification("Download Error", errorMsg, "error");
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
      showNotification(
        "Login Required",
        "Please log in to add favorites",
        "warning",
      );
      return;
    }

    const favoriteKey = `${item.id}-movie`;
    const isFavorited = favoriteIds.has(favoriteKey);

    setFavoritingIds((prev) => new Set(prev).add(item.id));

    try {
      const token = localStorage.getItem("accessToken");

      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            tmdbId: item.id,
            mediaType: "movie",
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
          : item.posterUrl || null;

        const response = await axios.post(
          `${API_BASE_URL}/api/Favorites`,
          {
            tmdbId: item.id,
            mediaType: "movie",
            title: item.title || item.name || "",
            posterUrl,
            overview: item.overview,
            releaseDate: item.release_date,
            voteAverage: item.vote_average,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        console.log("Favorite added successfully:", response.data);
        setFavoriteIds((prev) => new Set(prev).add(favoriteKey));
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      console.error("Error response:", error.response?.data);
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to update favorite";
      const errorDetails = error.response?.data?.details
        ? ` (${error.response.data.details})`
        : "";
      showNotification("Error", `${errorMsg}${errorDetails}`, "error");
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
      showNotification(
        "Login Required",
        "Please log in to hide content",
        "warning",
      );
      return;
    }

    const isHidden = hiddenIds.has(item.id);

    setHidingIds((prev) => new Set(prev).add(item.id));

    try {
      const token = localStorage.getItem("accessToken");

      if (isHidden) {
        // Unhide
        await axios.post(
          `${API_BASE_URL}/api/HiddenMedia/unhide`,
          {
            tmdbId: item.id,
            mediaType: "movie",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
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
            mediaType: "movie",
            title: item.title || item.name || "",
            posterPath,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setHiddenIds((prev) => new Set(prev).add(item.id));
      }
    } catch (error: any) {
      console.error("Error toggling hidden:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to update hidden status";
      showNotification("Error", errorMsg, "error");
    } finally {
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const clearFilters = () => {
    setReleaseDateFrom("");
    setReleaseDateTo("");
    setSelectedGenres(new Set());
    setKeywords("");
    setOriginalLanguage("all");
    setRuntimeMin("");
    setRuntimeMax("");
    setVoteAverageMin("");
    setVoteAverageMax("");
    setVoteCountMin("");
    setSelectedProviders(new Set());
    setNudityFilter("all");
    setViolenceFilter("all");
    setProfanityFilter("all");
    setAlcoholFilter("all");
    setFrighteningFilter("all");
    setUrlGenreName(null);
    setSelectedStudioName(null);
    updateSearchParams({
      genres: null,
      genreName: null,
      studio: null,
      studioName: null,
      keywords: null,
      originalLanguage: null,
    });
  };

  const toggleProvider = (providerId: number) => {
    setSelectedProviders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  const selectedGenreKeys = new Set(
    Array.from(selectedGenres).map((genreId) => genreId.toString()),
  );

  const selectedGenreNames = genres
    .filter((genre) => selectedGenres.has(genre.id))
    .map((genre) => genre.name);
  const displayGenreNames =
    selectedGenreNames.length > 0
      ? selectedGenreNames
      : urlGenreName
        ? [urlGenreName]
        : [];

  const renderMediaCard = (item: TMDBMedia) => {
    const title = getMediaTitle(item);
    const year = item.release_date
      ? new Date(item.release_date).getFullYear()
      : null;
    const posterUrl =
      item.posterUrl ||
      (item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null);
    const isDownloading = downloading.has(item.id);
    const isDownloaded = downloadSuccess.has(item.id);
    const canAutoApprove = Boolean(
      user?.permissions?.auto_approve || user?.permissions?.admin,
    );
    const isFavorited = favoriteIds.has(`${item.id}-movie`);
    const isFavoriting = favoritingIds.has(item.id);
    const isHidden = hiddenIds.has(item.id);
    const isHiding = hidingIds.has(item.id);

    return (
      <div
        className="cursor-pointer group transition-all duration-300 hover:scale-105 hover:-translate-y-1"
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
          ) : (
            <div className="w-full h-full bg-default-200 flex items-center justify-center">
              <Film className="text-default-400" size={48} />
            </div>
          )}

          {/* Plex badge - Bottom Left (when in library) */}
          <PlexBadge
            show={
              !!user &&
              hasConnection &&
              isInPlex(title, year ?? undefined, "movie")
            }
            title="On Plex"
          />

          {/* Media Type Badge - Top Left */}
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-10">
            <Chip
              className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase backdrop-blur-md px-0.5 sm:px-1 py-0.5 h-4 sm:h-5"
              color="primary"
              size="sm"
              variant="flat"
            >
              Movie
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

          {/* Hide Button - Bottom Right (left of favorite) */}
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

          {/* Favorite Button - Bottom Right (left of download) */}
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

          {/* Download Button - Bottom Right */}
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
                ? canAutoApprove
                  ? "Downloaded"
                  : "Requested"
                : isDownloading
                  ? canAutoApprove
                    ? "Downloading..."
                    : "Requesting..."
                  : canAutoApprove
                    ? "Quick Download"
                    : "Quick Request"
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

          {/* Title and Year Overlay - Bottom */}
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Search - sticky so search bar stays visible */}
      <div className="border-b border-secondary/20 sticky top-16 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <Button
                  aria-label="Go back"
                  className="flex-shrink-0"
                  isIconOnly
                  onPress={() => router.back()}
                  size="sm"
                  variant="light"
                >
                  <ChevronLeft size={20} />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                    {selectedPersonName ? (
                      <>Movies with {selectedPersonName}</>
                    ) : searchQuery ? (
                      <>
                        Search: &quot;{searchQuery}&quot;
                        {searchParams.get("type") === "all" && " (All Media)"}
                      </>
                    ) : displayGenreNames.length > 0 ? (
                      <>{displayGenreNames.join(", ")} Movies</>
                    ) : selectedStudioName ? (
                      <>{selectedStudioName} Movies</>
                    ) : (
                      "Movies"
                    )}
                  </h1>
                  <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                    {selectedPersonName
                      ? `Browse all movies featuring ${selectedPersonName}`
                      : displayGenreNames.length > 0
                        ? `Movies filtered by ${displayGenreNames.join(", ")}`
                        : selectedStudioName
                          ? `Movies from ${selectedStudioName}`
                      : "Discover and explore movies"}
                  </p>
                </div>
              </div>
            </div>
            {/* Search and Controls - inside sticky header */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <Input
                  className="flex-1"
                  classNames={{
                    inputWrapper:
                      "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                  }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() =>
                    updateSearchParams({ q: searchQuery.trim() || null })
                  }
                  placeholder="Search Movies & TV"
                  size="sm"
                  startContent={<Search className="text-secondary" size={18} />}
                  value={searchQuery}
                />
                {selectedPersonName && (
                  <Chip
                    className="flex-shrink-0"
                    color="secondary"
                    onClose={() => {
                      router.push("/pages/discover/movies");
                    }}
                    size="sm"
                    variant="flat"
                  >
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {selectedPersonName}
                    </span>
                  </Chip>
                )}
                {selectedStudioName && (
                  <Chip
                    className="flex-shrink-0"
                    color="secondary"
                    onClose={() =>
                      updateSearchParams({
                        studio: null,
                        studioName: null,
                      })
                    }
                    size="sm"
                    variant="flat"
                  >
                    {selectedStudioName}
                  </Chip>
                )}
                {indexers.length > 0 && (
                  <Select
                    aria-label="Select indexer"
                    className="w-32 flex-shrink-0"
                    classNames={{
                      trigger:
                        "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                    }}
                    items={[{ id: "all", name: "All Indexers" }, ...indexers]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setSelectedIndexer(selected || "all");
                      updateSearchParams({
                        indexerId: selected && selected !== "all" ? selected : null,
                      });
                    }}
                    placeholder="All Indexers"
                    selectedKeys={new Set([selectedIndexer])}
                    size="sm"
                  >
                    {(indexer: any) => (
                      <SelectItem
                        key={indexer.id.toString()}
                        value={indexer.id.toString()}
                      >
                        {indexer.name}
                      </SelectItem>
                    )}
                  </Select>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  aria-label="Sort movies"
                  className="w-40 sm:w-48"
                  classNames={{
                    trigger:
                      "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                  }}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setSortBy(selected || "popularity.desc");
                    updateSearchParams({
                      sortBy:
                        selected && selected !== "popularity.desc"
                          ? selected
                          : null,
                    });
                  }}
                  placeholder="Sort by"
                  selectedKeys={new Set([sortBy])}
                  size="sm"
                >
                  <SelectItem key="popularity.desc" value="popularity.desc">
                    Popularity Descending
                  </SelectItem>
                  <SelectItem key="popularity.asc" value="popularity.asc">
                    Popularity Ascending
                  </SelectItem>
                  <SelectItem key="vote_average.desc" value="vote_average.desc">
                    Rating Descending
                  </SelectItem>
                  <SelectItem key="release_date.desc" value="release_date.desc">
                    Release Date Descending
                  </SelectItem>
                  <SelectItem key="release_date.asc" value="release_date.asc">
                    Release Date Ascending
                  </SelectItem>
                </Select>
                <Button
                  className={
                    activeFilters > 0
                      ? "btn-glow"
                      : "border-2 border-secondary/20 hover:border-secondary/40"
                  }
                  color={activeFilters > 0 ? "secondary" : "default"}
                  onPress={() => setFiltersOpen(!filtersOpen)}
                  size="sm"
                  startContent={<Filter size={18} />}
                  variant={activeFilters > 0 ? "solid" : "bordered"}
                >
                  <span className="hidden sm:inline">
                    {activeFilters} Active
                  </span>
                  <span className="sm:hidden">{activeFilters}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={`max-w-[2400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-10 ${
          filtersOpen
            ? "pt-20 sm:pt-24 lg:pt-28"
            : "pt-10 sm:pt-12 lg:pt-14"
        }`}
      >
        {/* Filters Panel */}
        {filtersOpen && (
          <Card className="mb-6 card-interactive border-2 border-secondary/20">
            <CardBody className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  Filters
                </h2>
                <div className="flex gap-2">
                  {activeFilters > 0 && (
                    <Button
                      className="text-xs sm:text-sm"
                      color="secondary"
                      onPress={clearFilters}
                      size="sm"
                      startContent={<X size={16} />}
                      variant="light"
                    >
                      <span className="hidden sm:inline">Clear All</span>
                      <span className="sm:hidden">Clear</span>
                    </Button>
                  )}
                  <Button
                    isIconOnly
                    onPress={() => setFiltersOpen(false)}
                    size="sm"
                    variant="light"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Release Date */}
                <div className="hidden">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    Release Date
                  </label>
                  <div className="flex gap-2">
                    <Input
                      classNames={{
                        inputWrapper:
                          "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                      onChange={(e) => setReleaseDateFrom(e.target.value)}
                      placeholder="From"
                      size="sm"
                      startContent={
                        <Calendar className="text-secondary" size={16} />
                      }
                      type="date"
                      value={releaseDateFrom}
                    />
                    <Input
                      classNames={{
                        inputWrapper:
                          "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                      onChange={(e) => setReleaseDateTo(e.target.value)}
                      placeholder="To"
                      size="sm"
                      type="date"
                      value={releaseDateTo}
                    />
                  </div>
                </div>

                {/* Genres */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    Genres
                  </label>
                  <Select
                    aria-label="Filter by genres"
                    classNames={{
                      trigger:
                        "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                    onSelectionChange={(keys) => {
                      const genreIds = Array.from(keys)
                        .map((k) => parseInt(k as string, 10))
                        .filter((id) => !isNaN(id));
                      const nextGenres = new Set(genreIds);
                      const genreNames = genres
                        .filter((genre) => nextGenres.has(genre.id))
                        .map((genre) => genre.name);

                      setSelectedGenres(nextGenres);
                      setUrlGenreName(
                        genreNames.length === 1 ? genreNames[0] : null,
                      );
                      updateSearchParams({
                        genres: genreIds.length > 0 ? genreIds.join(",") : null,
                        genreName:
                          genreNames.length === 1 ? genreNames[0] : null,
                      });
                    }}
                    placeholder="Select genres"
                    renderValue={() =>
                      displayGenreNames.length > 0
                        ? displayGenreNames.join(", ")
                        : "Select genres"
                    }
                    selectedKeys={selectedGenreKeys}
                    selectionMode="multiple"
                    size="sm"
                  >
                    {genres.map((genre) => (
                      <SelectItem
                        key={genre.id.toString()}
                        value={genre.id.toString()}
                      >
                        {genre.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    Keywords
                  </label>
                  <Input
                    classNames={{
                      inputWrapper:
                        "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                    onChange={(e) => {
                      setKeywords(e.target.value);
                      updateSearchParams({
                        keywords: e.target.value.trim() || null,
                      });
                    }}
                    placeholder="Search keywords…"
                    size="sm"
                    startContent={
                      <Search className="text-secondary" size={16} />
                    }
                    value={keywords}
                  />
                </div>

                {/* Original Language */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    Original Language
                  </label>
                  <Select
                    aria-label="Filter by original language"
                    classNames={{
                      trigger:
                        "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setOriginalLanguage(selected || "all");
                      updateSearchParams({
                        originalLanguage:
                          selected && selected !== "all" ? selected : null,
                      });
                    }}
                    selectedKeys={new Set([originalLanguage])}
                    size="sm"
                  >
                    <SelectItem key="all" value="all">
                      Default (All Languages)
                    </SelectItem>
                    <SelectItem key="en" value="en">
                      English
                    </SelectItem>
                    <SelectItem key="es" value="es">
                      Spanish
                    </SelectItem>
                    <SelectItem key="fr" value="fr">
                      French
                    </SelectItem>
                    <SelectItem key="de" value="de">
                      German
                    </SelectItem>
                    <SelectItem key="ja" value="ja">
                      Japanese
                    </SelectItem>
                    <SelectItem key="ko" value="ko">
                      Korean
                    </SelectItem>
                    <SelectItem key="zh" value="zh">
                      Chinese
                    </SelectItem>
                  </Select>
                </div>

                {/* Parental Guide Filters */}
                <div className="hidden">
                  <h3 className="text-sm font-semibold text-foreground">
                    Content Filters (IMDb Parental Guide)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sex & Nudity Filter */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-foreground">
                        Sex & Nudity
                      </label>
                      <Select
                        aria-label="Filter by nudity content"
                        classNames={{
                          trigger:
                            "bg-content2 border border-secondary/20 hover:border-secondary/40",
                        }}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setNudityFilter(selected || "all");
                        }}
                        selectedKeys={new Set([nudityFilter])}
                        size="sm"
                      >
                        <SelectItem key="all" value="all">
                          All
                        </SelectItem>
                        <SelectItem key="none" value="none">
                          None Only
                        </SelectItem>
                        <SelectItem key="mild" value="mild">
                          Mild or Less
                        </SelectItem>
                        <SelectItem key="moderate" value="moderate">
                          Moderate or Less
                        </SelectItem>
                        <SelectItem key="severe" value="severe">
                          Include Severe
                        </SelectItem>
                      </Select>
                    </div>

                    {/* Violence & Gore Filter */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-foreground">
                        Violence & Gore
                      </label>
                      <Select
                        aria-label="Filter by violence content"
                        classNames={{
                          trigger:
                            "bg-content2 border border-secondary/20 hover:border-secondary/40",
                        }}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setViolenceFilter(selected || "all");
                        }}
                        selectedKeys={new Set([violenceFilter])}
                        size="sm"
                      >
                        <SelectItem key="all" value="all">
                          All
                        </SelectItem>
                        <SelectItem key="none" value="none">
                          None Only
                        </SelectItem>
                        <SelectItem key="mild" value="mild">
                          Mild or Less
                        </SelectItem>
                        <SelectItem key="moderate" value="moderate">
                          Moderate or Less
                        </SelectItem>
                        <SelectItem key="severe" value="severe">
                          Include Severe
                        </SelectItem>
                      </Select>
                    </div>

                    {/* Profanity Filter */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-foreground">
                        Profanity
                      </label>
                      <Select
                        aria-label="Filter by profanity content"
                        classNames={{
                          trigger:
                            "bg-content2 border border-secondary/20 hover:border-secondary/40",
                        }}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setProfanityFilter(selected || "all");
                        }}
                        selectedKeys={new Set([profanityFilter])}
                        size="sm"
                      >
                        <SelectItem key="all" value="all">
                          All
                        </SelectItem>
                        <SelectItem key="none" value="none">
                          None Only
                        </SelectItem>
                        <SelectItem key="mild" value="mild">
                          Mild or Less
                        </SelectItem>
                        <SelectItem key="moderate" value="moderate">
                          Moderate or Less
                        </SelectItem>
                        <SelectItem key="severe" value="severe">
                          Include Severe
                        </SelectItem>
                      </Select>
                    </div>

                    {/* Alcohol, Drugs & Smoking Filter */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-foreground">
                        Alcohol, Drugs & Smoking
                      </label>
                      <Select
                        aria-label="Filter by alcohol/drugs content"
                        classNames={{
                          trigger:
                            "bg-content2 border border-secondary/20 hover:border-secondary/40",
                        }}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setAlcoholFilter(selected || "all");
                        }}
                        selectedKeys={new Set([alcoholFilter])}
                        size="sm"
                      >
                        <SelectItem key="all" value="all">
                          All
                        </SelectItem>
                        <SelectItem key="none" value="none">
                          None Only
                        </SelectItem>
                        <SelectItem key="mild" value="mild">
                          Mild or Less
                        </SelectItem>
                        <SelectItem key="moderate" value="moderate">
                          Moderate or Less
                        </SelectItem>
                        <SelectItem key="severe" value="severe">
                          Include Severe
                        </SelectItem>
                      </Select>
                    </div>

                    {/* Frightening & Intense Scenes Filter */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-foreground">
                        Frightening & Intense Scenes
                      </label>
                      <Select
                        aria-label="Filter by frightening content"
                        classNames={{
                          trigger:
                            "bg-content2 border border-secondary/20 hover:border-secondary/40",
                        }}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string;
                          setFrighteningFilter(selected || "all");
                        }}
                        selectedKeys={new Set([frighteningFilter])}
                        size="sm"
                      >
                        <SelectItem key="all" value="all">
                          All
                        </SelectItem>
                        <SelectItem key="none" value="none">
                          None Only
                        </SelectItem>
                        <SelectItem key="mild" value="mild">
                          Mild or Less
                        </SelectItem>
                        <SelectItem key="moderate" value="moderate">
                          Moderate or Less
                        </SelectItem>
                        <SelectItem key="severe" value="severe">
                          Include Severe
                        </SelectItem>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Runtime */}
                <div className="hidden">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    Runtime (minutes)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      classNames={{
                        inputWrapper:
                          "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                      onChange={(e) => setRuntimeMin(e.target.value)}
                      placeholder="Min"
                      size="sm"
                      type="number"
                      value={runtimeMin}
                    />
                    <Input
                      classNames={{
                        inputWrapper:
                          "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                      onChange={(e) => setRuntimeMax(e.target.value)}
                      placeholder="Max"
                      size="sm"
                      type="number"
                      value={runtimeMax}
                    />
                  </div>
                </div>

                {/* TMDB User Score */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    TMDB User Score
                  </label>
                  <div className="flex gap-2">
                    <Input
                      classNames={{
                        inputWrapper:
                          "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                      max="10"
                      min="1"
                      onChange={(e) => setVoteAverageMin(e.target.value)}
                      placeholder="Min"
                      size="sm"
                      step="0.1"
                      type="number"
                      value={voteAverageMin}
                    />
                    <Input
                      classNames={{
                        inputWrapper:
                          "bg-content2 border border-secondary/20 hover:border-secondary/40",
                      }}
                      max="10"
                      min="1"
                      onChange={(e) => setVoteAverageMax(e.target.value)}
                      placeholder="Max"
                      size="sm"
                      step="0.1"
                      type="number"
                      value={voteAverageMax}
                    />
                  </div>
                </div>

                {/* TMDB User Vote Count */}
                <div className="hidden">
                  <label className="text-xs sm:text-sm font-medium text-foreground">
                    TMDB User Vote Count
                  </label>
                  <Input
                    classNames={{
                      inputWrapper:
                        "bg-content2 border border-secondary/20 hover:border-secondary/40",
                    }}
                    onChange={(e) => setVoteCountMin(e.target.value)}
                    placeholder="Minimum votes"
                    size="sm"
                    type="number"
                    value={voteCountMin}
                  />
                </div>
              </div>

              {/* Streaming Services */}
              <div className="mt-4 sm:mt-6 space-y-3 border-t border-secondary/20 pt-4 sm:pt-6">
                <label className="text-xs sm:text-sm font-medium text-foreground">
                  Streaming Services
                </label>

                <Select
                  className="w-full max-w-xs"
                  classNames={{
                    trigger:
                      "bg-content2 border border-secondary/20 hover:border-secondary/40",
                  }}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setWatchRegion(selected || "US");
                    setSelectedProviders(new Set());
                  }}
                  selectedKeys={new Set([watchRegion])}
                  size="sm"
                  startContent={
                    <span className="text-lg">
                      {watchRegion === "US"
                        ? "🇺🇸"
                        : watchRegion === "GB"
                          ? "🇬🇧"
                          : watchRegion === "CA"
                            ? "🇨🇦"
                            : watchRegion === "AU"
                              ? "🇦🇺"
                              : watchRegion === "DE"
                                ? "🇩🇪"
                                : watchRegion === "FR"
                                  ? "🇫🇷"
                                  : watchRegion === "ES"
                                    ? "🇪🇸"
                                    : watchRegion === "IT"
                                      ? "🇮🇹"
                                      : watchRegion === "JP"
                                        ? "🇯🇵"
                                        : watchRegion === "KR"
                                          ? "🇰🇷"
                                          : "🌍"}
                    </span>
                  }
                >
                  <SelectItem key="US" value="US">
                    🇺🇸 United States
                  </SelectItem>
                  <SelectItem key="GB" value="GB">
                    🇬🇧 United Kingdom
                  </SelectItem>
                  <SelectItem key="CA" value="CA">
                    🇨🇦 Canada
                  </SelectItem>
                  <SelectItem key="AU" value="AU">
                    🇦🇺 Australia
                  </SelectItem>
                  <SelectItem key="DE" value="DE">
                    🇩🇪 Germany
                  </SelectItem>
                  <SelectItem key="FR" value="FR">
                    🇫🇷 France
                  </SelectItem>
                  <SelectItem key="ES" value="ES">
                    🇪🇸 Spain
                  </SelectItem>
                  <SelectItem key="IT" value="IT">
                    🇮🇹 Italy
                  </SelectItem>
                  <SelectItem key="JP" value="JP">
                    🇯🇵 Japan
                  </SelectItem>
                  <SelectItem key="KR" value="KR">
                    🇰🇷 South Korea
                  </SelectItem>
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
                          className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                            selectedProviders.has(provider.provider_id)
                              ? "border-secondary shadow-lg ring-2 ring-secondary ring-offset-2 bg-secondary/10"
                              : "border-secondary/20 hover:border-secondary/40 bg-content2"
                          }`}
                          key={provider.provider_id}
                          onClick={() => toggleProvider(provider.provider_id)}
                          title={provider.provider_name}
                          type="button"
                        >
                          {provider.logo_path ? (
                            <img
                              alt={provider.provider_name}
                              className="w-full h-full object-contain p-2"
                              src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
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
                  <p className="text-sm text-default-500">
                    No streaming services available for this region.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Content Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner color="secondary" size="lg" />
          </div>
        ) : media.length > 0 ? (
          <>
            <div className="mt-6 sm:mt-8 mb-4 text-xs sm:text-sm text-foreground/60">
              Showing {media.length} of {totalResults} results
            </div>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12 5xl:grid-cols-14 gap-2 sm:gap-3 md:gap-4 relative z-0">
              {media
                .filter((item) => {
                  // Filter out hidden items
                  if (hiddenIds.has(item.id)) return false;

                  // Check if any parental guide filter is active
                  const hasActiveFilter =
                    nudityFilter !== "all" ||
                    violenceFilter !== "all" ||
                    profanityFilter !== "all" ||
                    alcoholFilter !== "all" ||
                    frighteningFilter !== "all";

                  // If no filters active, show everything
                  if (!hasActiveFilter) return true;

                  // Check parental guide filters
                  const itemData = parentalGuideData.get(item.id);

                  // If we don't have data yet, HIDE the item when filters are active
                  // This ensures we only show items we've verified meet the criteria
                  if (!itemData) {
                    console.log(
                      `Hiding ${item.title || item.name} - no parental guide data yet`,
                    );
                    return false;
                  }

                  // Helper function to check severity filter
                  const checkSeverity = (
                    severity: string,
                    filter: string,
                  ): boolean => {
                    if (filter === "all") return true;

                    // Normalize severity to handle variations
                    const normalizedSeverity = (severity || "None").trim();

                    switch (filter) {
                      case "none":
                        return normalizedSeverity === "None";
                      case "mild":
                        return (
                          normalizedSeverity === "None" ||
                          normalizedSeverity === "Mild"
                        );
                      case "moderate":
                        return (
                          normalizedSeverity === "None" ||
                          normalizedSeverity === "Mild" ||
                          normalizedSeverity === "Moderate"
                        );
                      case "severe":
                        return true; // Include all
                      default:
                        return true;
                    }
                  };

                  // Check each active filter - ALL must pass
                  if (nudityFilter !== "all") {
                    const passes = checkSeverity(
                      itemData.nuditySeverity,
                      nudityFilter,
                    );
                    if (!passes) {
                      console.log(
                        `Filtering out ${item.title || item.name} - nudity: ${itemData.nuditySeverity}, filter: ${nudityFilter}`,
                      );
                      return false;
                    }
                  }

                  if (violenceFilter !== "all") {
                    const passes = checkSeverity(
                      itemData.violence,
                      violenceFilter,
                    );
                    if (!passes) {
                      console.log(
                        `Filtering out ${item.title || item.name} - violence: ${itemData.violence}, filter: ${violenceFilter}`,
                      );
                      return false;
                    }
                  }

                  if (profanityFilter !== "all") {
                    const passes = checkSeverity(
                      itemData.profanity,
                      profanityFilter,
                    );
                    if (!passes) {
                      console.log(
                        `Filtering out ${item.title || item.name} - profanity: ${itemData.profanity}, filter: ${profanityFilter}`,
                      );
                      return false;
                    }
                  }

                  if (alcoholFilter !== "all") {
                    const passes = checkSeverity(
                      itemData.alcohol,
                      alcoholFilter,
                    );
                    if (!passes) {
                      console.log(
                        `Filtering out ${item.title || item.name} - alcohol: ${itemData.alcohol}, filter: ${alcoholFilter}`,
                      );
                      return false;
                    }
                  }

                  if (frighteningFilter !== "all") {
                    const passes = checkSeverity(
                      itemData.frightening,
                      frighteningFilter,
                    );
                    if (!passes) {
                      console.log(
                        `Filtering out ${item.title || item.name} - frightening: ${itemData.frightening}, filter: ${frighteningFilter}`,
                      );
                      return false;
                    }
                  }

                  // All filters passed!
                  console.log(
                    `✅ Showing ${item.title || item.name} - passes all filters`,
                  );
                  return true;
                })
                .map((item) => (
                  <React.Fragment key={item.id}>
                    {renderMediaCard(item)}
                  </React.Fragment>
                ))}
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <Spinner color="secondary" size="lg" />
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
                  <Film className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">
                    No Movies Found
                  </h3>
                  <p className="text-sm sm:text-base text-foreground/60">
                    Try adjusting your search or filters to find more results.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Add Movie Modal */}
      <AddMovieModal
        isOpen={isModalOpen}
        media={selectedMedia}
        onCastClick={(castMember) => {
          setIsModalOpen(false);
          // Navigate to search for this actor's movies
          router.push(
            `/pages/discover/movies?person=${castMember.id}&personName=${encodeURIComponent(castMember.name)}`,
          );
        }}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Notification Modal */}
      <Modal
        classNames={{
          base: "bg-background",
          header: "border-b border-divider",
        }}
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        size="md"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              {notificationModal.type === "success" && (
                <span className="text-2xl">✅</span>
              )}
              {notificationModal.type === "error" && (
                <span className="text-2xl">❌</span>
              )}
              {notificationModal.type === "warning" && (
                <span className="text-2xl">⚠️</span>
              )}
              {notificationModal.type === "info" && (
                <span className="text-2xl">ℹ️</span>
              )}
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

export default MoviesPage;

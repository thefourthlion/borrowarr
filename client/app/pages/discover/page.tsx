"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import "@/styles/Discover.scss";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Card, CardBody } from "@nextui-org/card";
import { 
  TrendingUp, 
  Star, 
  Play, 
  Info, 
  Film, 
  Tv, 
  Calendar,
  Flame,
  Sparkles,
  Trophy,
  Clock,
  Grid,
  Building2,
  Radio,
  Zap,
  Heart,
  Eye,
  Filter,
  Search,
  ArrowRight
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import SideScrollMovieList from "@/components/SideScrollMovieList";
import CategoryCarousel from "@/components/CategoryCarousel";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
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

interface CategoryItem {
  id: number;
  name: string;
  logo_path?: string | null;
}

// Utility function to deduplicate media items based on composite key (outside component)
const deduplicateMedia = (items: TMDBMedia[]): TMDBMedia[] => {
  const seen = new Map<string, TMDBMedia>();
  items.forEach(item => {
    const key = `${item.media_type || 'movie'}-${item.id}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  });
  const result = Array.from(seen.values());
  
  // Debug logging
  if (items.length !== result.length) {
    console.log(`[Deduplication] Removed ${items.length - result.length} duplicates (${items.length} → ${result.length})`);
  }
  
  return result;
};

const Discover = () => {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  
  // Hero state
  const [heroMedia, setHeroMedia] = useState<TMDBMedia | null>(null);
  const [loadingHero, setLoadingHero] = useState(true);
  
  // Content states
  const [trendingAll, setTrendingAll] = useState<TMDBMedia[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMedia[]>([]);
  const [popularSeries, setPopularSeries] = useState<TMDBMedia[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBMedia[]>([]);
  const [topRatedSeries, setTopRatedSeries] = useState<TMDBMedia[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<TMDBMedia[]>([]);
  const [airingToday, setAiringToday] = useState<TMDBMedia[]>([]);
  
  // Category states (genres, studios, networks)
  const [movieGenres, setMovieGenres] = useState<CategoryItem[]>([]);
  const [tvGenres, setTvGenres] = useState<CategoryItem[]>([]);
  const [studios, setStudios] = useState<CategoryItem[]>([]);
  const [networks, setNetworks] = useState<CategoryItem[]>([]);
  
  // Page states for infinite scroll
  const [trendingPage, setTrendingPage] = useState(1);
  const [popularMoviesPage, setPopularMoviesPage] = useState(1);
  const [popularSeriesPage, setPopularSeriesPage] = useState(1);
  const [topRatedMoviesPage, setTopRatedMoviesPage] = useState(1);
  const [topRatedSeriesPage, setTopRatedSeriesPage] = useState(1);
  const [upcomingMoviesPage, setUpcomingMoviesPage] = useState(1);
  const [airingTodayPage, setAiringTodayPage] = useState(1);
  
  // Loading more states
  const [loadingMoreTrending, setLoadingMoreTrending] = useState(false);
  const [loadingMorePopularMovies, setLoadingMorePopularMovies] = useState(false);
  const [loadingMorePopularSeries, setLoadingMorePopularSeries] = useState(false);
  const [loadingMoreTopRatedMovies, setLoadingMoreTopRatedMovies] = useState(false);
  const [loadingMoreTopRatedSeries, setLoadingMoreTopRatedSeries] = useState(false);
  const [loadingMoreUpcoming, setLoadingMoreUpcoming] = useState(false);
  const [loadingMoreAiring, setLoadingMoreAiring] = useState(false);
  
  // Loading states
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingPopularMovies, setLoadingPopularMovies] = useState(false);
  const [loadingPopularSeries, setLoadingPopularSeries] = useState(false);
  const [loadingTopRatedMovies, setLoadingTopRatedMovies] = useState(false);
  const [loadingTopRatedSeries, setLoadingTopRatedSeries] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [loadingAiring, setLoadingAiring] = useState(false);
  
  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, observerOptions);
    
    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));
    
    return () => observer.disconnect();
  }, [trendingAll, popularMovies, popularSeries, topRatedMovies, topRatedSeries, upcomingMovies, airingToday]);

  // Fetch all content on mount
  useEffect(() => {
    fetchAllContent();
    fetchGenres();
    fetchStudiosAndNetworks();
  }, []);

  const fetchAllContent = async () => {
    try {
      // Fetch trending for hero and trending section (combine movies and TV)
      setLoadingTrending(true);
      setLoadingHero(true);
      const [trendingMoviesRes, trendingTVRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/TMDB/trending/movies`, { params: { page: 1 } }),
        axios.get(`${API_BASE_URL}/api/TMDB/trending/tv`, { params: { page: 1 } })
      ]);
      
      const trendingMovies = (trendingMoviesRes.data.success && trendingMoviesRes.data.results) 
        ? trendingMoviesRes.data.results.slice(0, 10).map((item: any) => ({ ...item, media_type: 'movie' }))
        : [];
      
      const trendingTV = (trendingTVRes.data.success && trendingTVRes.data.results)
        ? trendingTVRes.data.results.slice(0, 10).map((item: any) => ({ ...item, media_type: 'tv' }))
        : [];
      
      const trending = [...trendingMovies, ...trendingTV];
      const uniqueTrending = deduplicateMedia(trending);
      
      // Shuffle the trending array for random hero selection (only for first load)
      const shuffledTrending = [...uniqueTrending].sort(() => Math.random() - 0.5);
      setTrendingAll(uniqueTrending);
      
      // Set hero to random trending item with backdrop
      const heroItem = shuffledTrending.find((item: TMDBMedia) => item.backdrop_path) || shuffledTrending[0];
      setHeroMedia(heroItem);
      
      setLoadingTrending(false);
      setLoadingHero(false);

      // Fetch popular movies
      setLoadingPopularMovies(true);
      const popularMoviesRes = await axios.get(`${API_BASE_URL}/api/TMDB/popular/movies`, {
        params: { page: 1 }
      });
      if (popularMoviesRes.data.success) {
        const movies = (popularMoviesRes.data.results || []).slice(0, 20).map((movie: any) => ({
          ...movie,
          media_type: 'movie'
        }));
        setPopularMovies(deduplicateMedia(movies));
      }
      setLoadingPopularMovies(false);

      // Fetch popular series
      setLoadingPopularSeries(true);
      const popularSeriesRes = await axios.get(`${API_BASE_URL}/api/TMDB/popular/tv`, {
        params: { page: 1 }
      });
      if (popularSeriesRes.data.success) {
        const series = (popularSeriesRes.data.results || []).slice(0, 20).map((show: any) => ({
          ...show,
          media_type: 'tv'
        }));
        setPopularSeries(deduplicateMedia(series));
      }
      setLoadingPopularSeries(false);

      // Fetch top rated movies
      setLoadingTopRatedMovies(true);
      const topRatedMoviesRes = await axios.get(`${API_BASE_URL}/api/TMDB/discover/movies`, {
        params: { 
          page: 1,
          sortBy: 'vote_average.desc',
          voteCountMin: 1000
        }
      });
      if (topRatedMoviesRes.data.success) {
        const movies = (topRatedMoviesRes.data.results || []).slice(0, 20).map((movie: any) => ({
          ...movie,
          media_type: 'movie'
        }));
        setTopRatedMovies(deduplicateMedia(movies));
      }
      setLoadingTopRatedMovies(false);

      // Fetch top rated series
      setLoadingTopRatedSeries(true);
      const topRatedSeriesRes = await axios.get(`${API_BASE_URL}/api/TMDB/discover/tv`, {
        params: { 
          page: 1,
          sortBy: 'vote_average.desc',
          voteCountMin: 500
        }
      });
      if (topRatedSeriesRes.data.success) {
        const series = (topRatedSeriesRes.data.results || []).slice(0, 20).map((show: any) => ({
          ...show,
          media_type: 'tv'
        }));
        setTopRatedSeries(deduplicateMedia(series));
      }
      setLoadingTopRatedSeries(false);

      // Fetch upcoming movies
      setLoadingUpcoming(true);
      const upcomingRes = await axios.get(`${API_BASE_URL}/api/TMDB/upcoming/movies`, {
        params: { page: 1 }
      });
      if (upcomingRes.data.success) {
        const movies = (upcomingRes.data.results || []).slice(0, 20).map((movie: any) => ({
          ...movie,
          media_type: 'movie'
        }));
        setUpcomingMovies(deduplicateMedia(movies));
      }
      setLoadingUpcoming(false);

      // Fetch upcoming TV shows (instead of airing today)
      setLoadingAiring(true);
      const airingRes = await axios.get(`${API_BASE_URL}/api/TMDB/upcoming/tv`, {
        params: { page: 1 }
      });
      if (airingRes.data.success) {
        const series = (airingRes.data.results || []).slice(0, 20).map((show: any) => ({
          ...show,
          media_type: 'tv'
        }));
        setAiringToday(deduplicateMedia(series));
      }
      setLoadingAiring(false);

    } catch (error) {
      console.error("[Discover] Error fetching content:", error);
      setLoadingTrending(false);
      setLoadingPopularMovies(false);
      setLoadingPopularSeries(false);
      setLoadingTopRatedMovies(false);
      setLoadingTopRatedSeries(false);
      setLoadingUpcoming(false);
      setLoadingAiring(false);
      setLoadingHero(false);
    }
  };

  // Load more functions for infinite scroll
  const loadMoreTrending = async () => {
    if (loadingMoreTrending) return;
    
    try {
      setLoadingMoreTrending(true);
      const nextPage = trendingPage + 1;
      
      const [trendingMoviesRes, trendingTVRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/TMDB/trending/movies`, { params: { page: nextPage } }),
        axios.get(`${API_BASE_URL}/api/TMDB/trending/tv`, { params: { page: nextPage } })
      ]);
      
      const trendingMovies = (trendingMoviesRes.data.success && trendingMoviesRes.data.results) 
        ? trendingMoviesRes.data.results.slice(0, 10).map((item: any) => ({ ...item, media_type: 'movie' }))
        : [];
      
      const trendingTV = (trendingTVRes.data.success && trendingTVRes.data.results)
        ? trendingTVRes.data.results.slice(0, 10).map((item: any) => ({ ...item, media_type: 'tv' }))
        : [];
      
      const newTrending = [...trendingMovies, ...trendingTV];
      
      // Deduplicate and append new items
      setTrendingAll(prev => deduplicateMedia([...prev, ...newTrending]));
      
      setTrendingPage(nextPage);
    } catch (error) {
      console.error("[Discover] Error loading more trending:", error);
    } finally {
      setLoadingMoreTrending(false);
    }
  };

  const loadMorePopularMovies = async () => {
    if (loadingMorePopularMovies) return;
    
    try {
      setLoadingMorePopularMovies(true);
      const nextPage = popularMoviesPage + 1;
      
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/popular/movies`, {
        params: { page: nextPage }
      });
      
      if (response.data.success) {
        const newMovies = (response.data.results || []).slice(0, 20).map((movie: any) => ({
          ...movie,
          media_type: 'movie'
        }));
        
        // Deduplicate and append new items
        setPopularMovies(prev => deduplicateMedia([...prev, ...newMovies]));
        setPopularMoviesPage(nextPage);
      }
    } catch (error) {
      console.error("[Discover] Error loading more popular movies:", error);
    } finally {
      setLoadingMorePopularMovies(false);
    }
  };

  const loadMorePopularSeries = async () => {
    if (loadingMorePopularSeries) return;
    
    try {
      setLoadingMorePopularSeries(true);
      const nextPage = popularSeriesPage + 1;
      
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/popular/tv`, {
        params: { page: nextPage }
      });
      
      if (response.data.success) {
        const newSeries = (response.data.results || []).slice(0, 20).map((show: any) => ({
          ...show,
          media_type: 'tv'
        }));
        
        // Deduplicate and append new items
        setPopularSeries(prev => deduplicateMedia([...prev, ...newSeries]));
        setPopularSeriesPage(nextPage);
      }
    } catch (error) {
      console.error("[Discover] Error loading more popular series:", error);
    } finally {
      setLoadingMorePopularSeries(false);
    }
  };

  const loadMoreTopRatedMovies = async () => {
    if (loadingMoreTopRatedMovies) return;
    
    try {
      setLoadingMoreTopRatedMovies(true);
      const nextPage = topRatedMoviesPage + 1;
      
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/discover/movies`, {
        params: { 
          page: nextPage,
          sortBy: 'vote_average.desc',
          voteCountMin: 1000
        }
      });
      
      if (response.data.success) {
        const newMovies = (response.data.results || []).slice(0, 20).map((movie: any) => ({
          ...movie,
          media_type: 'movie'
        }));
        
        // Deduplicate and append new items
        setTopRatedMovies(prev => deduplicateMedia([...prev, ...newMovies]));
        setTopRatedMoviesPage(nextPage);
      }
    } catch (error) {
      console.error("[Discover] Error loading more top rated movies:", error);
    } finally {
      setLoadingMoreTopRatedMovies(false);
    }
  };

  const loadMoreTopRatedSeries = async () => {
    if (loadingMoreTopRatedSeries) return;
    
    try {
      setLoadingMoreTopRatedSeries(true);
      const nextPage = topRatedSeriesPage + 1;
      
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/discover/tv`, {
        params: { 
          page: nextPage,
          sortBy: 'vote_average.desc',
          voteCountMin: 500
        }
      });
      
      if (response.data.success) {
        const newSeries = (response.data.results || []).slice(0, 20).map((show: any) => ({
          ...show,
          media_type: 'tv'
        }));
        
        // Deduplicate and append new items
        setTopRatedSeries(prev => deduplicateMedia([...prev, ...newSeries]));
        setTopRatedSeriesPage(nextPage);
      }
    } catch (error) {
      console.error("[Discover] Error loading more top rated series:", error);
    } finally {
      setLoadingMoreTopRatedSeries(false);
    }
  };

  const loadMoreUpcomingMovies = async () => {
    if (loadingMoreUpcoming) return;
    
    try {
      setLoadingMoreUpcoming(true);
      const nextPage = upcomingMoviesPage + 1;
      
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/upcoming/movies`, {
        params: { page: nextPage }
      });
      
      if (response.data.success) {
        const newMovies = (response.data.results || []).slice(0, 20).map((movie: any) => ({
          ...movie,
          media_type: 'movie'
        }));
        
        // Deduplicate and append new items
        setUpcomingMovies(prev => deduplicateMedia([...prev, ...newMovies]));
        setUpcomingMoviesPage(nextPage);
      }
    } catch (error) {
      console.error("[Discover] Error loading more upcoming movies:", error);
    } finally {
      setLoadingMoreUpcoming(false);
    }
  };

  const loadMoreAiringToday = async () => {
    if (loadingMoreAiring) return;
    
    try {
      setLoadingMoreAiring(true);
      const nextPage = airingTodayPage + 1;
      
      const response = await axios.get(`${API_BASE_URL}/api/TMDB/upcoming/tv`, {
        params: { page: nextPage }
      });
      
      if (response.data.success) {
        const newSeries = (response.data.results || []).slice(0, 20).map((show: any) => ({
          ...show,
          media_type: 'tv'
        }));
        
        // Deduplicate and append new items
        setAiringToday(prev => deduplicateMedia([...prev, ...newSeries]));
        setAiringTodayPage(nextPage);
      }
    } catch (error) {
      console.error("[Discover] Error loading more upcoming series:", error);
    } finally {
      setLoadingMoreAiring(false);
    }
  };

  const fetchGenres = async () => {
    try {
      // Fetch movie genres
      const movieGenresRes = await axios.get(`${API_BASE_URL}/api/TMDB/genres`, {
        params: { type: 'movie' }
      });
      if (movieGenresRes.data.success && movieGenresRes.data.genres) {
        setMovieGenres(movieGenresRes.data.genres.slice(0, 20));
      }

      // Fetch TV genres
      const tvGenresRes = await axios.get(`${API_BASE_URL}/api/TMDB/genres`, {
        params: { type: 'tv' }
      });
      if (tvGenresRes.data.success && tvGenresRes.data.genres) {
        setTvGenres(tvGenresRes.data.genres.slice(0, 20));
      }
    } catch (error) {
      console.error("[Discover] Error fetching genres:", error);
    }
  };

  const fetchStudiosAndNetworks = async () => {
    try {
      // Fetch popular movies to extract studios
      const moviesRes = await axios.get(`${API_BASE_URL}/api/TMDB/popular/movies`, {
        params: { page: 1 }
      });
      
      if (moviesRes.data.success && moviesRes.data.results) {
        // Extract unique production companies from movies
        const companiesMap = new Map<number, CategoryItem>();
        
        // Get details for first few movies to extract production companies
        const moviePromises = moviesRes.data.results.slice(0, 10).map((movie: any) =>
          axios.get(`${API_BASE_URL}/api/TMDB/movie/${movie.id}`)
            .then(res => res.data.movie)
            .catch(() => null)
        );
        
        const movieDetails = await Promise.all(moviePromises);
        
        movieDetails.forEach((movie: any) => {
          if (movie?.production_companies) {
            movie.production_companies.forEach((company: any) => {
              if (company.logo_path && !companiesMap.has(company.id)) {
                companiesMap.set(company.id, {
                  id: company.id,
                  name: company.name,
                  logo_path: company.logo_path,
                });
              }
            });
          }
        });
        
        setStudios(Array.from(companiesMap.values()).slice(0, 15));
      }

      // Fetch popular TV shows to extract networks
      const tvRes = await axios.get(`${API_BASE_URL}/api/TMDB/popular/tv`, {
        params: { page: 1 }
      });
      
      if (tvRes.data.success && tvRes.data.results) {
        const networksMap = new Map<number, CategoryItem>();
        
        // Get details for first few TV shows to extract networks
        const tvPromises = tvRes.data.results.slice(0, 10).map((show: any) =>
          axios.get(`${API_BASE_URL}/api/TMDB/tv/${show.id}`)
            .then(res => res.data.tv)
            .catch(() => null)
        );
        
        const tvDetails = await Promise.all(tvPromises);
        
        tvDetails.forEach((show: any) => {
          if (show?.networks) {
            show.networks.forEach((network: any) => {
              if (network.logo_path && !networksMap.has(network.id)) {
                networksMap.set(network.id, {
                  id: network.id,
                  name: network.name,
                  logo_path: network.logo_path,
                });
              }
            });
          }
        });
        
        setNetworks(Array.from(networksMap.values()).slice(0, 15));
      }
    } catch (error) {
      console.error("[Discover] Error fetching studios and networks:", error);
    }
  };

  const handleGenreClick = (item: CategoryItem, mediaType: 'movie' | 'tv') => {
    const path = mediaType === 'movie' ? 'movies' : 'series';
    router.push(`/pages/discover/${path}?genres=${item.id}`);
  };

  const handleStudioClick = (item: CategoryItem) => {
    router.push(`/pages/discover/movies?studio=${item.id}`);
  };

  const handleNetworkClick = (item: CategoryItem) => {
    router.push(`/pages/discover/series?network=${item.id}`);
  };

  const handleHeroClick = () => {
    if (!heroMedia) return;
    
    const mediaType = heroMedia.media_type === 'tv' ? 'series' : 'movies';
    router.push(`/pages/discover/${mediaType}?id=${heroMedia.id}`);
  };

  // Memoize deduplicated arrays to prevent duplicate keys during re-renders
  const deduplicatedTrending = useMemo(() => deduplicateMedia(trendingAll), [trendingAll]);
  const deduplicatedPopularMovies = useMemo(() => deduplicateMedia(popularMovies), [popularMovies]);
  const deduplicatedPopularSeries = useMemo(() => deduplicateMedia(popularSeries), [popularSeries]);
  const deduplicatedTopRatedMovies = useMemo(() => deduplicateMedia(topRatedMovies), [topRatedMovies]);
  const deduplicatedTopRatedSeries = useMemo(() => deduplicateMedia(topRatedSeries), [topRatedSeries]);
  const deduplicatedUpcomingMovies = useMemo(() => deduplicateMedia(upcomingMovies), [upcomingMovies]);
  const deduplicatedAiringToday = useMemo(() => deduplicateMedia(airingToday), [airingToday]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Hero Section - Cinematic Full Width */}
      <div 
        ref={heroRef}
        className="relative w-full h-[60vh] sm:h-[70vh] md:h-[75vh] lg:h-[85vh] overflow-hidden"
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] animate-gradient" />
        
        {/* Floating Particles Effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-2 h-2 bg-secondary/40 rounded-full animate-float" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-40 right-20 w-3 h-3 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-warning/40 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-60 right-1/3 w-2 h-2 bg-secondary/30 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
        </div>
        {loadingHero ? (
          <div className="w-full h-full flex items-center justify-center bg-default-100">
            <Spinner size="lg" color="secondary" />
          </div>
        ) : heroMedia ? (
          <>
            {/* Backdrop Image with Parallax */}
            <div 
              className="absolute inset-0 parallax"
              style={{ 
                transform: `translateY(${scrollY * 0.5}px) scale(${1 + scrollY * 0.0002})`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              {heroMedia.backdrop_path ? (
                <img
                  src={`${TMDB_BACKDROP_BASE_URL}${heroMedia.backdrop_path}`}
                  alt={heroMedia.title || heroMedia.name}
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/20 animate-gradient" />
              )}
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
            </div>

            {/* Hero Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="container max-w-[2400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
                <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Trending Badge */}
                  <div className="flex items-center gap-3 animate-fade-in">
                    <Chip
                      color={heroMedia.media_type === 'movie' ? 'secondary' : 'primary'}
                      variant="shadow"
                      size="md"
                      startContent={heroMedia.media_type === 'movie' ? <Film size={16} /> : <Tv size={16} />}
                      className="font-bold px-4"
                    >
                      {heroMedia.media_type === 'movie' ? 'MOVIE' : 'SERIES'}
                    </Chip>
                    <Chip
                      color="warning"
                      variant="flat"
                      size="md"
                      startContent={<Flame size={14} />}
                      className="font-semibold"
                    >
                      Trending #1
                    </Chip>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black tracking-tighter text-white drop-shadow-2xl leading-tight animate-slide-up">
                    {heroMedia.title || heroMedia.name}
                  </h1>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-5 text-sm sm:text-base md:text-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {heroMedia.vote_average > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 backdrop-blur-sm rounded-full border border-yellow-500/30">
                        <Star size={18} className="text-yellow-400" fill="currentColor" />
                        <span className="font-bold text-yellow-400">{heroMedia.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    {(heroMedia.release_date || heroMedia.first_air_date) && (
                      <div className="flex items-center gap-2 text-white/90 font-medium">
                        <Calendar size={18} className="text-white/70" />
                        <span>
                          {new Date(heroMedia.release_date || heroMedia.first_air_date || '').getFullYear()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-white/80">
                      <Eye size={18} className="text-white/70" />
                      <span className="font-medium">Highly Watched</span>
                    </div>
                  </div>

                  {/* Overview */}
                  {heroMedia.overview && (
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/95 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-lg max-w-3xl font-medium animate-slide-up" style={{ animationDelay: '0.2s' }}>
                      {heroMedia.overview}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <Button
                      size="lg"
                      className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold shadow-2xl shadow-secondary/50 hover:shadow-secondary/70 smooth-transition hover-lift animate-glow-pulse"
                      color="secondary"
                      startContent={<Play size={20} fill="currentColor" />}
                      onPress={handleHeroClick}
                    >
                      Watch Now
                    </Button>
                    <Button
                      size="lg"
                      className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 smooth-transition hover-lift"
                      variant="bordered"
                      startContent={<Info size={20} />}
                      onPress={handleHeroClick}
                    >
                      More Info
                    </Button>
                    <Button
                      size="lg"
                      isIconOnly
                      className="h-12 sm:h-14 w-12 sm:w-14 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 smooth-transition hover-lift"
                      variant="bordered"
                    >
                      <Heart size={22} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Quick Access Bar */}
      <div className="sticky top-0 z-40 backdrop-blur-glass border-b border-white/5 smooth-transition animate-slide-up">
        <div className="container max-w-[2400px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
            <Button
              size="sm"
              variant="flat"
              className="flex-shrink-0 font-semibold smooth-transition hover-lift"
              color="warning"
              startContent={<Flame size={16} />}
              onPress={() => router.push('/pages/discover/movies?type=trending')}
            >
              Trending
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-shrink-0 font-semibold smooth-transition hover-lift"
              startContent={<Star size={16} />}
              onPress={() => router.push('/pages/discover/movies?sortBy=vote_average.desc')}
            >
              Top Rated
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-shrink-0 font-semibold smooth-transition hover-lift"
              startContent={<Calendar size={16} />}
              onPress={() => router.push('/pages/discover/movies?type=upcoming')}
            >
              Coming Soon
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-shrink-0 font-semibold smooth-transition hover-lift"
              startContent={<Film size={16} />}
              onPress={() => router.push('/pages/discover/movies')}
            >
              Movies
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-shrink-0 font-semibold smooth-transition hover-lift"
              startContent={<Tv size={16} />}
              onPress={() => router.push('/pages/discover/series')}
            >
              Series
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="flex-shrink-0 font-semibold smooth-transition hover-lift"
              startContent={<Grid size={16} />}
            >
              Genres
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              isIconOnly
              variant="flat"
              className="flex-shrink-0"
            >
              <Search size={18} />
            </Button>
            <Button
              size="sm"
              isIconOnly
              variant="flat"
              className="flex-shrink-0"
            >
              <Filter size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Collections */}
      <div className="container max-w-[2400px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card
            isPressable
            className="bg-gradient-to-br from-secondary/20 via-secondary/10 to-background border border-secondary/20 hover:border-secondary/40 smooth-transition-slow cursor-pointer hover-glow scroll-reveal stagger-1"
            onPress={() => router.push('/pages/discover/movies?type=popular')}
          >
            <CardBody className="p-6 sm:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <Zap size={24} className="text-secondary" />
                </div>
                <Chip size="sm" color="secondary" variant="flat">Hot</Chip>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Popular Now</h3>
              <p className="text-sm text-foreground/70">Most requested movies this week</p>
            </CardBody>
          </Card>

          <Card
            isPressable
            className="bg-gradient-to-br from-warning/20 via-warning/10 to-background border border-warning/20 hover:border-warning/40 smooth-transition-slow cursor-pointer hover-glow scroll-reveal stagger-2"
            onPress={() => router.push('/pages/discover/movies?type=upcoming')}
          >
            <CardBody className="p-6 sm:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Calendar size={24} className="text-warning" />
                </div>
                <Chip size="sm" color="warning" variant="flat">New</Chip>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Coming Soon</h3>
              <p className="text-sm text-foreground/70">Upcoming releases you can't miss</p>
            </CardBody>
          </Card>

          <Card
            isPressable
            className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 hover:border-primary/40 smooth-transition-slow cursor-pointer hover-glow scroll-reveal stagger-3"
            onPress={() => router.push('/pages/discover/series?type=popular')}
          >
            <CardBody className="p-6 sm:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Tv size={24} className="text-primary" />
                </div>
                <Chip size="sm" color="primary" variant="flat">Binge</Chip>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Top Series</h3>
              <p className="text-sm text-foreground/70">Must-watch TV shows right now</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Content Sections */}
      <div className="container max-w-[2400px] mx-auto px-4 sm:px-6 space-y-6 sm:space-y-8 pb-12">
        {/* Trending Now */}
        <SideScrollMovieList
          title="Trending Now"
          items={deduplicatedTrending}
          loading={loadingTrending}
          loadingMore={loadingMoreTrending}
          onLoadMore={loadMoreTrending}
          icon={<Flame size={20} className="sm:w-6 sm:h-6 text-orange-500" />}
          categoryPath="/pages/discover/movies?type=trending"
        />

        {/* Movie Genres */}
        <CategoryCarousel
          title="Movie Genres"
          items={movieGenres}
          icon={<Grid size={20} className="sm:w-6 sm:h-6 text-secondary" />}
          type="genre"
          mediaType="movie"
          onItemClick={(item) => handleGenreClick(item, 'movie')}
        />

        {/* Popular Movies */}
        <SideScrollMovieList
          title="Popular Movies"
          items={deduplicatedPopularMovies}
          loading={loadingPopularMovies}
          loadingMore={loadingMorePopularMovies}
          onLoadMore={loadMorePopularMovies}
          icon={<TrendingUp size={20} className="sm:w-6 sm:h-6 text-secondary" />}
          categoryPath="/pages/discover/movies?type=popular"
        />

        {/* Studios */}
        <CategoryCarousel
          title="Studios"
          items={studios}
          icon={<Building2 size={20} className="sm:w-6 sm:h-6 text-amber-500" />}
          type="studio"
          onItemClick={handleStudioClick}
        />

        {/* Popular Series */}
        <SideScrollMovieList
          title="Popular Series"
          items={deduplicatedPopularSeries}
          loading={loadingPopularSeries}
          loadingMore={loadingMorePopularSeries}
          onLoadMore={loadMorePopularSeries}
          icon={<TrendingUp size={20} className="sm:w-6 sm:h-6 text-primary" />}
          categoryPath="/pages/discover/series?type=popular"
        />

        {/* Series Genres */}
        <CategoryCarousel
          title="Series Genres"
          items={tvGenres}
          icon={<Grid size={20} className="sm:w-6 sm:h-6 text-primary" />}
          type="genre"
          mediaType="tv"
          onItemClick={(item) => handleGenreClick(item, 'tv')}
        />

        {/* Top Rated Movies */}
        <SideScrollMovieList
          title="Top Rated Movies"
          items={deduplicatedTopRatedMovies}
          loading={loadingTopRatedMovies}
          loadingMore={loadingMoreTopRatedMovies}
          onLoadMore={loadMoreTopRatedMovies}
          icon={<Trophy size={20} className="sm:w-6 sm:h-6 text-yellow-500" />}
          categoryPath="/pages/discover/movies?sortBy=vote_average.desc"
        />

        {/* Networks */}
        <CategoryCarousel
          title="Networks"
          items={networks}
          icon={<Radio size={20} className="sm:w-6 sm:h-6 text-cyan-500" />}
          type="network"
          onItemClick={handleNetworkClick}
        />

        {/* Top Rated Series */}
        <SideScrollMovieList
          title="Top Rated Series"
          items={deduplicatedTopRatedSeries}
          loading={loadingTopRatedSeries}
          loadingMore={loadingMoreTopRatedSeries}
          onLoadMore={loadMoreTopRatedSeries}
          icon={<Star size={20} className="sm:w-6 sm:h-6 text-yellow-500" />}
          categoryPath="/pages/discover/series?sortBy=vote_average.desc"
        />

        {/* Upcoming Movies */}
        <SideScrollMovieList
          title="Coming Soon"
          items={deduplicatedUpcomingMovies}
          loading={loadingUpcoming}
          loadingMore={loadingMoreUpcoming}
          onLoadMore={loadMoreUpcomingMovies}
          icon={<Calendar size={20} className="sm:w-6 sm:h-6 text-blue-500" />}
          categoryPath="/pages/discover/movies?type=upcoming"
        />

        {/* Upcoming Series */}
        <SideScrollMovieList
          title="Upcoming Series"
          items={deduplicatedAiringToday}
          loading={loadingAiring}
          loadingMore={loadingMoreAiring}
          onLoadMore={loadMoreAiringToday}
          icon={<Clock size={20} className="sm:w-6 sm:h-6 text-green-500" />}
          categoryPath="/pages/discover/series?type=upcoming"
        />

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3">
          <div
            onClick={() => router.push('/pages/discover/movies')}
            className="group relative overflow-hidden rounded-lg md:rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 hover:border-secondary/60 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-secondary/20 p-4 sm:p-6 md:p-8"
          >
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-secondary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10 space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Film size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7 text-secondary" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">Explore Movies</h3>
              <p className="text-xs sm:text-sm md:text-base text-foreground/70">
                Browse thousands of movies with advanced filters and search
              </p>
            </div>
          </div>

          <div
            onClick={() => router.push('/pages/discover/series')}
            className="group relative overflow-hidden rounded-lg md:rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 hover:border-primary/60 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 p-4 sm:p-6 md:p-8"
          >
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10 space-y-2 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Tv size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">Explore Series</h3>
              <p className="text-xs sm:text-sm md:text-base text-foreground/70">
                Discover TV shows and series from around the world
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Bottom Spacing */}
        <div className="h-8" />
    </div>
  );
};

export default Discover;

"use client";
import React, { useState, useEffect } from "react";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { TrendingUp } from "lucide-react";
import axios from "axios";
import SideScrollMovieList from "@/components/SideScrollMovieList";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
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

interface Genre {
  id: number;
  name: string;
}

const Discover = () => {
  // Data states - only trending for now
  const [trendingMovies, setTrendingMovies] = useState<TMDBMedia[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<TMDBMedia[]>([]);
  
  // Loading states
  const [loadingTrendingMovies, setLoadingTrendingMovies] = useState(false);
  const [loadingTrendingSeries, setLoadingTrendingSeries] = useState(false);

  // Fetch trending content on mount
  useEffect(() => {
    const fetchTrending = async () => {
      console.log('[Discover] Starting to fetch trending content');
      setLoadingTrendingMovies(true);
      setLoadingTrendingSeries(true);
      try {
        console.log('[Discover] Making API calls to:', {
          movies: `${API_BASE_URL}/api/TMDB/trending/movies`,
          series: `${API_BASE_URL}/api/TMDB/trending/tv`
        });
        const [moviesRes, seriesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/TMDB/trending/movies`, { params: { page: 1 } }),
          axios.get(`${API_BASE_URL}/api/TMDB/trending/tv`, { params: { page: 1 } }),
        ]);
        console.log('[Discover] Movies response:', moviesRes.data);
        console.log('[Discover] Series response:', seriesRes.data);
        
        if (moviesRes.data.success) {
          const movies = (moviesRes.data.results.slice(0, 20) || []).map((movie: any) => ({
            ...movie,
            media_type: 'movie' as const
          }));
          console.log('[Discover] Setting trendingMovies:', movies.length, 'items');
          console.log('[Discover] Trending movies data:', movies);
          setTrendingMovies(movies);
        } else {
          console.warn('[Discover] Movies response not successful:', moviesRes.data);
        }
        
        if (seriesRes.data.success) {
          const series = (seriesRes.data.results.slice(0, 20) || []).map((show: any) => ({
            ...show,
            media_type: 'tv' as const
          }));
          console.log('[Discover] Setting trendingSeries:', series.length, 'items');
          console.log('[Discover] Trending series data:', series);
          setTrendingSeries(series);
        } else {
          console.warn('[Discover] Series response not successful:', seriesRes.data);
        }
      } catch (error) {
        console.error("[Discover] Error fetching trending:", error);
      } finally {
        setLoadingTrendingMovies(false);
        setLoadingTrendingSeries(false);
      }
    };

    fetchTrending();
  }, []);


  return (
    <div className="Discover page min-h-screen bg-background p-2 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
      <div className="container max-w-[1600px] 2xl:max-w-[1800px] mx-auto space-y-6 sm:space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between px-2 sm:px-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Discover</h1>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 sm:space-y-10 md:space-y-12">
          {/* Trending */}
          {(() => {
            const combinedItems = [...trendingMovies, ...trendingSeries];
            console.log('[Discover] Rendering SideScrollMovieList with combined items:', {
              moviesCount: trendingMovies.length,
              seriesCount: trendingSeries.length,
              totalCount: combinedItems.length,
              items: combinedItems
            });
            return (
          <SideScrollMovieList
            title="Trending"
                items={combinedItems}
            loading={loadingTrendingMovies || loadingTrendingSeries}
            icon={<TrendingUp size={20} className="sm:w-6 sm:h-6 text-primary" />}
            categoryPath="/pages/discover/trending?type=movies"
          />
            );
          })()}

          
        </div>
      </div>
    </div>
  );
};

export default Discover;

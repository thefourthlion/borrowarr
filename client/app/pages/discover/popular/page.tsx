"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Film,
  ChevronLeft,
  Star,
} from "lucide-react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

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

const PopularPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'movies';
  const [media, setMedia] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPopular = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const endpoint = type === "movies"
        ? `${API_BASE_URL}/api/TMDB/popular/movies`
        : `${API_BASE_URL}/api/TMDB/popular/tv`;
      const response = await axios.get(endpoint, { params: { page } });
      if (response.data.success) {
        setMedia(response.data.results || []);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Error fetching popular:", error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchPopular(1);
  }, [fetchPopular]);

  const getMediaTitle = (item: TMDBMedia) => {
    return item.title || item.name || 'Unknown';
  };

  const handleMediaClick = (item: TMDBMedia) => {
    router.push(`/pages/discover/movies?q=${encodeURIComponent(getMediaTitle(item))}`);
  };

  const renderMediaCard = (item: TMDBMedia) => {
    const isTV = type === "series" || !!item.first_air_date;
    const title = getMediaTitle(item);
    const year = item.release_date ? new Date(item.release_date).getFullYear() : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : null);

    return (
      <div
        key={item.id}
        onClick={() => handleMediaClick(item)}
        className="cursor-pointer group transition-all duration-300 hover:scale-105 hover:-translate-y-1"
        style={{ height: '100%' }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-default-200 hover:border-purple-500 hover:shadow-2xl">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-default-200 flex items-center justify-center">
              <Film size={48} className="text-default-400" />
            </div>
          )}
          
          {/* Media Type Badge - Top Left */}
          <div className="absolute top-1 left-1 z-10">
            <Chip
              size="sm"
              color={isTV ? "secondary" : "primary"}
              variant="flat"
              className="text-[10px] sm:text-xs font-bold uppercase backdrop-blur-md px-1 py-0.5"
            >
              {isTV ? "TV" : "Movie"}
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

          {/* Title and Year Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 group-hover:from-black/98 group-hover:via-black/90">
            <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2 mb-0.5">
              {title}
            </h3>
            {year && (
              <p className="text-[10px] sm:text-xs text-white/70">{year}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-[1600px] 2xl:max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="light"
            onPress={() => router.back()}
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </Button>
          <div className="flex items-center gap-2">
            <Star size={28} className="text-warning" />
            <h1 className="text-3xl sm:text-4xl font-bold">Popular {type === "movies" ? "Movies" : "Series"}</h1>
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : media.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 3xl:grid-cols-12 gap-2 sm:gap-3">
            {media.map((item) => renderMediaCard(item))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-default-500">No popular content available</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="flat"
              onPress={() => fetchPopular(Math.max(1, currentPage - 1))}
              isDisabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm text-default-500">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="flat"
              onPress={() => fetchPopular(Math.min(totalPages, currentPage + 1))}
              isDisabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopularPage;


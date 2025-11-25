"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Input } from "@nextui-org/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal";
import {
  ChevronLeft,
  Search,
  Star,
  Calendar,
  Heart,
  TrendingUp,
  Award,
  Film,
  Tv,
  Globe,
  Zap,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import AddMovieModal from "@/components/AddMovieModal";
import AddSeriesModal from "@/components/AddSeriesModal";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/context/AuthContext";
import "@/styles/FeaturedLists.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";
const TMDB_API_KEY = "1f8c588ce20d993183c247936bc138e9";
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

interface ListConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  type: 'movie' | 'tv';
  endpoint: string;
  params: Record<string, any>;
}

const FeaturedListDetail = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const listId = params.listId as string;

  const [media, setMedia] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
  
  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set());

  // List configuration
  const [listConfig, setListConfig] = useState<ListConfig | null>(null);

  // Define all featured lists configurations
  const featuredListConfigs: Record<string, ListConfig> = {
    'top-rated-movies': {
      id: 'top-rated-movies',
      title: 'Top 250 Narrative Feature Films',
      description: 'The highest-rated movies of all time based on thousands of ratings',
      icon: Star,
      color: 'from-yellow-500 to-orange-500',
      type: 'movie',
      endpoint: '/movie/top_rated',
      params: { language: 'en-US' }
    },
    'popular-movies': {
      id: 'popular-movies',
      title: 'Most Popular on TMDb',
      description: 'The most popular movies being watched right now',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      type: 'movie',
      endpoint: '/movie/popular',
      params: { language: 'en-US' }
    },
    'upcoming-movies': {
      id: 'upcoming-movies',
      title: 'Upcoming Releases',
      description: 'Highly anticipated movies coming soon to theaters',
      icon: Clock,
      color: 'from-blue-500 to-cyan-500',
      type: 'movie',
      endpoint: '/movie/upcoming',
      params: { language: 'en-US' }
    },
    'top-rated-tv': {
      id: 'top-rated-tv',
      title: 'Top 100 Series',
      description: 'The greatest TV shows ever made',
      icon: Tv,
      color: 'from-green-500 to-emerald-500',
      type: 'tv',
      endpoint: '/tv/top_rated',
      params: { language: 'en-US' }
    },
    'trending-movies': {
      id: 'trending-movies',
      title: 'Trending This Week',
      description: 'Movies that are trending right now',
      icon: Zap,
      color: 'from-red-500 to-orange-500',
      type: 'movie',
      endpoint: '/trending/movie/week',
      params: {}
    },
    'award-winners': {
      id: 'award-winners',
      title: 'Academy Award Winners',
      description: 'Oscar-winning films throughout history',
      icon: Award,
      color: 'from-amber-500 to-yellow-500',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_keywords: '210024', // Oscar winner keyword
        'vote_count.gte': 1000
      }
    },
    'animated-films': {
      id: 'animated-films',
      title: 'Top 100 Animated Films',
      description: 'The best animated movies for all ages',
      icon: Sparkles,
      color: 'from-pink-500 to-rose-500',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_genres: '16', // Animation genre
        'vote_count.gte': 500
      }
    },
    'horror-films': {
      id: 'horror-films',
      title: 'Top 250 Horror Films',
      description: 'The scariest and most thrilling horror movies',
      icon: Film,
      color: 'from-red-600 to-black',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_genres: '27', // Horror genre
        'vote_count.gte': 300
      }
    },
    'scifi-films': {
      id: 'scifi-films',
      title: 'Top 250 Sci-Fi Films',
      description: 'Mind-bending science fiction masterpieces',
      icon: Globe,
      color: 'from-cyan-500 to-blue-600',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_genres: '878', // Sci-Fi genre
        'vote_count.gte': 500
      }
    },
    'romance-films': {
      id: 'romance-films',
      title: 'Top Romance Films',
      description: 'The most heartwarming and romantic stories',
      icon: Heart,
      color: 'from-pink-400 to-red-400',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_genres: '10749', // Romance genre
        'vote_count.gte': 500
      }
    },
    'international-films': {
      id: 'international-films',
      title: 'Top 250 International Films',
      description: 'Acclaimed films from around the world',
      icon: Globe,
      color: 'from-indigo-500 to-purple-500',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'vote_average.desc',
        with_original_language: 'ja|ko|fr|es|de|it', // Major non-English languages
        'vote_count.gte': 300
      }
    },
    'cult-classics': {
      id: 'cult-classics',
      title: 'Cult Classics',
      description: 'Iconic movies that have gained devoted followings',
      icon: Users,
      color: 'from-purple-600 to-pink-600',
      type: 'movie',
      endpoint: '/discover/movie',
      params: {
        language: 'en-US',
        sort_by: 'popularity.desc',
        'vote_average.gte': 7.0,
        'vote_count.gte': 1000,
        'release_date.lte': '2010-12-31'
      }
    },
  };

  useEffect(() => {
    const config = featuredListConfigs[listId];
    if (config) {
      setListConfig(config);
      fetchMedia(1, config);
      if (user) {
        fetchFavorites();
      }
    } else {
      // Invalid list ID, redirect back
      router.push('/pages/featuredlists');
    }
  }, [listId, user]);

  const fetchMedia = async (page: number, config: ListConfig) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params: Record<string, string> = {
        api_key: TMDB_API_KEY,
        page: String(page),
      };
      
      // Merge config params
      Object.entries(config.params).forEach(([key, value]) => {
        params[key] = String(value);
      });

      const urlParams = new URLSearchParams(params);
      const response = await fetch(
        `https://api.themoviedb.org/3${config.endpoint}?${urlParams}`
      );
      const data = await response.json();

      if (data.results) {
        const formattedMedia = data.results.map((item: any) => ({
          ...item,
          posterUrl: item.poster_path 
            ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` 
            : null,
          media_type: config.type,
        }));

        if (page === 1) {
          setMedia(formattedMedia);
        } else {
          setMedia(prev => [...prev, ...formattedMedia]);
        }

        setCurrentPage(page);
        setTotalPages(data.total_pages || 1);
        setHasMore(page < (data.total_pages || 1));
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loadingMore && listConfig) {
      fetchMedia(currentPage + 1, listConfig);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/Favorites/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const favorites = response.data.favorites || [];
      const ids = new Set(favorites.map((fav: any) => `${fav.mediaType}-${fav.tmdbId}`));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (mediaItem: TMDBMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      return;
    }

    const mediaType = mediaItem.media_type || 'movie';
    const favoriteKey = `${mediaType}-${mediaItem.id}`;
    const isFavorited = favoriteIds.has(favoriteKey);
    
    setFavoritingIds(prev => new Set(prev).add(mediaItem.id));
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (isFavorited) {
        await axios.delete(`${API_BASE_URL}/api/Favorites`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            tmdbId: mediaItem.id,
            mediaType,
          },
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
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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

  const handleMediaClick = (mediaItem: TMDBMedia) => {
    setSelectedMedia(mediaItem);
    setIsModalOpen(true);
  };

  const filteredMedia = searchQuery
    ? media.filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        return title.includes(searchQuery.toLowerCase());
      })
    : media;

  if (!listConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const IconComponent = listConfig.icon;
  const mediaType = listConfig.type;

  return (
    <div className="FeaturedLists min-h-screen bg-background">
      <ScrollToTop />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-divider">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              isIconOnly
              variant="flat"
              onPress={() => router.push('/pages/featuredlists')}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${listConfig.color} shadow-lg`}>
                <IconComponent size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{listConfig.title}</h1>
                <p className="text-sm text-default-500">{listConfig.description}</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-4">
            <Input
              placeholder="Search titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search size={18} className="text-default-400" />}
              classNames={{
                inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
              }}
              isClearable
              onClear={() => setSearchQuery("")}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredMedia.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-default-500">
                Showing {filteredMedia.length} {mediaType === 'tv' ? 'series' : 'movies'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredMedia.map((item) => {
                const mediaType = item.media_type || 'movie';
                const favoriteKey = `${mediaType}-${item.id}`;
                const isFavorited = favoriteIds.has(favoriteKey);
                const isFavoriting = favoritingIds.has(item.id);

                return (
                  <Card
                    key={item.id}
                    isPressable
                    onPress={() => handleMediaClick(item)}
                    className="group hover:scale-105 transition-all duration-300 bg-content1 border border-secondary/20 hover:border-secondary/60"
                  >
                    <CardBody className="p-0">
                      <div className="relative aspect-[2/3]">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.title || item.name || 'Poster'}
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-content2 flex items-center justify-center rounded-t-lg">
                            <Film size={48} className="text-default-300" />
                          </div>
                        )}
                        
                        {/* Favorite Button */}
                        {user && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isFavorited ? 'bg-danger/90 text-white' : 'bg-background/90'
                            }`}
                            onPress={(e) => toggleFavorite(item, e as any)}
                            isDisabled={isFavoriting}
                          >
                            <Heart 
                              size={16} 
                              className={isFavorited ? 'fill-current' : ''} 
                            />
                          </Button>
                        )}

                        {/* Rating Badge */}
                        {item.vote_average > 0 && (
                          <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-semibold text-white">
                              {item.vote_average.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                          {item.title || item.name || 'Untitled'}
                        </h3>
                        {(item.release_date || item.first_air_date) && (
                          <div className="flex items-center gap-1 text-xs text-default-500">
                            <Calendar size={12} />
                            <span>
                              {new Date(item.release_date || item.first_air_date || '').getFullYear()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  color="primary"
                  variant="flat"
                  onPress={loadMore}
                  isLoading={loadingMore}
                  size="lg"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="bg-content1">
            <CardBody className="text-center py-20">
              <Film size={64} className="mx-auto mb-4 text-default-300" />
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-default-500">
                {searchQuery 
                  ? `No ${mediaType === 'tv' ? 'series' : 'movies'} matching "${searchQuery}"`
                  : `No ${mediaType === 'tv' ? 'series' : 'movies'} available`
                }
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modal */}
      {selectedMedia && (
        mediaType === 'tv' ? (
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


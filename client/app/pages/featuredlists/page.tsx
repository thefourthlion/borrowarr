"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/spinner";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Sparkles, Film } from "lucide-react";
import axios from "axios";
import "@/styles/FeaturedLists.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";
const TMDB_API_KEY = "1f8c588ce20d993183c247936bc138e9";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w185";

interface LetterboxdList {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  authorUrl: string;
  listUrl: string;
  filmCount: number;
  likes: number;
  comments: number;
  category: string;
  featured: boolean;
  posterUrls: string[];
  lastScrapedAt: string;
  tmdbPosters?: string[];
}

const FeaturedLists = () => {
  const router = useRouter();
  const [lists, setLists] = useState<LetterboxdList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosters, setLoadingPosters] = useState(false);

  useEffect(() => {
    fetchLetterboxdLists();
  }, []);

  const fetchLetterboxdLists = async () => {
    setLoading(true);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists`, {
        params: {
          featured: true,
          limit: 100,
        },
      });
      
      const fetchedLists = response.data.lists || [];
      setLists(fetchedLists);
      
      // Fetch TMDb posters for each list
      fetchTMDbPostersForLists(fetchedLists);
    } catch (error) {
      console.error('Error fetching Letterboxd lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTMDbPostersForLists = async (lists: LetterboxdList[]) => {
    setLoadingPosters(true);
    
    try {
      // Process lists in batches to avoid overwhelming the API
      const updatedLists = await Promise.all(
        lists.map(async (list) => {
          try {
            // Extract keywords from the list title to search TMDb
            const searchQuery = getSearchQueryFromTitle(list.title);
            const posters = await fetchTMDbPosters(searchQuery);
            
            return {
              ...list,
              tmdbPosters: posters,
            };
          } catch (error) {
            console.error(`Error fetching posters for ${list.title}:`, error);
            return list;
          }
        })
      );
      
      setLists(updatedLists);
    } catch (error) {
      console.error('Error fetching TMDb posters:', error);
    } finally {
      setLoadingPosters(false);
    }
  };

  const getSearchQueryFromTitle = (title: string): string => {
    // Extract main keywords for searching
    // Remove common list words and numbers
    let query = title
      .replace(/Top \d+/gi, '')
      .replace(/Official/gi, '')
      .replace(/Films?/gi, '')
      .replace(/Movies?/gi, '')
      .replace(/Feature/gi, '')
      .replace(/Narrative/gi, '')
      .replace(/Directors?/gi, '')
      .replace(/Award/gi, '')
      .replace(/Best/gi, '')
      .replace(/\d+/g, '')
      .trim();
    
    // For specific genres or categories, use those
    if (title.toLowerCase().includes('horror')) return 'horror';
    if (title.toLowerCase().includes('sci-fi') || title.toLowerCase().includes('science fiction')) return 'science fiction';
    if (title.toLowerCase().includes('animated') || title.toLowerCase().includes('animation')) return 'animation';
    if (title.toLowerCase().includes('documentary')) return 'documentary';
    if (title.toLowerCase().includes('western')) return 'western';
    if (title.toLowerCase().includes('silent')) return 'silent film';
    if (title.toLowerCase().includes('women directors')) return 'women director';
    if (title.toLowerCase().includes('black directors')) return 'black director';
    
    // Default to popular movies if we can't determine
    return query || 'popular';
  };

  const fetchTMDbPosters = async (searchQuery: string): Promise<string[]> => {
    try {
      // Search for movies matching the query
      const response = await axios.get(
        `https://api.themoviedb.org/3/search/movie`,
        {
          params: {
            api_key: TMDB_API_KEY,
            query: searchQuery,
            language: 'en-US',
            page: 1,
          },
        }
      );

      const results = response.data.results || [];
      
      // Get first 5 movie posters
      const posters = results
        .slice(0, 5)
        .filter((movie: any) => movie.poster_path)
        .map((movie: any) => `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`);
      
      // If we don't have enough, fetch popular movies
      if (posters.length < 5) {
        const popularResponse = await axios.get(
          `https://api.themoviedb.org/3/movie/popular`,
          {
            params: {
              api_key: TMDB_API_KEY,
              language: 'en-US',
              page: 1,
            },
          }
        );
        
        const popularPosters = popularResponse.data.results
          .slice(0, 5 - posters.length)
          .filter((movie: any) => movie.poster_path)
          .map((movie: any) => `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`);
        
        posters.push(...popularPosters);
      }
      
      return posters.slice(0, 5);
    } catch (error) {
      console.error('Error fetching TMDb posters:', error);
      return [];
    }
  };

  const handleViewList = (slug: string) => {
    router.push(`/pages/featuredlists/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Sparkles className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  Featured Lists
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  a starter pack from the community and beyond
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" color="secondary" />
            <p className="mt-4 text-foreground/60">Loading featured lists...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="FeaturedLists min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Sparkles className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  Featured Lists
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  a starter pack from the community and beyond
                </p>
              </div>
            </div>
            <Chip 
              variant="flat" 
              color="secondary"
              startContent={<Film size={14} />}
            >
              {lists.length} Lists
            </Chip>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {lists.length > 0 ? (
          <div>
            {loadingPosters && (
              <div className="mb-6 text-center">
                <Spinner size="sm" color="secondary" />
                <p className="text-sm text-default-500 mt-2">Loading movie posters...</p>
              </div>
            )}
            
            <div className="list-grid">
              {lists.map((list) => {
                const posters = list.tmdbPosters && list.tmdbPosters.length > 0 
                  ? list.tmdbPosters 
                  : [];
                
                return (
                  <div
                    key={list.id}
                    className="list-stacked"
                    onClick={() => handleViewList(list.slug)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleViewList(list.slug);
                      }
                    }}
                  >
                    {/* Overlapping Poster Grid */}
                    <div className="poster-list-overlapped">
                      <div className="posterlist">
                        {posters.length > 0 ? (
                          posters.slice(0, 5).map((posterUrl, idx) => (
                            <div key={idx} className="posteritem">
                              <div className="film-poster">
                                <img
                                  src={posterUrl}
                                  alt={`Film ${idx + 1}`}
                                  className="poster-image"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="posteritem">
                              <div className="film-poster empty-poster">
                                <Film size={24} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* List Info */}
                    <div className="list-info">
                      <h3 className="list-title">
                        {list.title}
                      </h3>

                      {/* Stats - Only show if we have data */}
                      {(list.likes > 0 || list.comments > 0 || list.filmCount > 0) && (
                        <div className="list-stats">
                          {list.filmCount > 0 && (
                            <span className="stat-item">
                              {list.filmCount.toLocaleString()} films
                            </span>
                          )}
                          {list.likes > 0 && (
                            <span className="stat-item">
                              ❤️ {list.likes.toLocaleString()}
                            </span>
                          )}
                          {list.comments > 0 && (
                            <span className="stat-item">
                              💬 {list.comments}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="bg-content1">
            <CardBody className="text-center py-20">
              <Film size={64} className="mx-auto mb-4 text-default-300" />
              <h3 className="text-xl font-semibold mb-2">No lists available</h3>
              <p className="text-default-500 mb-4">
                No featured lists have been scraped yet.
              </p>
              <p className="text-sm text-default-400">
                Run the scraper to populate lists: <code className="bg-content2 px-2 py-1 rounded">node scripts/scrapeLetterboxd.js featured</code>
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FeaturedLists;

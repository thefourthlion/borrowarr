"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@nextui-org/button";
import { 
  Sparkles, 
  Film, 
  RefreshCw, 
  Search,
  Heart,
  ArrowRight,
  X,
} from "lucide-react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

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
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    fetchLetterboxdLists();
  }, []);

  const fetchLetterboxdLists = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists/enriched`, {
        params: { featured: true },
      });
      setLists(response.data.lists || []);
    } catch (err) {
      console.error('Error fetching lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(`${API_BASE_URL}/api/FeaturedLists/scrape`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchLetterboxdLists();
    } catch (err) {
      console.error('Error scraping:', err);
    } finally {
      setScraping(false);
    }
  };

  const handleViewList = (slug: string) => {
    router.push(`/pages/featuredlists/${slug}`);
  };

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(lists.map(l => {
    const title = l.title.toLowerCase();
    if (title.includes('horror')) return 'horror';
    if (title.includes('sci-fi') || title.includes('science')) return 'sci-fi';
    if (title.includes('documentary')) return 'documentary';
    if (title.includes('animated') || title.includes('animation')) return 'animation';
    if (title.includes('comedy')) return 'comedy';
    if (title.includes('drama')) return 'drama';
    if (title.includes('thriller')) return 'thriller';
    if (title.includes('romance')) return 'romance';
    return 'featured';
  })))];

  // Filter lists
  const filteredLists = lists.filter(list => {
    const matchesSearch = list.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === 'all') return matchesSearch;
    
    const title = list.title.toLowerCase();
    if (activeCategory === 'horror') return matchesSearch && title.includes('horror');
    if (activeCategory === 'sci-fi') return matchesSearch && (title.includes('sci-fi') || title.includes('science'));
    if (activeCategory === 'documentary') return matchesSearch && title.includes('documentary');
    if (activeCategory === 'animation') return matchesSearch && (title.includes('animated') || title.includes('animation'));
    if (activeCategory === 'comedy') return matchesSearch && title.includes('comedy');
    if (activeCategory === 'drama') return matchesSearch && title.includes('drama');
    if (activeCategory === 'thriller') return matchesSearch && title.includes('thriller');
    if (activeCategory === 'romance') return matchesSearch && title.includes('romance');
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
          </div>
          <span className="text-sm text-white/40 tracking-widest uppercase">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/6 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-6">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Featured Lists</h1>
                <p className="text-xs text-white/40">{lists.length} curated collections</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                )}
              </div>
            </div>

            {/* Sync Button */}
            <Button
              onPress={handleScrape}
              isLoading={scraping}
              size="sm"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-4 h-11 font-medium transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? 'Syncing' : 'Sync'}
            </Button>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="z-10 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-violet-500 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {filteredLists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLists.map((list, index) => {
              const posters = (list.tmdbPosters?.length ? list.tmdbPosters : list.posterUrls?.filter(u => !u.includes('empty-poster'))) || [];
              const isHovered = hoveredCard === list.id;
              
              return (
                <article
                  key={list.id}
                  onClick={() => handleViewList(list.slug)}
                  onMouseEnter={() => setHoveredCard(list.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative cursor-pointer"
                  style={{ 
                    animationDelay: `${index * 40}ms`,
                    animation: 'fadeSlideUp 0.5s ease-out forwards',
                    opacity: 0,
                  }}
                >
                  <div className={`relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10 transition-all duration-500 ${
                    isHovered ? 'border-violet-500/40 shadow-xl shadow-violet-500/10 scale-[1.02]' : ''
                  }`}>
                    
                    {/* Poster Grid - Clean 4-poster layout */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20">
                      {posters.length >= 4 ? (
                        <div className="absolute inset-0 grid grid-cols-4 gap-0.5">
                          {posters.slice(0, 4).map((poster, idx) => (
                            <div
                              key={idx}
                              className="relative overflow-hidden transition-transform duration-500"
                              style={{
                                transform: isHovered ? `scale(1.05)` : 'scale(1)',
                                transitionDelay: `${idx * 50}ms`,
                              }}
                            >
                              <img
                                src={poster}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect fill="%231a1a2e" width="100" height="150"/></svg>';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : posters.length > 0 ? (
                        <div className="absolute inset-0 flex">
                          {posters.slice(0, 3).map((poster, idx) => (
                            <div
                              key={idx}
                              className="flex-1 overflow-hidden transition-transform duration-500"
                              style={{
                                transform: isHovered ? `scale(1.05)` : 'scale(1)',
                              }}
                            >
                              <img
                                src={poster}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Film className="w-12 h-12 text-white/10" />
                        </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/20 to-transparent" />
                      
                      {/* Film Count Badge */}
                      {list.filmCount > 0 && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-xs font-medium text-white/80">
                          {list.filmCount} films
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className={`font-semibold text-base leading-snug mb-2 transition-colors duration-300 line-clamp-2 ${
                        isHovered ? 'text-violet-300' : 'text-white'
                      }`}>
                        {list.title}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          {list.author && (
                            <span>by {list.author.replace('/', '')}</span>
                          )}
                          {list.likes > 0 && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {list.likes.toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        <div className={`flex items-center gap-1 text-xs font-medium transition-all duration-300 ${
                          isHovered ? 'text-violet-400 translate-x-0 opacity-100' : 'text-transparent -translate-x-2 opacity-0'
                        }`}>
                          <span>Explore</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <Film className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-medium mb-2">No collections found</h3>
            <p className="text-sm text-white/40 mb-6">
              {searchQuery ? `No results for "${searchQuery}"` : 'No featured lists available yet.'}
            </p>
            <Button
              onPress={handleScrape}
              isLoading={scraping}
              className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl px-5"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
              Sync from Letterboxd
            </Button>
          </div>
        )}
      </main>

      {/* Styles */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default FeaturedLists;

"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { 
  Sparkles, 
  Film, 
  RefreshCw, 
  Search,
  TrendingUp,
  Star,
  Heart,
  Play,
  ChevronRight,
  Layers,
  Zap,
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
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLetterboxdLists();
  }, []);

  // Parallax effect for hero
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchLetterboxdLists = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists/enriched`, {
        params: { featured: true, limit: 100 },
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

  // Get featured lists for hero
  const heroLists = lists.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-2 border-purple-500/30 rounded-full animate-ping absolute inset-0" />
            <div className="w-20 h-20 border-2 border-t-purple-500 border-r-purple-500/50 border-b-purple-500/20 border-l-purple-500/10 rounded-full animate-spin" />
          </div>
          <p className="mt-8 text-white/60 tracking-[0.3em] uppercase text-xs font-light">Loading Collections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {/* Animated Background Gradient */}
        <div 
          ref={heroRef}
          className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-indigo-900/30"
        />
        
        {/* Floating Posters Background */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute inset-0 flex flex-wrap gap-4 -rotate-12 scale-125 origin-center">
            {heroLists.flatMap(list => list.tmdbPosters || list.posterUrls || []).slice(0, 20).map((poster, i) => (
              <div 
                key={i}
                className="w-32 h-48 rounded-lg overflow-hidden"
                style={{
                  animation: `float ${10 + (i % 5) * 2}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* Glass Overlay */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black via-black/80 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 lg:px-16">
          <div className="max-w-7xl mx-auto w-full">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs tracking-[0.2em] uppercase text-white/80">Curated Collections</span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                Featured
              </span>
              <br />
              <span className="text-white/90">Lists</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/50 max-w-xl font-light leading-relaxed mb-8">
              Discover hand-picked collections from film enthusiasts, critics, and the community. 
              Over {lists.length} curated lists to explore.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-8 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{lists.length}</div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">Collections</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Film className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{lists.reduce((acc, l) => acc + (l.filmCount || 0), 0).toLocaleString()}</div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">Films</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{lists.reduce((acc, l) => acc + (l.likes || 0), 0).toLocaleString()}</div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">Likes</div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                />
              </div>
              <Button
                onPress={handleScrape}
                isLoading={scraping}
                className="px-6 py-4 h-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-medium transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
                {scraping ? 'Syncing...' : 'Sync Lists'}
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/40 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lists Grid */}
      <section className="py-16 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {activeCategory === 'all' ? 'All Collections' : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Collections`}
              </h2>
              <p className="text-white/40">{filteredLists.length} lists available</p>
            </div>
          </div>

          {/* Grid */}
          {filteredLists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredLists.map((list, index) => {
                const posters = list.tmdbPosters?.length ? list.tmdbPosters : list.posterUrls?.filter(u => !u.includes('empty-poster')) || [];
                
                return (
                  <article
                    key={list.id}
                    onClick={() => handleViewList(list.slug)}
                    className="group cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Card */}
                    <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-3xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2">
                      
                      {/* Poster Stack */}
                      <div className="relative h-48 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                        
                        {/* Stacked Posters Effect */}
                        <div className="flex h-full">
                          {posters.slice(0, 5).map((poster, idx) => (
                            <div
                              key={idx}
                              className="relative flex-shrink-0 transition-all duration-500 group-hover:scale-105"
                              style={{
                                width: `${100 / Math.min(posters.length, 5)}%`,
                                zIndex: 5 - idx,
                                marginLeft: idx > 0 ? '-8%' : 0,
                              }}
                            >
                              <img
                                src={poster}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            </div>
                          ))}
                          {posters.length === 0 && (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 flex items-center justify-center">
                              <Film className="w-12 h-12 text-white/20" />
                            </div>
                          )}
                        </div>

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                            <Play className="w-6 h-6 text-black ml-1" fill="black" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
                          {list.title}
                        </h3>
                        
                        {/* Author */}
                        {list.author && (
                          <p className="text-white/40 text-sm mb-4">
                            by {list.author.replace('/', '')}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          {list.filmCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Film className="w-4 h-4" />
                              {list.filmCount.toLocaleString()}
                            </span>
                          )}
                          {list.likes > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Heart className="w-4 h-4 text-red-400" />
                              {list.likes.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Explore Button */}
                        <div className="mt-5 flex items-center gap-2 text-purple-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Explore Collection</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <Film className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Collections Found</h3>
              <p className="text-white/40 mb-6">
                {searchQuery ? `No results for "${searchQuery}"` : 'No featured lists available yet.'}
              </p>
              <Button
                onPress={handleScrape}
                isLoading={scraping}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl px-6 py-3"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
                Sync from Letterboxd
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer Gradient */}
      <div className="h-32 bg-gradient-to-t from-purple-900/20 to-transparent" />

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
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

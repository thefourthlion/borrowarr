"use client";
import React from "react";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";
import NextLink from "next/link";
import {
  Sparkles,
  Film,
  Tv,
  Download,
  Server,
  Database,
  Zap,
  Shield,
  Globe,
  Play,
  ArrowRight,
  Check,
  TrendingUp,
  Clock,
  Star,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: <Database className="w-8 h-8" />,
      title: "Connect Indexers",
      description: "Seamlessly integrate with your favorite torrent and NZB indexers for comprehensive content discovery.",
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: "Download Clients",
      description: "Connect to qBittorrent, Transmission, SABnzbd, and more. Full control over your downloads.",
    },
    {
      icon: <Film className="w-8 h-8" />,
      title: "Netflix-Like Experience",
      description: "Browse and request movies and TV shows with a beautiful, intuitive interface that feels familiar.",
    },
    {
      icon: <Server className="w-8 h-8" />,
      title: "Self-Hosted",
      description: "Complete control over your media library. Host it on your own infrastructure, your way.",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automated Management",
      description: "Smart monitoring and automatic downloading. Set it and forget it.",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Privacy First",
      description: "Your data stays on your server. No cloud dependencies, no tracking, just pure control.",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Multi-Indexer Support",
      description: "Search across multiple torrent and NZB indexers simultaneously for the best results.",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Smart Quality Selection",
      description: "Automatically selects the best quality releases based on your preferences and availability.",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Real-Time Updates",
      description: "Stay updated with trending content, new releases, and popular shows as they become available.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-dark to-background text-foreground overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pulse-glow" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pulse-glow" style={{animationDelay: '2s'}} />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo/Brand */}
            <div className="mb-8 animate-float">
              <h1 className="text-7xl sm:text-8xl md:text-9xl font-black mb-4 text-gradient-animate neon-text">
                BorrowArr
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-purple-600 mx-auto rounded-full shimmer" />
            </div>

            {/* Tagline */}
            <p className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground/80 mb-6 leading-tight">
              Your Self-Hosted Media Hub
            </p>
            <p className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto mb-8 leading-relaxed">
              Connect indexers, manage downloads, and discover content with a Netflix-like experience. 
              All self-hosted, all under your control.
            </p>
            
            {/* Key Benefits */}
            <div className="flex flex-wrap justify-center gap-4 mb-12 text-sm sm:text-base">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Self-Hosted</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Full Control</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
              <Button
                as={NextLink}
                href="/pages/login"
                size="lg"
                color="secondary"
                className="btn-glow font-semibold px-8 py-6 text-lg"
                endContent={<ArrowRight className="w-5 h-5" />}
              >
                Get Started
              </Button>
              <Button
                as={NextLink}
                href="/pages/discover/movies"
                size="lg"
                variant="bordered"
                color="secondary"
                className="glow-border hover-lift font-semibold px-8 py-6 text-lg backdrop-blur-sm"
                startContent={<Play className="w-5 h-5" />}
              >
                Explore Content
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center group hover-lift p-6 rounded-2xl">
                <div className="text-4xl font-bold text-secondary mb-2 neon-text group-hover:scale-110 transition-transform inline-block">∞</div>
                <div className="text-foreground/60 text-sm group-hover:text-secondary transition-colors">Unlimited Content</div>
              </div>
              <div className="text-center group hover-lift p-6 rounded-2xl">
                <div className="text-4xl font-bold text-secondary mb-2 neon-text group-hover:scale-110 transition-transform inline-block">100%</div>
                <div className="text-foreground/60 text-sm group-hover:text-secondary transition-colors">Self-Hosted</div>
              </div>
              <div className="text-center group hover-lift p-6 rounded-2xl">
                <div className="text-4xl font-bold text-secondary mb-2 neon-text group-hover:scale-110 transition-transform inline-block">0</div>
                <div className="text-foreground/60 text-sm group-hover:text-secondary transition-colors">Cloud Dependencies</div>
              </div>
            </div>
          </div>
        </section>

        {/* What is BorrowArr Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gradient-animate">
                What is BorrowArr?
              </h2>
              <div className="prose dark:prose-invert max-w-3xl mx-auto text-left">
                <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                  <strong className="text-secondary">BorrowArr</strong> is a self-hosted media management platform that brings together 
                  the best of content discovery, automated downloading, and library organization. Think of it as your personal Netflix 
                  combined with powerful automation tools.
                </p>
                <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                  Unlike cloud-based services, BorrowArr runs entirely on your own infrastructure. You connect your favorite torrent 
                  and NZB indexers, configure your download clients (qBittorrent, Transmission, SABnzbd, etc.), and let BorrowArr 
                  handle the rest. Browse movies and TV shows with a beautiful, intuitive interface, request what you want to watch, 
                  and the system automatically finds and downloads the best quality releases.
                </p>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  <strong className="text-secondary">Coming soon:</strong> Advanced file management, automatic organization, quality upgrades, 
                  and intelligent media library optimization. BorrowArr puts you in complete control of your media library while making it 
                  effortless to discover and enjoy new content.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gradient-animate">
                Powerful Features
              </h2>
              <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                Everything you need to manage your media library in one beautiful interface
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="card-interactive group relative p-8 rounded-2xl bg-content2 border border-secondary/20 hover:border-secondary/40 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/0 to-secondary/0 group-hover:from-secondary/10 group-hover:to-secondary/5 rounded-2xl transition-all duration-300" />
                  <div className="relative z-10">
                    <div className="text-secondary mb-4 group-hover:text-secondary-400 transition-all duration-300 group-hover:scale-110 inline-block">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">{feature.title}</h3>
                    <p className="text-foreground/60 leading-relaxed group-hover:text-foreground/80 transition-colors">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Additional Info */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card-interactive p-8 rounded-2xl bg-content2 border border-secondary/20 backdrop-blur-sm group">
                <h3 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-3 group-hover:text-secondary transition-colors">
                  <Tv className="w-6 h-6 text-secondary group-hover:scale-110 transition-transform" />
                  Content Discovery
                </h3>
                <p className="text-foreground/60 leading-relaxed mb-4 group-hover:text-foreground/80 transition-colors">
                  Browse through thousands of movies and TV shows using TMDB's comprehensive database. 
                  Filter by genre, year, rating, streaming service, and more. Get detailed information 
                  including trailers, cast, ratings, and reviews.
                </p>
                <ul className="space-y-2 text-foreground/60 group-hover:text-foreground/80 transition-colors">
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Advanced filtering and search</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Streaming service availability</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Trending and popular content</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Detailed media information and trailers</span>
                  </li>
                </ul>
              </div>
              
              <div className="card-interactive p-8 rounded-2xl bg-content2 border border-secondary/20 backdrop-blur-sm group">
                <h3 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-3 group-hover:text-secondary transition-colors">
                  <Download className="w-6 h-6 text-secondary group-hover:scale-110 transition-transform" />
                  Download Management
                </h3>
                <p className="text-foreground/60 leading-relaxed mb-4 group-hover:text-foreground/80 transition-colors">
                  Monitor your downloads, manage your library, and track what's been downloaded. 
                  BorrowArr integrates with popular download clients and provides real-time status updates.
                </p>
                <ul className="space-y-2 text-foreground/60 group-hover:text-foreground/80 transition-colors">
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Multiple download client support</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Real-time download monitoring</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Automatic quality selection</span>
                  </li>
                  <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <span>Episode-by-episode series downloads</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gradient-animate">
                How It Works
              </h2>
              <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                Simple, powerful, and completely under your control
              </p>
            </div>

            <div className="space-y-12">
              <div className="flex flex-col md:flex-row items-center gap-8 group hover-lift p-6 rounded-2xl transition-all">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-secondary/50 group-hover:shadow-secondary/80 transition-all group-hover:scale-110">
                  1
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">Connect Your Indexers</h3>
                  <p className="text-foreground/60 text-lg group-hover:text-foreground/80 transition-colors">
                    Link your favorite torrent and NZB indexers. BorrowArr will search across all of them to find the content you want.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 group hover-lift p-6 rounded-2xl transition-all">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-secondary/50 group-hover:shadow-secondary/80 transition-all group-hover:scale-110">
                  2
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">Browse & Request</h3>
                  <p className="text-foreground/60 text-lg group-hover:text-foreground/80 transition-colors">
                    Discover movies and TV shows with a beautiful Netflix-like interface. Request what you want to watch.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 group hover-lift p-6 rounded-2xl transition-all">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-secondary/50 group-hover:shadow-secondary/80 transition-all group-hover:scale-110">
                  3
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">Automated Downloads</h3>
                  <p className="text-foreground/60 text-lg group-hover:text-foreground/80 transition-colors">
                    Your download clients automatically grab the best quality releases. Monitor progress and manage your library effortlessly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative p-12 rounded-3xl bg-content2 border-2 border-secondary/30 backdrop-blur-sm hover-lift glow-border">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/5 rounded-3xl pulse-glow" />
              <div className="relative z-10">
                <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gradient-animate">
                  Ready to Get Started?
                </h2>
                <p className="text-foreground/80 text-xl mb-8 max-w-2xl mx-auto">
                  Take control of your media library today. Self-hosted, powerful, and beautiful.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    as={NextLink}
                    href="/pages/login"
                    size="lg"
                    color="secondary"
                    className="btn-glow font-semibold px-10 py-7 text-xl"
                    endContent={<ArrowRight className="w-6 h-6" />}
                  >
                    Get Started
                  </Button>
                  <Button
                    as={NextLink}
                    href="/pages/discover/movies"
                    size="lg"
                    variant="bordered"
                    color="secondary"
                    className="glow-border hover-lift font-semibold px-10 py-7 text-xl backdrop-blur-sm"
                    startContent={<Play className="w-6 h-6" />}
                  >
                    Explore Content
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-secondary/20">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-foreground/60 mb-4">
              <span className="font-bold text-secondary neon-text">BorrowArr</span> - Self-Hosted Media Management
            </p>
            <p className="text-foreground/40 text-sm">
              Connect indexers, manage downloads, discover content. All under your control.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

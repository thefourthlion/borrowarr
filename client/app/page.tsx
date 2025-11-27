"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import NextLink from "next/link";
import {
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
  Search,
  MonitorPlay,
  Library,
  Settings,
  Heart,
  History,
  Box,
  BarChart3,
  Folder,
  Package,
  LucideIcon,
  Boxes,
  Sparkles,
  CheckCircle2,
  Cloud,
  Lock,
  Rocket,
} from "lucide-react";

interface ComparisonApp {
  name: string;
  description: string;
  icon: LucideIcon;
}

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const competitorApps: ComparisonApp[] = [
    { name: "Radarr", description: "Movie Management", icon: Film },
    { name: "Sonarr", description: "TV Series Management", icon: Tv },
    { name: "Prowlarr", description: "Indexer Manager", icon: Database },
    { name: "Overseerr", description: "Request Management", icon: MonitorPlay },
  ];

  const coreFeatures = [
    {
      icon: <Search className="w-8 h-8" />,
      title: "Universal Search",
      description: "Search across multiple indexers simultaneously. Find exactly what you're looking for, faster.",
      page: "/pages/search",
    },
    {
      icon: <Film className="w-8 h-8" />,
      title: "Movie Discovery",
      description: "Browse thousands of movies with filters, ratings, and streaming availability. Beautiful Netflix-like interface.",
      page: "/pages/discover/movies",
    },
    {
      icon: <Tv className="w-8 h-8" />,
      title: "TV Series Discovery",
      description: "Explore TV shows, track seasons and episodes. Never miss your favorite series.",
      page: "/pages/discover/series",
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Indexer Management",
      description: "Connect unlimited torrent and NZB indexers. Test, configure, and prioritize with ease.",
      page: "/pages/indexers",
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: "Download Clients",
      description: "Integrate qBittorrent, Transmission, SABnzbd, and more. Full control over categories and priorities.",
      page: "/pages/settings/downloadclients",
    },
    {
      icon: <MonitorPlay className="w-8 h-8" />,
      title: "Smart Monitoring",
      description: "Automated tracking and downloading. Set quality profiles and let BorrowArr handle the rest.",
      page: "/pages/monitored",
    },
    {
      icon: <History className="w-8 h-8" />,
      title: "Download History",
      description: "Track everything you've downloaded. Complete transparency and organization.",
      page: "/pages/history",
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Favorites",
      description: "Save and organize your favorite movies and shows. Quick access to what matters.",
      page: "/pages/favorites",
    },
    {
      icon: <Library className="w-8 h-8" />,
      title: "Media Library",
      description: "Manage your entire media collection in one place. Plex integration included.",
      page: "/pages/medialibrary",
    },
    {
      icon: <Folder className="w-8 h-8" />,
      title: "File Management",
      description: "Organize, rename, and manage your media files with intelligent automation.",
      page: "/pages/filemanagement",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Statistics & Insights",
      description: "Detailed analytics on your downloads, storage, and activity.",
      page: "/pages/stats",
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: "Advanced Settings",
      description: "Fine-tune every aspect. Quality profiles, naming conventions, and more.",
      page: "/pages/settings",
    },
  ];

  const keyBenefits = [
    {
      icon: <Package className="w-12 h-12" />,
      title: "One App to Rule Them All",
      description: "Why run 4 separate applications when you can have everything in one? BorrowArr combines the power of Radarr, Sonarr, Prowlarr, and Overseerr into a single, unified platform.",
      highlight: "No More App Juggling",
    },
    {
      icon: <Rocket className="w-12 h-12" />,
      title: "Lightning Fast Setup",
      description: "Get up and running in minutes, not hours. Connect your indexers, add your download clients, and start discovering content immediately.",
      highlight: "5 Minute Setup",
    },
    {
      icon: <Server className="w-12 h-12" />,
      title: "Truly Self-Hosted",
      description: "Your server, your rules, your data. BorrowArr runs entirely on your infrastructure. No cloud dependencies, no external services, complete privacy.",
      highlight: "100% Privacy",
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Completely Legal",
      description: "BorrowArr is just a tool. You bring your own indexers and download clients. We provide the interface, you control the content. Fully compliant and transparent.",
      highlight: "Legal & Transparent",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % coreFeatures.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [coreFeatures.length]);

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
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="max-w-6xl mx-auto text-center">
            {/* Logo/Brand */}
            <div className="mb-8 animate-float">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black mb-4 text-gradient-animate neon-text">
                BorrowArr
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-purple-600 mx-auto rounded-full shimmer" />
            </div>

            {/* Tagline */}
            <p className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground/80 mb-4 leading-tight">
              One App. All Your Media Needs.
            </p>
            <p className="text-lg sm:text-xl text-foreground/60 max-w-3xl mx-auto mb-10 leading-relaxed">
              Stop juggling multiple applications. BorrowArr is the unified platform that combines 
              <span className="text-secondary font-semibold"> Radarr</span>,
              <span className="text-secondary font-semibold"> Sonarr</span>,
              <span className="text-secondary font-semibold"> Prowlarr</span>, and
              <span className="text-secondary font-semibold"> Overseerr</span> into one beautiful, self-hosted solution.
            </p>
            
            {/* The Comparison Visual */}
            <div className="mb-12 max-w-4xl mx-auto">
              <div className="bg-content2/50 backdrop-blur-xl rounded-3xl p-8 border border-secondary/20">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Multiple Apps */}
                  <div className="flex-1">
                    <div className="text-foreground/60 text-sm font-semibold mb-4 uppercase tracking-wide">The Old Way</div>
                    <div className="grid grid-cols-2 gap-3">
                      {competitorApps.map((app, idx) => {
                        const Icon = app.icon;
                        return (
                          <div key={idx} className="bg-content3/50 rounded-xl p-4 border border-default-200">
                            <Icon className="w-6 h-6 text-foreground/60 mb-2 mx-auto" />
                            <div className="text-xs font-semibold text-foreground/80">{app.name}</div>
                            <div className="text-xs text-foreground/50">{app.description}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-danger font-semibold">4 Different Apps to Manage</div>
                  </div>

                  {/* Arrow/VS */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center shadow-lg shadow-secondary/50">
                      <ArrowRight className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* BorrowArr */}
                  <div className="flex-1">
                    <div className="text-secondary text-sm font-semibold mb-4 uppercase tracking-wide">The BorrowArr Way</div>
                    <div className="bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl p-6 border-2 border-secondary/50 hover-lift">
                      <Package className="w-12 h-12 text-secondary mb-3 mx-auto" />
                      <div className="text-xl font-bold text-secondary mb-2 neon-text">BorrowArr</div>
                      <div className="text-sm text-foreground/80 mb-3">All-in-One Media Platform</div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Chip size="sm" variant="flat" color="secondary" className="text-xs">Movies</Chip>
                        <Chip size="sm" variant="flat" color="secondary" className="text-xs">TV Shows</Chip>
                        <Chip size="sm" variant="flat" color="secondary" className="text-xs">Indexers</Chip>
                        <Chip size="sm" variant="flat" color="secondary" className="text-xs">Downloads</Chip>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-success font-semibold">One Unified Platform</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Benefits Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-12 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Self-Hosted</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>100% Legal</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-secondary hover-lift">
                <Check className="w-4 h-4" />
                <span>No Cloud</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                as={NextLink}
                href="/pages/login"
                size="lg"
                color="secondary"
                className="btn-glow font-semibold px-10 py-6 text-lg"
                endContent={<ArrowRight className="w-5 h-5" />}
              >
                Start Free
              </Button>
              <Button
                as={NextLink}
                href="/pages/discover/movies"
                size="lg"
                variant="bordered"
                color="secondary"
                className="glow-border hover-lift font-semibold px-10 py-6 text-lg backdrop-blur-sm"
                startContent={<Play className="w-5 h-5" />}
              >
                Explore Content
              </Button>
            </div>
          </div>
        </section>

        {/* What is BorrowArr Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gradient-animate">
                What is BorrowArr?
              </h2>
              <div className="max-w-4xl mx-auto">
                <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                  <strong className="text-secondary">BorrowArr</strong> is the <strong>all-in-one self-hosted media management platform</strong> that eliminates the need to run multiple separate applications. Instead of juggling Radarr for movies, Sonarr for TV shows, Prowlarr for indexers, and Overseerr for requests, you get everything in a single, beautifully designed application.
                </p>
                <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                  Connect your favorite <strong className="text-secondary">torrent and NZB indexers</strong>, configure your <strong className="text-secondary">download clients</strong> (qBittorrent, Transmission, SABnzbd, etc.), and browse content with a gorgeous Netflix-inspired interface powered by TMDB. Search across all your indexers simultaneously, monitor movies and TV shows for automatic downloads, manage your media library with Plex integration, and track everything in one unified dashboard.
                </p>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  <strong className="text-secondary">100% legal, 100% transparent, 100% yours.</strong> BorrowArr is just a tool—you provide your own indexers and download clients. It runs entirely on your infrastructure, ensuring complete privacy and control. Whether you self-host or use our managed platform, your data stays yours.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Benefits Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-content1/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gradient-animate">
                Why Choose BorrowArr?
              </h2>
              <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                The ultimate media management solution designed for simplicity and power
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {keyBenefits.map((benefit, index) => (
                <div
                  key={index}
                  className="card-interactive group relative p-8 rounded-3xl bg-content2 border border-secondary/20 hover:border-secondary/40 backdrop-blur-sm"
                >
                  <div className="absolute top-4 right-4">
                    <Chip size="sm" color="secondary" variant="flat" className="text-xs font-semibold">
                      {benefit.highlight}
                    </Chip>
                  </div>
                  <div className="relative z-10">
                    <div className="text-secondary mb-6 group-hover:text-secondary-400 transition-all duration-300 group-hover:scale-110 inline-block">
                      {benefit.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-secondary transition-colors">{benefit.title}</h3>
                    <p className="text-foreground/70 leading-relaxed text-base group-hover:text-foreground/90 transition-colors">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* All Features Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gradient-animate">
                Everything You Need
              </h2>
              <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                12+ powerful features integrated into one seamless experience
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {coreFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="card-interactive group relative p-6 rounded-2xl bg-content2 border border-secondary/20 hover:border-secondary/40 backdrop-blur-sm transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative z-10">
                    <div className="text-secondary mb-4 group-hover:text-secondary-400 transition-all duration-300 group-hover:scale-110 inline-block">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-secondary transition-colors">{feature.title}</h3>
                    <p className="text-foreground/60 text-sm leading-relaxed group-hover:text-foreground/80 transition-colors">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-content1/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gradient-animate">
                How It Works
              </h2>
              <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                Get started in 3 simple steps
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col md:flex-row items-start gap-6 group hover-lift p-8 rounded-3xl transition-all bg-content2/50 border border-secondary/10">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-secondary/50 group-hover:shadow-secondary/80 transition-all group-hover:scale-110">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">Connect Your Sources</h3>
                  <p className="text-foreground/70 text-lg group-hover:text-foreground/90 transition-colors leading-relaxed">
                    Add your torrent and NZB indexers, then connect your download clients like qBittorrent, Transmission, or SABnzbd. BorrowArr supports unlimited indexers and clients, giving you complete flexibility.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6 group hover-lift p-8 rounded-3xl transition-all bg-content2/50 border border-secondary/10">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-secondary/50 group-hover:shadow-secondary/80 transition-all group-hover:scale-110">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">Discover & Request</h3>
                  <p className="text-foreground/70 text-lg group-hover:text-foreground/90 transition-colors leading-relaxed">
                    Browse thousands of movies and TV shows with our beautiful, Netflix-like interface. Filter by genre, year, rating, streaming service, and more. When you find something you want, simply request it with a single click.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6 group hover-lift p-8 rounded-3xl transition-all bg-content2/50 border border-secondary/10">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-secondary-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-secondary/50 group-hover:shadow-secondary/80 transition-all group-hover:scale-110">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-secondary transition-colors">Automated Downloads</h3>
                  <p className="text-foreground/70 text-lg group-hover:text-foreground/90 transition-colors leading-relaxed">
                    BorrowArr automatically searches all your indexers for the best quality releases, sends them to your download clients, and tracks everything in your history. Monitor progress, manage your library, and enjoy your content—all from one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deployment Options Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gradient-animate">
                Choose Your Deployment
              </h2>
              <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
                Self-host for free or use our managed platform
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Self-Hosted Option */}
              <div className="card-interactive group relative p-10 rounded-3xl bg-content2 border-2 border-secondary/30 hover:border-secondary/50 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/0 to-secondary/0 group-hover:from-secondary/10 group-hover:to-secondary/5 rounded-3xl transition-all duration-300" />
                <div className="relative z-10 text-center">
                  <Server className="w-16 h-16 text-secondary mb-6 mx-auto group-hover:scale-110 transition-transform" />
                  <h3 className="text-3xl font-bold mb-4 text-foreground group-hover:text-secondary transition-colors">Self-Hosted</h3>
                  <div className="text-5xl font-black text-secondary mb-4 neon-text">FREE</div>
                  <p className="text-foreground/70 mb-6 leading-relaxed">
                    Download and run BorrowArr on your own server. Complete control, zero cost, unlimited everything.
                  </p>
                  <ul className="space-y-3 text-left mb-8">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">100% open source</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Unlimited indexers & clients</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">No usage limits</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Complete privacy</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Community support</span>
                    </li>
                  </ul>
                  <Button
                    as="a"
                    href="https://github.com/yourusername/borrowarr"
                    target="_blank"
                    size="lg"
                    color="secondary"
                    variant="bordered"
                    className="w-full glow-border hover-lift font-semibold"
                  >
                    View on GitHub
                  </Button>
                </div>
              </div>

              {/* Managed Platform Option */}
              <div className="card-interactive group relative p-10 rounded-3xl bg-gradient-to-br from-secondary/20 to-secondary/10 border-2 border-secondary/50 hover:border-secondary backdrop-blur-sm">
                <div className="absolute top-4 right-4">
                  <Chip size="sm" color="secondary" className="font-semibold">Coming Soon</Chip>
                </div>
                <div className="relative z-10 text-center">
                  <Cloud className="w-16 h-16 text-secondary mb-6 mx-auto group-hover:scale-110 transition-transform" />
                  <h3 className="text-3xl font-bold mb-4 text-foreground group-hover:text-secondary transition-colors">Managed Platform</h3>
                  <div className="text-5xl font-black text-secondary mb-4 neon-text">$TBD/mo</div>
                  <p className="text-foreground/70 mb-6 leading-relaxed">
                    We host BorrowArr for you. Just bring your indexers and download clients. Zero maintenance, maximum convenience.
                  </p>
                  <ul className="space-y-3 text-left mb-8">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Hassle-free hosting</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Automatic updates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">99.9% uptime guarantee</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Premium support</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">Your indexers & clients</span>
                    </li>
                  </ul>
                  <Button
                    size="lg"
                    color="secondary"
                    className="w-full btn-glow font-semibold"
                    isDisabled
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Legal & Transparent Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-content1/30">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <Shield className="w-20 h-20 text-secondary mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gradient-animate">
                100% Legal & Transparent
              </h2>
            </div>
            <div className="bg-content2/50 backdrop-blur-xl rounded-3xl p-8 border border-secondary/20">
              <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                <strong className="text-secondary">BorrowArr is a neutral tool</strong>—just like a web browser or text editor. We don't provide, host, or distribute any content. We don't operate any indexers or download services. BorrowArr simply provides an interface to manage <em>your</em> indexers and <em>your</em> download clients.
              </p>
              <p className="text-foreground/80 text-lg leading-relaxed mb-6">
                You are responsible for ensuring your usage complies with local laws and the terms of service of any indexers or download clients you connect. BorrowArr gives you the tools—how you use them is entirely up to you.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <div className="flex items-center gap-2 text-secondary">
                  <Lock className="w-5 h-5" />
                  <span className="font-semibold">Secure & Private</span>
                </div>
                <div className="flex items-center gap-2 text-secondary">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Legally Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-secondary">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Transparent Operation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative p-12 rounded-3xl bg-content2 border-2 border-secondary/30 backdrop-blur-sm hover-lift glow-border">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/5 rounded-3xl pulse-glow" />
              <div className="relative z-10">
                <Sparkles className="w-16 h-16 text-secondary mx-auto mb-6" />
                <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gradient-animate">
                  Ready to Simplify Your Media?
                </h2>
                <p className="text-foreground/80 text-xl mb-8 max-w-2xl mx-auto">
                  Join users who've already ditched the complexity. One app, unlimited possibilities.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    as={NextLink}
                    href="/pages/login"
                    size="lg"
                    color="secondary"
                    className="btn-glow font-semibold px-12 py-7 text-xl"
                    endContent={<ArrowRight className="w-6 h-6" />}
                  >
                    Get Started Now
                  </Button>
                  <Button
                    as={NextLink}
                    href="/pages/discover/movies"
                    size="lg"
                    variant="bordered"
                    color="secondary"
                    className="glow-border hover-lift font-semibold px-12 py-7 text-xl backdrop-blur-sm"
                    startContent={<Play className="w-6 h-6" />}
                  >
                    Explore Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-secondary/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-secondary neon-text mb-2">BorrowArr</h3>
              <p className="text-foreground/60 mb-6">
                The unified media management platform. One app to replace them all.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-foreground/60">
                <a href="#" className="hover:text-secondary transition-colors link-hover">Documentation</a>
                <a href="#" className="hover:text-secondary transition-colors link-hover">GitHub</a>
                <a href="#" className="hover:text-secondary transition-colors link-hover">Discord</a>
                <a href="#" className="hover:text-secondary transition-colors link-hover">Support</a>
              </div>
            </div>
            <div className="text-center text-foreground/40 text-sm">
              <p className="mb-2">
                © 2025 BorrowArr. Open source and self-hosted media management.
              </p>
              <p className="text-xs">
                BorrowArr is a neutral tool. Users are responsible for their own indexers, download clients, and content choices.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

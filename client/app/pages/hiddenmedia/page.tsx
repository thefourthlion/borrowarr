"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Spinner } from "@nextui-org/spinner";
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/modal";
import { useRouter } from "next/navigation";
import {
  Film,
  Tv,
  Search,
  ChevronLeft,
  EyeOff,
  Eye,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface HiddenMedia {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: 'movie' | 'series';
  title: string | null;
  posterPath: string | null;
  createdAt: string;
  updatedAt: string;
}

const HiddenMediaPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [hiddenMedia, setHiddenMedia] = useState<HiddenMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');

  // Unhiding state
  const [unhiding, setUnhiding] = useState<Set<number>>(new Set());

  // Modal state for notifications
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotificationModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeNotification = () => {
    setNotificationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Fetch hidden media
  const fetchHiddenMedia = useCallback(async () => {
    if (!user) {
      router.push('/pages/login');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const params: any = {};

      if (mediaTypeFilter && mediaTypeFilter !== 'all') {
        params.mediaType = mediaTypeFilter;
      }

      const response = await axios.get(`${API_BASE_URL}/api/HiddenMedia/details`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.success) {
        let results = response.data.hiddenMedia || [];
        
        // Filter by search query
        if (debouncedSearchQuery.trim()) {
          const query = debouncedSearchQuery.toLowerCase();
          results = results.filter((item: HiddenMedia) =>
            item.title?.toLowerCase().includes(query)
          );
        }

        // Sort hidden media based on sortBy
        const sortedResults = [...results].sort((a: HiddenMedia, b: HiddenMedia) => {
          if (sortBy === 'recent') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } else if (sortBy === 'title') {
            return (a.title || '').localeCompare(b.title || '');
          }
          return 0;
        });

        setHiddenMedia(sortedResults);
      }
    } catch (error: any) {
      console.error('Error fetching hidden media:', error);
      showNotification('Error', 'Failed to load hidden media', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, router, mediaTypeFilter, debouncedSearchQuery, sortBy]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchHiddenMedia();
  }, [fetchHiddenMedia]);

  // Unhide media
  const handleUnhide = async (item: HiddenMedia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setUnhiding((prev) => new Set(prev).add(item.tmdbId));

    try {
      const token = localStorage.getItem("token");
      
      await axios.post(
        `${API_BASE_URL}/api/HiddenMedia/unhide`,
        {
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Remove from local state
      setHiddenMedia((prev) => prev.filter((h) => h.id !== item.id));
      showNotification('Success', `${item.title || 'Item'} has been unhidden`, 'success');
    } catch (error: any) {
      console.error('Error unhiding media:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to unhide";
      showNotification('Error', errorMsg, 'error');
    } finally {
      setUnhiding((prev) => {
        const next = new Set(prev);
        next.delete(item.tmdbId);
        return next;
      });
    }
  };

  // Handle media click
  const handleMediaClick = (item: HiddenMedia) => {
    const mediaType = item.mediaType === 'series' ? 'series' : 'movie';
    const title = item.title || 'Unknown';
    router.push(`/pages/${mediaType}/${item.tmdbId}?name=${encodeURIComponent(title)}`);
  };

  const getMediaTitle = (item: HiddenMedia) => item.title || 'Unknown Title';

  const renderMediaCard = (item: HiddenMedia) => {
    const title = getMediaTitle(item);
    const posterUrl = item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : null;
    const isUnhiding = unhiding.has(item.tmdbId);
    const isTV = item.mediaType === 'series';

    return (
      <div
        key={item.id}
        onClick={() => handleMediaClick(item)}
        className="cursor-pointer group transition-all duration-300 hover:scale-105 hover:-translate-y-1"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md sm:rounded-lg md:rounded-xl border border-secondary/20 hover:border-secondary/60 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-secondary/20 transition-all duration-300">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-default-200 flex items-center justify-center">
              {isTV ? <Tv size={48} className="text-default-400" /> : <Film size={48} className="text-default-400" />}
            </div>
          )}

          {/* Media Type Badge - Top Left */}
          <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 z-10">
            <Chip
              size="sm"
              color={isTV ? "secondary" : "primary"}
              variant="flat"
              className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase backdrop-blur-md px-0.5 sm:px-1 py-0.5 h-4 sm:h-5"
            >
              {isTV ? 'Series' : 'Movie'}
            </Chip>
          </div>

          {/* Hidden Badge - Top Right */}
          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10">
            <Chip
              size="sm"
              color="warning"
              variant="flat"
              startContent={<EyeOff size={12} />}
              className="text-[9px] sm:text-[10px] md:text-xs font-bold backdrop-blur-md px-1 py-0.5 h-4 sm:h-5"
            >
              Hidden
            </Chip>
          </div>

          {/* Unhide Button - Bottom Right */}
          <button
            onClick={(e) => handleUnhide(item, e)}
            disabled={isUnhiding}
            className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 z-10 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all duration-200 ${
              isUnhiding
                ? 'bg-default-300 opacity-50 cursor-not-allowed'
                : 'bg-success/90 hover:bg-success'
            }`}
            title="Unhide"
          >
            {isUnhiding ? (
              <Spinner size="sm" color="white" className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <Eye size={14} className="sm:w-4 sm:h-4 text-white" />
            )}
          </button>

          {/* Title Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300 group-hover:from-black/98 group-hover:via-black/90">
            <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm text-white line-clamp-2 leading-tight">
              {title}
            </h3>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody className="text-center py-10">
            <EyeOff size={64} className="mx-auto mb-4 text-default-300" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-default-500 mb-6">
              Please log in to view your hidden media.
            </p>
            <Button color="secondary" onPress={() => router.push('/pages/login')}>
              Go to Login
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="HiddenMedia min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              isIconOnly
              variant="light"
              onPress={() => router.back()}
              className="hover:bg-secondary/10"
            >
              <ChevronLeft size={24} />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-xl bg-warning/10">
                <EyeOff className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-warning to-warning-600 bg-clip-text text-transparent">
                  Hidden Media
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Manage content you've hidden from discover pages
                </p>
              </div>
            </div>
            <Chip variant="flat" color="warning">
              {hiddenMedia.length} Hidden
            </Chip>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search hidden media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search size={18} className="text-default-400" />}
              classNames={{
                input: "text-sm",
                inputWrapper: "bg-default-100 hover:bg-default-200",
              }}
              className="flex-1"
            />
            <Select
              selectedKeys={[mediaTypeFilter]}
              onChange={(e) => setMediaTypeFilter(e.target.value as 'all' | 'movie' | 'series')}
              classNames={{
                trigger: "bg-default-100 hover:bg-default-200",
              }}
              className="w-full sm:w-40"
              aria-label="Filter by type"
            >
              <SelectItem key="all" value="all">All Types</SelectItem>
              <SelectItem key="movie" value="movie">Movies</SelectItem>
              <SelectItem key="series" value="series">Series</SelectItem>
            </Select>
            <Select
              selectedKeys={[sortBy]}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'title')}
              classNames={{
                trigger: "bg-default-100 hover:bg-default-200",
              }}
              className="w-full sm:w-40"
              aria-label="Sort by"
            >
              <SelectItem key="recent" value="recent">Recently Hidden</SelectItem>
              <SelectItem key="title" value="title">Title (A-Z)</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" color="warning" />
            <p className="mt-4 text-foreground/60">Loading hidden media...</p>
          </div>
        ) : hiddenMedia.length === 0 ? (
          <Card className="bg-content1">
            <CardBody className="text-center py-20">
              <EyeOff size={64} className="mx-auto mb-4 text-default-300" />
              <h3 className="text-xl font-semibold mb-2">No Hidden Media</h3>
              <p className="text-default-500 mb-4">
                {debouncedSearchQuery
                  ? `No results found for "${debouncedSearchQuery}"`
                  : "You haven't hidden any movies or series yet."}
              </p>
              <Button
                color="secondary"
                variant="flat"
                onPress={() => router.push('/pages/discover')}
              >
                Browse Discover
              </Button>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Info Banner */}
            <Card className="mb-6 bg-warning/5 border-warning/20">
              <CardBody className="py-3">
                <div className="flex items-start gap-3">
                  <EyeOff className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground/80">
                      Hidden items won't appear in discover pages, search results, or recommendations.
                      Click the <Eye size={14} className="inline mb-1" /> icon to unhide any item.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 4xl:grid-cols-12 5xl:grid-cols-14 gap-2 sm:gap-3 md:gap-4">
              {hiddenMedia.map((item) => (
                <React.Fragment key={item.id}>
                  {renderMediaCard(item)}
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Notification Modal */}
      <Modal
        isOpen={notificationModal.isOpen}
        onClose={closeNotification}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {notificationModal.title}
          </ModalHeader>
          <ModalBody>
            <p>{notificationModal.message}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onPress={closeNotification}>
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ScrollToTop />
    </div>
  );
};

export default HiddenMediaPage;

"use client";
import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@nextui-org/button';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface CategoryItem {
  id: number;
  name: string;
  logo_path?: string | null;
  backdrop_path?: string | null;
}

interface CategoryCarouselProps {
  title: string;
  items: CategoryItem[];
  loading?: boolean;
  icon?: React.ReactNode;
  categoryPath?: string;
  type: 'genre' | 'studio' | 'network';
  mediaType?: 'movie' | 'tv';
  onItemClick?: (item: CategoryItem) => void;
}

const CategoryCarousel: React.FC<CategoryCarouselProps> = ({
  title,
  items,
  loading = false,
  icon,
  categoryPath,
  type,
  mediaType,
  onItemClick,
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Update scroll buttons when API changes
  React.useEffect(() => {
    if (!api) return;

    const updateScrollButtons = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    updateScrollButtons();
    api.on('select', updateScrollButtons);
    api.on('reInit', updateScrollButtons);

    return () => {
      api.off('select', updateScrollButtons);
      api.off('reInit', updateScrollButtons);
    };
  }, [api]);

  const getBackgroundGradient = (index: number) => {
    const gradients = [
      'from-orange-500/20 to-orange-900/20',
      'from-blue-500/20 to-blue-900/20',
      'from-green-500/20 to-green-900/20',
      'from-purple-500/20 to-purple-900/20',
      'from-pink-500/20 to-pink-900/20',
      'from-yellow-500/20 to-yellow-900/20',
      'from-red-500/20 to-red-900/20',
      'from-indigo-500/20 to-indigo-900/20',
      'from-teal-500/20 to-teal-900/20',
      'from-cyan-500/20 to-cyan-900/20',
    ];
    return gradients[index % gradients.length];
  };

  const handleItemClick = (item: CategoryItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const renderCategoryCard = (item: CategoryItem, index: number) => {
    if (type === 'studio' || type === 'network') {
      // Studio/Network card with logo
      return (
        <div
          onClick={() => handleItemClick(item)}
          className="cursor-pointer group transition-all duration-300"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-content2 border border-secondary/20 hover:border-secondary/60 hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 flex items-center justify-center p-3 sm:p-4">
            {item.logo_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${item.logo_path}`}
                alt={item.name}
                className="max-w-full max-h-full object-contain filter brightness-0 invert dark:filter-none transition-all duration-300 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <span className="text-sm sm:text-base font-bold text-center text-foreground/80 group-hover:text-secondary transition-colors leading-tight">
                {item.name}
              </span>
            )}
          </div>
        </div>
      );
    } else {
      // Genre card with background
      return (
        <div
          onClick={() => handleItemClick(item)}
          className="cursor-pointer group transition-all duration-300"
        >
          <div className={`relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br ${getBackgroundGradient(index)} border border-secondary/20 hover:border-secondary/60 hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 flex items-center justify-center p-3 sm:p-4`}>
            {/* Background pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            {/* Genre name */}
            <h3 className="relative z-10 text-sm sm:text-base md:text-lg lg:text-xl font-bold text-center text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300 leading-tight">
              {item.name}
            </h3>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full py-4">
        <div className="container max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="category-carousel w-full py-1">
      <div className="container max-w-[2400px] mx-auto px-2 sm:px-3">
        {/* Header */}
        <div className="mb-3 sm:mb-4 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-left">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Carousel Navigation Arrows */}
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  className="bg-default-100 hover:bg-default-200 transition-all min-w-9 h-9 rounded-full"
                  onPress={() => api?.scrollPrev()}
                  isDisabled={!canScrollPrev}
                >
                  <ArrowRight size={18} className="rotate-180" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  className="bg-default-100 hover:bg-default-200 transition-all min-w-9 h-9 rounded-full"
                  onPress={() => api?.scrollNext()}
                  isDisabled={!canScrollNext}
                >
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: false,
              skipSnaps: false,
              dragFree: true,
            }}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-2 sm:-ml-3">
              {items.map((item, index) => (
                <CarouselItem 
                  key={item.id}
                  className="pl-2 sm:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-1/7 3xl:basis-1/8 4xl:basis-1/10 5xl:basis-1/12"
                  style={{ flexBasis: `clamp(160px, ${100 / Math.min(items.length, 12)}%, 280px)` }}
                >
                  {renderCategoryCard(item, index)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};

export default CategoryCarousel;


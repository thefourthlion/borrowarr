"use client";
import React, { useState } from "react";
import {
  ArrowRight,
  Baby,
  Clapperboard,
  Compass,
  Drama,
  FileText,
  Ghost,
  Heart,
  History,
  Landmark,
  Laugh,
  Music,
  Rocket,
  Shield,
  Skull,
  Sparkles,
  Swords,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@nextui-org/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
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
  type: "genre" | "studio" | "network";
  mediaType?: "movie" | "tv";
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
    api.on("select", updateScrollButtons);
    api.on("reInit", updateScrollButtons);

    return () => {
      api.off("select", updateScrollButtons);
      api.off("reInit", updateScrollButtons);
    };
  }, [api]);

  const getGenreIcon = (name: string): LucideIcon => {
    const normalizedName = name.toLowerCase();

    if (normalizedName.includes("action")) return Swords;
    if (normalizedName.includes("adventure")) return Compass;
    if (normalizedName.includes("animation")) return Sparkles;
    if (normalizedName.includes("comedy")) return Laugh;
    if (normalizedName.includes("crime")) return Shield;
    if (normalizedName.includes("documentary")) return FileText;
    if (normalizedName.includes("drama")) return Drama;
    if (normalizedName.includes("family")) return Baby;
    if (normalizedName.includes("fantasy")) return Sparkles;
    if (normalizedName.includes("history")) return History;
    if (normalizedName.includes("horror")) return Ghost;
    if (normalizedName.includes("music")) return Music;
    if (normalizedName.includes("mystery")) return Skull;
    if (normalizedName.includes("romance")) return Heart;
    if (normalizedName.includes("science") || normalizedName.includes("sci-fi")) {
      return Rocket;
    }
    if (normalizedName.includes("war")) return Shield;
    if (normalizedName.includes("western")) return Landmark;

    return Clapperboard;
  };

  const handleItemClick = (item: CategoryItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const renderCategoryCard = (item: CategoryItem) => {
    if (type === "studio" || type === "network") {
      // Studio/Network card with logo
      return (
        <div
          className="cursor-pointer group transition-all duration-300"
          onClick={() => handleItemClick(item)}
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-content2 border border-secondary/20 hover:border-secondary/60 hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 flex items-center justify-center p-3 sm:p-4">
            {item.logo_path ? (
              <img
                alt={item.name}
                className="max-w-full max-h-full object-contain filter brightness-0 invert dark:filter-none transition-all duration-300 group-hover:scale-110"
                loading="lazy"
                src={`https://image.tmdb.org/t/p/w500${item.logo_path}`}
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
      const GenreIcon = getGenreIcon(item.name);

      return (
        <button
          className="group w-full transition-all duration-300"
          onClick={() => handleItemClick(item)}
          type="button"
        >
          <div className="relative h-24 sm:h-28 w-full overflow-hidden rounded-lg border border-white/10 bg-background/60 hover:bg-content2/80 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/10 transition-all duration-300 flex flex-col items-center justify-center gap-2.5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary/25 bg-secondary/10 text-secondary transition-all duration-300 group-hover:scale-105 group-hover:border-secondary/50 group-hover:bg-secondary/15">
              <GenreIcon size={22} strokeWidth={2.2} />
            </div>
            <h3 className="max-w-full text-center text-sm font-semibold text-foreground leading-tight">
              {item.name}
            </h3>
          </div>
        </button>
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full py-4">
        <div className="container max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
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
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-left">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Carousel Navigation Arrows */}
              <div className="flex items-center gap-1">
                <Button
                  className="bg-default-100 hover:bg-default-200 transition-all min-w-9 h-9 rounded-full"
                  isDisabled={!canScrollPrev}
                  isIconOnly
                  onPress={() => api?.scrollPrev()}
                  size="sm"
                  variant="flat"
                >
                  <ArrowRight className="rotate-180" size={18} />
                </Button>
                <Button
                  className="bg-default-100 hover:bg-default-200 transition-all min-w-9 h-9 rounded-full"
                  isDisabled={!canScrollNext}
                  isIconOnly
                  onPress={() => api?.scrollNext()}
                  size="sm"
                  variant="flat"
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
            className="w-full"
            opts={{
              align: "start",
              loop: false,
              skipSnaps: false,
              dragFree: true,
            }}
            setApi={setApi}
          >
            <CarouselContent className="-ml-2 sm:-ml-3">
              {items.map((item) => (
                <CarouselItem
                  className="pl-2 sm:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 2xl:basis-1/7 3xl:basis-1/8 4xl:basis-1/10 5xl:basis-1/12"
                  key={item.id}
                  style={{
                    flexBasis: `clamp(160px, ${100 / Math.min(items.length, 12)}%, 280px)`,
                  }}
                >
                  {renderCategoryCard(item)}
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

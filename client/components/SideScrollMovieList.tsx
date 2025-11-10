"use client";
import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Spinner } from '@nextui-org/spinner';
import { Chip } from '@nextui-org/chip';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import "../styles/SideScrollMovieList.scss";

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
  genre_ids?: number[];
  genres?: string[];
  language?: string;
  network?: string;
  number_of_seasons?: number;
  media_type?: 'movie' | 'tv';
}

interface SideScrollMovieListProps {
  title: string;
  items: TMDBMedia[];
  loading?: boolean;
  icon?: React.ReactNode;
  categoryPath?: string;
}

const SideScrollMovieList: React.FC<SideScrollMovieListProps> = ({
  title,
  items,
  loading = false,
  icon,
  categoryPath,
}) => {
  console.log('[SideScrollMovieList] Component rendered:', { title, itemsCount: items.length, loading });
  console.log('[SideScrollMovieList] Items data:', items);
  
  const getMediaTitle = (item: TMDBMedia) => {
    const title = item.title || item.name || 'Unknown';
    console.log('[SideScrollMovieList] getMediaTitle for item:', item.id, '->', title);
    return title;
  };
  
  const getMediaYear = (item: TMDBMedia) => {
    const date = item.release_date || item.first_air_date;
    const year = date ? new Date(date).getFullYear() : '';
    console.log('[SideScrollMovieList] getMediaYear for item:', item.id, 'date:', date, '->', year);
    return year;
  };

  console.log('[SideScrollMovieList] Rendering with', items.length, 'items');
  
  const [api, setApi] = React.useState<CarouselApi>();
  const carouselRef = useRef<HTMLDivElement>(null);

  // Constrain viewport BEFORE carousel initializes - this is critical!
  React.useEffect(() => {
    if (!carouselRef.current || items.length === 0) return;
    
    const constrainViewport = () => {
      const container = carouselRef.current;
      if (!container) return;
      
      // Get the content-wrapper parent to account for padding
      const contentWrapper = container.closest('.content-wrapper') as HTMLElement;
      if (!contentWrapper) {
        console.log('[SideScrollMovieList] No content-wrapper found');
        return;
      }
      
      // Find viewport - it might not exist yet if carousel hasn't rendered
      const viewport = container.querySelector('[class*="overflow-hidden"]') as HTMLElement;
      if (!viewport) {
        // Viewport doesn't exist yet, try again soon
        setTimeout(constrainViewport, 50);
        return;
      }
      
      // Calculate visible width: content-wrapper width minus its padding
      const wrapperRect = contentWrapper.getBoundingClientRect();
      const wrapperStyle = window.getComputedStyle(contentWrapper);
      const paddingLeft = parseFloat(wrapperStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(wrapperStyle.paddingRight) || 0;
      const visibleWidth = wrapperRect.width - paddingLeft - paddingRight;
      
      const viewportWidth = viewport.getBoundingClientRect().width;
      const scrollWidth = viewport.scrollWidth;
      
      console.log('[SideScrollMovieList] Viewport constraint check:', {
        wrapperWidth: wrapperRect.width,
        paddingLeft,
        paddingRight,
        visibleWidth,
        viewportWidth,
        scrollWidth,
        needsConstraint: viewportWidth >= scrollWidth || viewportWidth > visibleWidth
      });
      
      // ALWAYS constrain to visible width - this is critical for Embla to detect overflow
      // If scrollWidth exists and is larger, ensure viewport is smaller
      const targetWidth = scrollWidth > 0 && scrollWidth > visibleWidth 
        ? Math.min(visibleWidth, scrollWidth - 1) 
        : visibleWidth;
      
      if (Math.abs(viewportWidth - targetWidth) > 1 || viewportWidth >= scrollWidth) {
        console.log('[SideScrollMovieList] Constraining viewport from', viewportWidth, 'to', targetWidth, '(visibleWidth:', visibleWidth, ', scrollWidth:', scrollWidth, ')');
        viewport.style.setProperty('width', `${targetWidth}px`, 'important');
        viewport.style.setProperty('max-width', `${targetWidth}px`, 'important');
        viewport.style.setProperty('min-width', `${targetWidth}px`, 'important');
        viewport.style.setProperty('box-sizing', 'border-box', 'important');
        
        // Force a reflow to ensure the change takes effect
        void viewport.offsetHeight;
      }
    };
    
    // Use ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      constrainViewport();
    });
    
    // Observe the content-wrapper for size changes
    const contentWrapper = carouselRef.current.closest('.content-wrapper') as HTMLElement;
    if (contentWrapper) {
      resizeObserver.observe(contentWrapper);
    }
    
    // Initial constraint - run multiple times to catch viewport when it appears
    const timeouts: NodeJS.Timeout[] = [];
    [0, 50, 100, 200, 300].forEach(delay => {
      const timeout = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(constrainViewport);
        });
      }, delay);
      timeouts.push(timeout);
    });
    
    // Also run on window resize
    window.addEventListener('resize', constrainViewport);
    
    return () => {
      resizeObserver.disconnect();
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', constrainViewport);
    };
  }, [items]);

  React.useEffect(() => {
    console.log('[SideScrollMovieList] Items changed:', {
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        title: item.title || item.name,
        media_type: item.media_type,
        vote_average: item.vote_average,
        poster_path: item.poster_path,
        posterUrl: item.posterUrl,
        release_date: item.release_date,
        first_air_date: item.first_air_date
      }))
    });
    
    // Force carousel to reinit after items are loaded and images have rendered
    if (api && items.length > 0 && carouselRef.current) {
      console.log('[SideScrollMovieList] Forcing carousel reinit with', items.length, 'items');
      
      // Wait for images to load and DOM to settle
      const reinitCarousel = () => {
        const container = carouselRef.current;
        if (!container) return;
        
        // Log container dimensions
        const containerRect = container.getBoundingClientRect();
        console.log('[SideScrollMovieList] Container dimensions:', {
          width: containerRect.width,
          scrollWidth: container.scrollWidth,
          clientWidth: container.clientWidth
        });
        
        // Find the viewport (overflow-hidden div) and constrain it
        const viewport = container.querySelector('[class*="overflow-hidden"]') as HTMLElement;
        const contentWrapper = container.closest('.content-wrapper') as HTMLElement;
        
        if (viewport && contentWrapper) {
          const containerWidth = container.getBoundingClientRect().width;
          const wrapperRect = contentWrapper.getBoundingClientRect();
          const wrapperStyle = window.getComputedStyle(contentWrapper);
          const paddingLeft = parseFloat(wrapperStyle.paddingLeft) || 0;
          const paddingRight = parseFloat(wrapperStyle.paddingRight) || 0;
          const visibleWidth = wrapperRect.width - paddingLeft - paddingRight;
          
          const viewportRect = viewport.getBoundingClientRect();
          console.log('[SideScrollMovieList] Viewport dimensions:', {
            width: viewportRect.width,
            scrollWidth: viewport.scrollWidth,
            clientWidth: viewport.clientWidth,
            containerWidth: containerWidth,
            visibleWidth: visibleWidth,
            wrapperWidth: wrapperRect.width,
            padding: { left: paddingLeft, right: paddingRight }
          });
          
          // Force constrain viewport to visible width - use setProperty with important
          if (viewportRect.width > visibleWidth + 1 || viewportRect.width >= viewport.scrollWidth) {
            console.log('[SideScrollMovieList] Forcing viewport constraint from', viewportRect.width, 'to', visibleWidth);
            viewport.style.setProperty('width', `${visibleWidth}px`, 'important');
            viewport.style.setProperty('max-width', `${visibleWidth}px`, 'important');
            viewport.style.setProperty('min-width', `${visibleWidth}px`, 'important');
            viewport.style.setProperty('box-sizing', 'border-box', 'important');
          }
        }
        
        console.log('[SideScrollMovieList] Reinitializing carousel...');
        api.reInit();
        
        // Check scroll state after a brief delay
        setTimeout(() => {
          const canPrev = api.canScrollPrev();
          const canNext = api.canScrollNext();
          const containerNode = api.containerNode();
          console.log('[SideScrollMovieList] After reinit - canScrollPrev:', canPrev, 'canScrollNext:', canNext);
          if (containerNode) {
            console.log('[SideScrollMovieList] Container node dimensions:', {
              offsetWidth: containerNode.offsetWidth,
              scrollWidth: containerNode.scrollWidth,
              clientWidth: containerNode.clientWidth
            });
          }
          
          // If still false, try again after images load
          if (!canNext && items.length > 5) {
            console.log('[SideScrollMovieList] Scroll still false, waiting for images...');
            setTimeout(() => {
              api.reInit();
              console.log('[SideScrollMovieList] Second reinit - canScrollPrev:', api.canScrollPrev(), 'canScrollNext:', api.canScrollNext());
            }, 500);
          }
        }, 300);
      };
      
      // Wait for next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(reinitCarousel, 200);
        });
      });
    }
  }, [items, api]);

  return (
    <div className="SideScrollMovieList">
        
      {/* Header */}
      <div className="header">
        <div className="title-section">
          {icon && <span className="icon">{icon}</span>}
          <h2 className="title">{title}</h2>
        </div>
        {categoryPath && (
          <Link href={categoryPath} className="view-all-link">
            <span>View All</span>
            <ArrowRight size={18} />
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="content-wrapper">
        {loading ? (
          <div className="loading-container">
            <Spinner size="lg" color="primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-container">
            <p>No items to display</p>
          </div>
        ) : (
          <div className="carousel-container" ref={carouselRef}>
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full relative max-w-full"
            >
              <CarouselContent className="-ml-4 md:-ml-2">
                {items.map((item, index) => {
                  console.log('[SideScrollMovieList] Mapping item', index, ':', item);
                  return (
                  <CarouselItem
                    key={`${item.id}-${item.media_type || 'unknown'}`}
                    className="pl-4 md:pl-2 basis-[150px] sm:basis-[180px] md:basis-[200px] lg:basis-[220px] flex-shrink-0 flex-grow-0 min-w-[150px] sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px]"
                  >
                    <Card className="movie-card p-0 overflow-hidden cursor-pointer">
                        
                      <div className="relative h-full">
                        {/* Poster Image */}
                        {item.poster_path || item.posterUrl ? (
                          <img
                            src={item.posterUrl || `${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
                            alt={getMediaTitle(item)}
                            className="poster-image"
                            loading="lazy"
                            onLoad={() => {
                              // Trigger carousel reinit when images load
                              if (api && items.length > 0) {
                                console.log('[SideScrollMovieList] Image loaded, checking carousel state');
                                setTimeout(() => {
                                  api.reInit();
                                  console.log('[SideScrollMovieList] After image load - canScrollPrev:', api.canScrollPrev(), 'canScrollNext:', api.canScrollNext());
                                }, 50);
                              }
                            }}
                          />
                        ) : (
                          <div className="poster-placeholder">
                            <span>No Image</span>
                          </div>
                        )}
                        
                        {/* Media Type Badge */}
                        {item.media_type && (
                          <Chip
                            size="sm"
                            className="media-type-badge"
                            color={item.media_type === 'movie' ? 'primary' : 'secondary'}
                            variant="flat"
                          >
                            {item.media_type.toUpperCase()}
                          </Chip>
                        )}

                        {/* Rating Badge */}
                        {item.vote_average > 0 && (
                          <div className="rating-badge">
                            <span>⭐ {item.vote_average.toFixed(1)}</span>
                          </div>
                        )}
                        

                        {/* Title Overlay */}
                        <div className="movie-info-overlay">
                          <h3 className="movie-title" title={getMediaTitle(item)}>
                            {getMediaTitle(item)}
                          </h3>
                          {getMediaYear(item) && (
                            <p className="movie-year">{getMediaYear(item)}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default SideScrollMovieList;

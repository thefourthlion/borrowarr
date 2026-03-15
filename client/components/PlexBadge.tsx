"use client";

interface PlexBadgeProps {
  show: boolean;
  title?: string;
  className?: string;
}

/** Small orange P badge for bottom-left of media card when item exists in Plex */
export function PlexBadge({ show, title = "On Plex", className = "" }: PlexBadgeProps) {
  if (!show) return null;

  return (
    <div
      className={`absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1 z-10 px-1 sm:px-1.5 py-0.5 rounded bg-orange-500/95 text-white text-[9px] sm:text-[10px] font-bold uppercase backdrop-blur-sm ${className}`}
      title={title}
    >
      P
    </div>
  );
}

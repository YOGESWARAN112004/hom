import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  linkText: string | null;
  showOnHomepage: boolean;
}

export function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch announcements
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter(a => a.showOnHomepage),
  });

  // Auto-rotate announcements
  useEffect(() => {
    if (announcements.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length, isPaused]);

  if (isDismissed || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-gradient-to-r from-green-600 to-green-500 text-white';
      case 'new_arrival':
        return 'bg-gradient-to-r from-primary to-amber-500 text-primary-foreground';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  const nextAnnouncement = () => {
    setCurrentIndex((i) => (i + 1) % announcements.length);
  };

  const prevAnnouncement = () => {
    setCurrentIndex((i) => (i - 1 + announcements.length) % announcements.length);
  };

  return (
    <div
      className={`relative py-2 px-4 ${getTypeStyles(currentAnnouncement.type)}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container mx-auto flex items-center justify-center gap-4">
        {/* Navigation - Left */}
        {announcements.length > 1 && (
          <button
            onClick={prevAnnouncement}
            className="hidden sm:flex items-center justify-center w-6 h-6 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAnnouncement.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-2 text-center"
          >
            <span className="text-xs sm:text-sm font-medium tracking-wide">
              {currentAnnouncement.message}
            </span>
            {currentAnnouncement.linkUrl && (
              <a
                href={currentAnnouncement.linkUrl}
                className="inline-flex items-center gap-1 text-xs font-bold underline hover:no-underline"
              >
                {currentAnnouncement.linkText || 'Shop Now'}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation - Right */}
        {announcements.length > 1 && (
          <button
            onClick={nextAnnouncement}
            className="hidden sm:flex items-center justify-center w-6 h-6 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Dots indicator */}
        {announcements.length > 1 && (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
            {announcements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-current' : 'bg-current/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-white/10 p-1 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Floating notification badge (for cart updates, wishlist, etc.)
export function NotificationBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ${className}`}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}

// Low stock warning badge
export function LowStockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  if (stock > threshold) return null;

  if (stock === 0) {
    return (
      <span className="bg-destructive text-white text-xs font-bold px-2 py-1 rounded">
        Out of Stock
      </span>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded"
    >
      Only {stock} left!
    </motion.span>
  );
}


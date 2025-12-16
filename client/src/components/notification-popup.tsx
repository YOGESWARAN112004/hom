import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Tag, Gift, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  linkText: string | null;
  showAsPopup: boolean;
}

const POPUP_STORAGE_KEY = 'dismissed_popups';

export function NotificationPopup() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [activePopup, setActivePopup] = useState<Announcement | null>(null);

  // Load dismissed IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(POPUP_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only keep dismissals from last 24 hours
        const recent = parsed.filter((item: { id: string; time: number }) => 
          Date.now() - item.time < 24 * 60 * 60 * 1000
        );
        setDismissedIds(recent.map((item: { id: string }) => item.id));
      } catch {
        setDismissedIds([]);
      }
    }
  }, []);

  // Fetch popup announcements
  const { data: popups = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements/popups'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Show first non-dismissed popup
  useEffect(() => {
    const nextPopup = popups.find(p => !dismissedIds.includes(p.id));
    if (nextPopup && !activePopup) {
      // Delay popup to avoid interrupting initial page load
      const timer = setTimeout(() => {
        setActivePopup(nextPopup);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [popups, dismissedIds, activePopup]);

  const dismissPopup = (id: string) => {
    // Save to localStorage
    const stored = localStorage.getItem(POPUP_STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : [];
    const updated = [...current.filter((item: { id: string }) => item.id !== id), { id, time: Date.now() }];
    localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(updated));

    setDismissedIds([...dismissedIds, id]);
    setActivePopup(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <Tag className="h-6 w-6 text-green-500" />;
      case 'new_arrival':
        return <Gift className="h-6 w-6 text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Bell className="h-6 w-6 text-primary" />;
    }
  };

  const getBackgroundClass = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-500/30';
      case 'new_arrival':
        return 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-yellow-500/30';
      default:
        return 'bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-500/30';
    }
  };

  return (
    <AnimatePresence>
      {activePopup && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissPopup(activePopup.id)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div
              className={`relative max-w-md w-full rounded-2xl border p-6 shadow-2xl pointer-events-auto ${getBackgroundClass(activePopup.type)}`}
            >
              {/* Close button */}
              <button
                onClick={() => dismissPopup(activePopup.id)}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Content */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  {getIcon(activePopup.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-xl text-white mb-2">
                    {activePopup.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-4">
                    {activePopup.message}
                  </p>
                  {activePopup.linkUrl && (
                    <a href={activePopup.linkUrl}>
                      <Button
                        className="bg-white text-black hover:bg-white/90"
                        onClick={() => dismissPopup(activePopup.id)}
                      >
                        {activePopup.linkText || 'Learn More'}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Toast-style notification for smaller updates
export function NotificationToast({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}: {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}


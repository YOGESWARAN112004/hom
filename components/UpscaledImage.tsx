import { useState, useEffect, useRef } from 'react';
import { upscaleImageInBrowser } from '@/lib/imageUtils';

interface UpscaledImageProps {
  src: string;
  alt: string;
  className?: string;
  scale?: number;
  fallbackScale?: number;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  [key: string]: any; // Allow other img props
}

/**
 * UpscaledImage component that upscales images for better quality display
 * Uses Canvas API to upscale images client-side for sharper display
 */
export function UpscaledImage({
  src,
  alt,
  className = '',
  scale = 2,
  fallbackScale = 1.5,
  onError,
  ...props
}: UpscaledImageProps) {
  const [upscaledSrc, setUpscaledSrc] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src || hasError) return;

    // Only upscale if image is loaded and not too large
    const img = new Image();
    img.onload = async () => {
      // Only upscale if original image is smaller than 2000px
      if (img.width < 2000 && img.height < 2000) {
        setIsUpscaling(true);
        const upscaled = await upscaleImageInBrowser(src, scale);
        if (upscaled) {
          setUpscaledSrc(upscaled);
        }
        setIsUpscaling(false);
      }
    };
    img.onerror = () => setHasError(true);
    img.src = src;
  }, [src, scale, hasError]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    if (onError) onError(e);
  };

  // Use upscaled image if available, otherwise use original with CSS upscaling
  const displaySrc = upscaledSrc || src;
  const imageScale = upscaledSrc ? 1 : fallbackScale; // Don't scale if already upscaled

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        className={className}
        style={{
          imageRendering: 'high-quality' as const,
          WebkitImageRendering: 'high-quality' as const,
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          ...props.style,
        }}
        onError={handleError}
        {...props}
      />
      {isUpscaling && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 z-10">
          <div className="animate-pulse text-xs text-muted-foreground">Enhancing quality...</div>
        </div>
      )}
    </div>
  );
}


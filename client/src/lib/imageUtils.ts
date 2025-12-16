/**
 * Utility functions for handling high-resolution product images
 */

/**
 * Generates a srcSet string for responsive images
 * This ensures browsers can load the appropriate resolution based on viewport
 * 
 * @param baseUrl - The base image URL
 * @param options - Configuration options
 * @returns srcSet string for the img tag
 */
export function generateImageSrcSet(
  baseUrl: string | null | undefined,
  options: {
    widths?: number[];
    maxWidth?: number;
  } = {}
): string {
  if (!baseUrl || baseUrl.trim() === '') return '';

  // Validate URL format
  try {
    // Check if it's a valid URL or a relative path
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://') || baseUrl.startsWith('/')) {
      // Valid URL format
    } else {
      // Invalid URL, return empty to prevent broken images
      return '';
    }
  } catch {
    return '';
  }

  const { widths = [400, 800, 1200, 1600, 2000], maxWidth } = options;

  // For S3/CloudFront URLs, we can append query params if needed
  // For now, we'll use the same URL for all sizes (browser will handle scaling)
  // If you have an image transformation service, you can modify this
  const srcSetEntries = widths
    .filter(width => !maxWidth || width <= maxWidth)
    .map(width => {
      // If using CloudFront with Lambda@Edge or similar, you could add width params
      // For now, return the original URL - browsers will use it at full resolution
      return `${baseUrl} ${width}w`;
    })
    .filter(entry => entry.trim() !== ''); // Filter out any empty entries

  return srcSetEntries.length > 0 ? srcSetEntries.join(', ') : '';
}

/**
 * Generates sizes attribute for responsive images
 * 
 * @param breakpoints - Breakpoint configuration
 * @returns sizes string for the img tag
 */
export function generateImageSizes(
  breakpoints: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    large?: string;
  } = {}
): string {
  const {
    mobile = '100vw',
    tablet = '50vw',
    desktop = '33vw',
    large = '25vw',
  } = breakpoints;

  return `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, (max-width: 1280px) ${desktop}, ${large}`;
}

/**
 * Gets the optimal image URL for a given width
 * Useful for when you have an image transformation service
 * 
 * @param baseUrl - The base image URL
 * @param width - Desired width
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  baseUrl: string | null | undefined,
  width?: number
): string {
  if (!baseUrl) return '';

  // If you're using CloudFront with Lambda@Edge, ImageKit, Cloudinary, etc.
  // you can add transformation parameters here
  // For now, return the original URL to ensure full resolution
  if (width) {
    // Example for future image transformation service:
    // return `${baseUrl}?w=${width}&q=95`;
    return baseUrl;
  }

  return baseUrl;
}

/**
 * Ensures image is displayed at full resolution
 * Adds attributes to prevent browser compression
 */
export function getHighResImageProps(url: string | null | undefined) {
  if (!url) {
    // Return a placeholder or empty props that won't break the image tag
    return { 
      src: '/placeholder.svg',
      srcSet: '',
      sizes: '',
    };
  }

  const srcSet = generateImageSrcSet(url, { maxWidth: 3000 });
  
  return {
    src: url, // Always provide src as fallback
    ...(srcSet ? { srcSet } : {}), // Only add srcSet if it's not empty
    sizes: generateImageSizes({
      mobile: '100vw',
      tablet: '100vw',
      desktop: '100vw',
      large: '100vw',
    }),
  };
}

/**
 * Gets CSS styles for upscaled image rendering
 * Uses CSS properties to improve image quality when scaled up
 */
export function getUpscaledImageStyles(scale: number = 1.5): React.CSSProperties {
  return {
    imageRendering: 'high-quality' as const,
    // Use crisp-edges for pixel art, auto for photos
    // 'crisp-edges' | 'pixelated' | 'auto' | 'smooth'
    imageRendering: 'auto' as const,
    // Force hardware acceleration for better quality
    transform: `scale(${scale})`,
    transformOrigin: 'center',
    // Use will-change for better rendering performance
    willChange: 'transform',
    // Backface visibility for smoother rendering
    backfaceVisibility: 'hidden',
    // Webkit specific optimizations
    WebkitBackfaceVisibility: 'hidden',
    WebkitTransform: `scale(${scale})`,
  };
}

/**
 * Creates an upscaled image URL using Canvas API (client-side)
 * This upscales the image in the browser for better quality display
 */
export async function upscaleImageInBrowser(
  imageUrl: string,
  scale: number = 2
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }
        
        // Set canvas size to upscaled dimensions
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image upscaled
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const upscaledDataUrl = canvas.toDataURL('image/png', 1.0);
        resolve(upscaledDataUrl);
      } catch (error) {
        console.error('Error upscaling image:', error);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    img.src = imageUrl;
  });
}


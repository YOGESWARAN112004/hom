import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'houses-of-medusa';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL; // Optional: If using CloudFront

// Generate unique filename
function generateUniqueFilename(originalFilename: string): string {
  const ext = originalFilename.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomString}.${ext}`;
}

// Get public URL for an object
function getPublicUrl(key: string): string {
  if (CLOUDFRONT_URL) {
    // Ensure CloudFront URL doesn't have trailing slash
    const baseUrl = CLOUDFRONT_URL.endsWith('/') ? CLOUDFRONT_URL.slice(0, -1) : CLOUDFRONT_URL;
    // Ensure key doesn't have leading slash
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    return `${baseUrl}/${cleanKey}`;
  }
  
  // For public S3 buckets, use virtual-hosted-style URL
  // Format: https://{bucket}.s3.{region}.amazonaws.com/{key}
  const region = process.env.AWS_REGION || 'ap-south-1';
  // Ensure key doesn't have leading slash
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${cleanKey}`;
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Generated S3 URL:', { key, cleanKey, url, bucket: BUCKET_NAME, region });
  }
  
  return url;
}

// ============================================
// PRESIGNED UPLOAD URL
// ============================================

interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string = 'products'
): Promise<PresignedUrlResult> {
  const key = `${folder}/${generateUniqueFilename(filename)}`;

  // Note: ACL removed - bucket uses "Bucket owner enforced" object ownership
  // Public access should be configured via bucket policy instead
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

  return {
    uploadUrl,
    publicUrl: getPublicUrl(key),
    key,
  };
}

// ============================================
// DIRECT UPLOAD (from server)
// ============================================

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = 'products'
): Promise<{ url: string; key: string }> {
  try {
    const key = `${folder}/${generateUniqueFilename(filename)}`;

    // Note: ACL removed - bucket uses "Bucket owner enforced" object ownership
    // Public access should be configured via bucket policy instead
    // Images are uploaded at FULL QUALITY - no compression
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Preserve image quality - no compression
      CacheControl: 'public, max-age=31536000, immutable', // Cache for 1 year
      // Metadata to indicate high quality
      Metadata: {
        'quality': 'high',
        'original-filename': filename,
      },
    });

    await s3Client.send(command);
    
    const publicUrl = getPublicUrl(key);
    console.log(`Successfully uploaded file to S3: ${key} -> ${publicUrl}`);

    return {
      url: publicUrl,
      key,
    };
  } catch (error: any) {
    console.error('S3 upload error details:', {
      error: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode,
      bucket: BUCKET_NAME,
      filename,
    });
    throw error;
  }
}

// ============================================
// DELETE FILE
// ============================================

export async function deleteFile(keyOrUrl: string): Promise<boolean> {
  try {
    // Extract key from URL if full URL is provided
    let key = keyOrUrl;
    if (keyOrUrl.startsWith('http')) {
      try {
        const url = new URL(keyOrUrl);
        // Handle CloudFront URLs
        if (CLOUDFRONT_URL && keyOrUrl.includes(CLOUDFRONT_URL)) {
          key = url.pathname.substring(1); // Remove leading slash
        } 
        // Handle S3 URLs (virtual-hosted-style: bucket.s3.region.amazonaws.com)
        else if (keyOrUrl.includes('.s3.') && keyOrUrl.includes('.amazonaws.com')) {
          key = url.pathname.substring(1); // Remove leading slash
        }
        // Handle path-style S3 URLs (s3.region.amazonaws.com/bucket/key)
        else if (keyOrUrl.includes('s3.') && keyOrUrl.includes('.amazonaws.com')) {
          const pathParts = url.pathname.split('/').filter(Boolean);
          // Skip bucket name (first part) and get the rest as key
          if (pathParts.length > 1) {
            key = pathParts.slice(1).join('/');
          } else {
            key = url.pathname.substring(1);
          }
        } else {
          // Fallback: just use pathname
          key = url.pathname.substring(1);
        }
      } catch (urlError) {
        console.error('Error parsing URL for deletion:', urlError);
        return false;
      }
    }
    
    // Ensure key doesn't have leading/trailing slashes
    key = key.replace(/^\/+|\/+$/g, '');

    if (!key) {
      console.error('Invalid key extracted from URL:', keyOrUrl);
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Successfully deleted S3 file: ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return false;
  }
}

// ============================================
// GET SIGNED DOWNLOAD URL (for private files)
// ============================================

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// ============================================
// VALIDATION HELPERS
// ============================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for high-quality images

export function validateImageFile(contentType: string, fileSize: number): { valid: boolean; message?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return {
      valid: false,
      message: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}

// ============================================
// S3 AVAILABILITY CHECK
// ============================================

export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

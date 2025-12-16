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
    return `${CLOUDFRONT_URL}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
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

  return {
    url: getPublicUrl(key),
    key,
  };
}

// ============================================
// DELETE FILE
// ============================================

export async function deleteFile(keyOrUrl: string): Promise<boolean> {
  try {
    // Extract key from URL if full URL is provided
    let key = keyOrUrl;
    if (keyOrUrl.startsWith('http')) {
      const url = new URL(keyOrUrl);
      key = url.pathname.substring(1); // Remove leading slash
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
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


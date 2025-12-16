
# Vercel Deployment Setup

To make sure your **S3 Image Uploads**, **Database**, and **Admin Features** work in production, you must set these Environment Variables in your Vercel Project Settings.

## 1. Database Connection
- **DATABASE_URL**: `postgresql://...` (Your Neon/Postgres Connection String)

## 2. Admin & Security
- **JWT_SECRET**: (Generate a random string, e.g., using `openssl rand -hex 32`)

## 3. Storage (AWS S3)
*Required for product image uploads to work in production*

- **AWS_REGION**: `ap-south-1` (or your bucket region)
- **AWS_ACCESS_KEY_ID**: `AKIA...` (Your AWS Access Key)
- **AWS_SECRET_ACCESS_KEY**: `...` (Your AWS Secret Key)
- **AWS_S3_BUCKET**: `houses-of-medusa` (Your Bucket Name)
- **CLOUDFRONT_URL**: (Optional) e.g., `https://d123.cloudfront.net` (If you use CloudFront)

## 4. Troubleshooting
- If images upload but disappear later, you are likely falling back to "Local Storage" because AWS vars are missing.
- If you get "403 Forbidden", ensure you ran `make-admin.ts` and re-logged in.
- If you get "500 Error", ensure you ran `npm run db:push`.

import type { Express } from "express";
import express from "express";
import type { Server } from "http";
import { storage } from "../lib/storage";
import { setupAuth, isAuthenticated, optionalAuth } from "./replitAuth";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendOtp,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from "./auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendCartNotificationEmail,
  sendExclusiveDiscountEmail,
} from "./email";
import {
  insertProductSchema,
  insertAffiliateSchema,
  insertAddressSchema,
  insertProductImageSchema,
  insertProductVariantSchema,
  insertBrandSchema,
  insertBlogSchema,
} from "@shared/schema";
import { z } from "zod";
import {
  getPresignedUploadUrl,
  validateImageFile,
  isS3Configured,
  uploadFile,
} from "./s3";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  handlePaymentSuccess,
  handlePaymentFailure,
  verifyWebhookSignature,
  processWebhookEvent,
  isRazorpayConfigured,
  getRazorpayKeyId,
} from "./razorpay";

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Setup session auth
  await setupAuth(app);

  // ============================================
  // AUTH ROUTES
  // ============================================

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await registerUser(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        data.phone
      );

      if (result.success && result.user) {
        // Send verification email
        const otp = await storage.createOtp(data.email, Math.floor(100000 + Math.random() * 900000).toString(), 'email_verification', result.user.id);
        await sendVerificationEmail(data.email, otp.code, data.firstName);
      }

      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: 'Invalid input', errors: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await loginUser(data.email, data.password);

      if (result.success && result.user) {
        // Set session
        (req as any).session.userId = result.user.id;
        (req as any).session.user = {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        };
      }

      if (result.requiresVerification) {
        // Send new OTP
        const user = await storage.getUserByEmail(data.email);
        if (user) {
          const otp = await storage.createOtp(data.email, Math.floor(100000 + Math.random() * 900000).toString(), 'email_verification', user.id);
          await sendVerificationEmail(data.email, otp.code, user.firstName || undefined);
        }
      }

      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: 'Invalid input', errors: error.errors });
      }
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Verify email with OTP
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const data = verifyOtpSchema.parse(req.body);
      const result = await verifyEmail(data.email, data.code);

      if (result.success && result.user) {
        // Set session
        (req as any).session.userId = result.user.id;
        (req as any).session.user = {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        };

        // Send welcome email
        await sendWelcomeEmail(result.user.email!, result.user.firstName || undefined);
      }

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: 'Invalid input', errors: error.errors });
      }
      console.error('OTP verification error:', error);
      res.status(500).json({ success: false, message: 'Verification failed' });
    }
  });

  // Resend OTP
  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const result = await resendOtp(email);

      if (result.success) {
        const user = await storage.getUserByEmail(email);
        if (user) {
          const otp = await storage.createOtp(email, Math.floor(100000 + Math.random() * 900000).toString(), 'email_verification', user.id);
          await sendVerificationEmail(email, otp.code, user.firstName || undefined);
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
  });

  // Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const result = await requestPasswordReset(email);

      if (result.success && result.token) {
        const user = await storage.getUserByEmail(email);
        if (user) {
          await sendPasswordResetEmail(email, result.token, user.firstName || undefined);
        }
      }

      res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Failed to process request' });
    }
  });

  // Reset password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and password are required' });
      }

      const result = await resetPassword(token, password);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  });

  // Change password (authenticated)
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new password are required' });
      }

      const result = await changePassword(userId, currentPassword, newPassword);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Don't send password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user profile
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const { firstName, lastName, phone, profileImageUrl } = req.body;

      const user = await storage.updateUser(userId, {
        firstName,
        lastName,
        phone,
        profileImageUrl,
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // ============================================
  // ADDRESS ROUTES
  // ============================================

  // Get user addresses
  app.get('/api/addresses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const addresses = await storage.getAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      res.status(500).json({ message: 'Failed to fetch addresses' });
    }
  });

  // Create address
  app.post('/api/addresses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const addressData = insertAddressSchema.parse({ ...req.body, userId });
      const address = await storage.createAddress(addressData);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid address data', errors: error.errors });
      }
      console.error('Error creating address:', error);
      res.status(500).json({ message: 'Failed to create address' });
    }
  });

  // Update address
  app.patch('/api/addresses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const address = await storage.getAddress(req.params.id);

      if (!address || address.userId !== userId) {
        return res.status(404).json({ message: 'Address not found' });
      }

      const updated = await storage.updateAddress(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ message: 'Failed to update address' });
    }
  });

  // Delete address
  app.delete('/api/addresses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const address = await storage.getAddress(req.params.id);

      if (!address || address.userId !== userId) {
        return res.status(404).json({ message: 'Address not found' });
      }

      await storage.deleteAddress(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({ message: 'Failed to delete address' });
    }
  });

  // Set default address
  app.post('/api/addresses/:id/default', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const address = await storage.getAddress(req.params.id);

      if (!address || address.userId !== userId) {
        return res.status(404).json({ message: 'Address not found' });
      }

      await storage.setDefaultAddress(userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting default address:', error);
      res.status(500).json({ message: 'Failed to set default address' });
    }
  });

  // ============================================
  // BRAND ROUTES
  // ============================================

  // Get all brands
  app.get('/api/brands', async (_req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      console.error('Error fetching brands:', error);
      res.status(500).json({ message: 'Failed to fetch brands' });
    }
  });

  // Create brand (admin only)
  app.post('/api/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const brandData = insertBrandSchema.parse(req.body);

      // Check if brand already exists
      const existing = await storage.getBrandByName(brandData.name);
      if (existing) {
        return res.status(400).json({ message: 'Brand already exists' });
      }

      const brand = await storage.createBrand(brandData);
      res.status(201).json(brand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid brand data', errors: error.errors });
      }
      console.error('Error creating brand:', error);
      res.status(500).json({ message: 'Failed to create brand' });
    }
  });

  // Update brand (admin only)
  app.patch('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const brand = await storage.updateBrand(req.params.id, req.body);
      if (!brand) {
        return res.status(404).json({ message: 'Brand not found' });
      }
      res.json(brand);
    } catch (error) {
      console.error('Error updating brand:', error);
      res.status(500).json({ message: 'Failed to update brand' });
    }
  });

  // Delete brand (admin only)
  app.delete('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      await storage.deleteBrand(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting brand:', error);
      res.status(500).json({ message: 'Failed to delete brand' });
    }
  });

  // ============================================
  // BLOG ROUTES
  // ============================================

  // Get all blogs (published only for public, all for admin)
  app.get('/api/blogs', async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      const publishedOnly = user?.role !== 'admin';

      const blogs = await storage.getBlogs(publishedOnly);
      res.json(blogs);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      res.status(500).json({ message: 'Failed to fetch blogs' });
    }
  });

  // Get single blog by ID or slug
  app.get('/api/blogs/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      // Try to get by ID first, then by slug
      let blog = await storage.getBlog(id);
      if (!blog) {
        blog = await storage.getBlogBySlug(id);
      }

      if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
      }

      // Increment views for published blogs
      if (blog.isPublished) {
        await storage.incrementBlogViews(blog.id);
      }

      res.json(blog);
    } catch (error) {
      console.error('Error fetching blog:', error);
      res.status(500).json({ message: 'Failed to fetch blog' });
    }
  });

  // Create blog (admin only)
  app.post('/api/blogs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const blogData = insertBlogSchema.parse({
        ...req.body,
        authorId: userId,
        publishedAt: req.body.isPublished ? new Date() : null,
      });

      const blog = await storage.createBlog(blogData);
      res.status(201).json(blog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid blog data', errors: error.errors });
      }
      console.error('Error creating blog:', error);
      res.status(500).json({ message: 'Failed to create blog' });
    }
  });

  // Update blog (admin only)
  app.patch('/api/blogs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const updateData: any = { ...req.body };

      // If publishing for the first time, set publishedAt
      if (updateData.isPublished && !updateData.publishedAt) {
        const existingBlog = await storage.getBlog(req.params.id);
        if (existingBlog && !existingBlog.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      const blog = await storage.updateBlog(req.params.id, updateData);
      if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
      }
      res.json(blog);
    } catch (error) {
      console.error('Error updating blog:', error);
      res.status(500).json({ message: 'Failed to update blog' });
    }
  });

  // Delete blog (admin only)
  app.delete('/api/blogs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      await storage.deleteBlog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting blog:', error);
      res.status(500).json({ message: 'Failed to delete blog' });
    }
  });

  // ============================================
  // PRODUCT ROUTES
  // ============================================

  // Get all products with filters
  app.get('/api/products', async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        subCategory: req.query.subCategory as string,
        brand: req.query.brand as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        search: req.query.search as string,
        isActive: true,
        isFeatured: req.query.featured === 'true' ? true : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const products = await storage.getProducts(filters);

      // Helper to convert S3 URL to proxy URL (never expires)
      const getProxyImageUrl = (url: string | null): string | null => {
        if (!url) return null;
        // Check if it's an S3 URL
        if (url.includes('.s3.') && url.includes('amazonaws.com')) {
          try {
            // Extract the key from the URL
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1); // Remove leading slash
            // Use proxy endpoint that generates fresh signed URLs on-demand
            return `/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        // Also check for CloudFront URLs
        if (url.includes('cloudfront.net') || url.includes('s3.amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        return url;
      };

      // Fetch images for each product
      const productsWithImages = await Promise.all(products.map(async (product) => {
        const images = await storage.getProductImages(product.id);
        const variants = product.hasVariants ? await storage.getProductVariants(product.id) : [];

        // Convert S3 URLs to proxy URLs
        const proxyImages = images.map((img) => ({
          ...img,
          url: getProxyImageUrl(img.url) || img.url,
        }));

        return {
          ...product,
          images: proxyImages,
          variants,
          // For backwards compatibility
          imageUrl: proxyImages.find(img => img.isPrimary)?.url || proxyImages[0]?.url || null,
        };
      }));

      res.json(productsWithImages);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // Get single product
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const images = await storage.getProductImages(product.id);
      const variants = await storage.getProductVariants(product.id);

      // Helper to convert S3 URL to proxy URL (never expires)
      const getProxyImageUrl = (url: string | null): string | null => {
        if (!url) return null;
        if (url.includes('.s3.') && url.includes('amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        if (url.includes('cloudfront.net') || url.includes('s3.amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        return url;
      };

      const proxyImages = images.map((img) => ({
        ...img,
        url: getProxyImageUrl(img.url) || img.url,
      }));

      res.json({
        ...product,
        images: proxyImages,
        variants,
        imageUrl: proxyImages.find(img => img.isPrimary)?.url || proxyImages[0]?.url || null,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });

  // Get product by slug
  app.get('/api/products/slug/:slug', async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const images = await storage.getProductImages(product.id);
      const variants = await storage.getProductVariants(product.id);

      // Helper to convert S3 URL to proxy URL (never expires)
      const getProxyImageUrl = (url: string | null): string | null => {
        if (!url) return null;
        if (url.includes('.s3.') && url.includes('amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        if (url.includes('cloudfront.net') || url.includes('s3.amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        return url;
      };

      const proxyImages = images.map((img) => ({
        ...img,
        url: getProxyImageUrl(img.url) || img.url,
      }));

      res.json({
        ...product,
        images: proxyImages,
        variants,
        imageUrl: proxyImages.find(img => img.isPrimary)?.url || proxyImages[0]?.url || null,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });

  // Search products
  app.get('/api/products/search/:query', async (req, res) => {
    try {
      const products = await storage.searchProducts(req.params.query);

      const productsWithImages = await Promise.all(products.map(async (product) => {
        const images = await storage.getProductImages(product.id);
        return {
          ...product,
          images,
          imageUrl: images.find(img => img.isPrimary)?.url || images[0]?.url || null,
        };
      }));

      res.json(productsWithImages);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ message: 'Failed to search products' });
    }
  });

  // Get products by category
  app.get('/api/products/category/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const { subCategory } = req.query;
      const products = await storage.getProductsByCategory(category, subCategory as string | undefined);

      const productsWithImages = await Promise.all(products.map(async (product) => {
        const images = await storage.getProductImages(product.id);
        return {
          ...product,
          images,
          imageUrl: images.find(img => img.isPrimary)?.url || images[0]?.url || null,
        };
      }));

      res.json(productsWithImages);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // Get products by brand
  app.get('/api/products/brand/:brand', async (req, res) => {
    try {
      const products = await storage.getProductsByBrand(req.params.brand);

      const productsWithImages = await Promise.all(products.map(async (product) => {
        const images = await storage.getProductImages(product.id);
        return {
          ...product,
          images,
          imageUrl: images.find(img => img.isPrimary)?.url || images[0]?.url || null,
        };
      }));

      res.json(productsWithImages);
    } catch (error) {
      console.error('Error fetching products by brand:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // Admin: Create product
  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid product data', errors: error.errors });
      }
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Failed to create product' });
    }
  });

  // Admin: Update product
  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Failed to update product' });
    }
  });

  // Admin: Delete product
  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Failed to delete product' });
    }
  });

  // ============================================
  // PRODUCT IMAGES ROUTES
  // ============================================

  // Add product image
  app.post('/api/products/:productId/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const imageData = insertProductImageSchema.parse({
        ...req.body,
        productId: req.params.productId,
      });
      const image = await storage.addProductImage(imageData);
      res.status(201).json(image);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid image data', errors: error.errors });
      }
      console.error('Error adding product image:', error);
      res.status(500).json({ message: 'Failed to add image' });
    }
  });

  // Delete product image
  app.delete('/api/products/:productId/images/:imageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      await storage.deleteProductImage(req.params.imageId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product image:', error);
      res.status(500).json({ message: 'Failed to delete image' });
    }
  });

  // Set primary image
  app.post('/api/products/:productId/images/:imageId/primary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      await storage.setPrimaryImage(req.params.productId, req.params.imageId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting primary image:', error);
      res.status(500).json({ message: 'Failed to set primary image' });
    }
  });

  // ============================================
  // PRODUCT VARIANTS ROUTES
  // ============================================

  // Get product variants
  app.get('/api/products/:productId/variants', async (req, res) => {
    try {
      const variants = await storage.getProductVariants(req.params.productId);
      res.json(variants);
    } catch (error) {
      console.error('Error fetching variants:', error);
      res.status(500).json({ message: 'Failed to fetch variants' });
    }
  });

  // Create variant
  app.post('/api/products/:productId/variants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const variantData = insertProductVariantSchema.parse({
        ...req.body,
        productId: req.params.productId,
      });
      const variant = await storage.createVariant(variantData);
      res.status(201).json(variant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid variant data', errors: error.errors });
      }
      console.error('Error creating variant:', error);
      res.status(500).json({ message: 'Failed to create variant' });
    }
  });

  // Update variant
  app.patch('/api/products/:productId/variants/:variantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const variant = await storage.updateVariant(req.params.variantId, req.body);
      if (!variant) {
        return res.status(404).json({ message: 'Variant not found' });
      }
      res.json(variant);
    } catch (error) {
      console.error('Error updating variant:', error);
      res.status(500).json({ message: 'Failed to update variant' });
    }
  });

  // Delete variant
  app.delete('/api/products/:productId/variants/:variantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      await storage.deleteVariant(req.params.variantId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting variant:', error);
      res.status(500).json({ message: 'Failed to delete variant' });
    }
  });

  // Update variant stock
  app.patch('/api/products/:productId/variants/:variantId/stock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { stock } = req.body;
      if (typeof stock !== 'number') {
        return res.status(400).json({ message: 'Invalid stock value' });
      }

      await storage.updateVariantStock(req.params.variantId, stock);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({ message: 'Failed to update stock' });
    }
  });

  // ============================================
  // CART ROUTES
  // ============================================

  // Get cart
  app.get('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const items = await storage.getCartItems(userId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ message: 'Failed to fetch cart' });
    }
  });

  // Add to cart
  app.post('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const { productId, variantId, quantity } = req.body;

      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }

      const item = await storage.addToCart({
        userId,
        productId,
        variantId: variantId || null,
        quantity: quantity || 1,
      });

      // Send cart notification email to admin (async, don't wait)
      const user = await storage.getUser(userId);
      const product = await storage.getProduct(productId);
      if (user && product) {
        sendCartNotificationEmail(user, product, quantity || 1).catch(err => {
          console.error('Failed to send cart notification email:', err);
        });
      }

      res.status(201).json(item);
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add to cart' });
    }
  });

  // Update cart item quantity
  app.patch('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { quantity } = req.body;
      if (typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      await storage.updateCartItemQuantity(req.params.id, quantity);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ message: 'Failed to update cart item' });
    }
  });

  // Remove from cart
  app.delete('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ message: 'Failed to remove from cart' });
    }
  });

  // Clear cart
  app.delete('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Failed to clear cart' });
    }
  });

  // ============================================
  // WISHLIST ROUTES
  // ============================================

  // Get wishlist
  app.get('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const items = await storage.getWishlistItems(userId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
  });

  // Add to wishlist
  app.post('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }

      const item = await storage.addToWishlist(userId, productId);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      res.status(500).json({ message: 'Failed to add to wishlist' });
    }
  });

  // Remove from wishlist
  app.delete('/api/wishlist/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeFromWishlist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({ message: 'Failed to remove from wishlist' });
    }
  });

  // Check if in wishlist
  app.get('/api/wishlist/check/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const isInWishlist = await storage.isInWishlist(userId, req.params.productId);
      res.json({ isInWishlist });
    } catch (error) {
      console.error('Error checking wishlist:', error);
      res.status(500).json({ message: 'Failed to check wishlist' });
    }
  });

  // ============================================
  // ORDER ROUTES
  // ============================================

  // Create order
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const { items, shippingAddressId, affiliateCode, customerNotes } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item' });
      }

      // Get shipping address
      const address = await storage.getAddress(shippingAddressId);
      if (!address || address.userId !== userId) {
        return res.status(400).json({ message: 'Invalid shipping address' });
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product not found: ${item.productId}` });
        }

        let unitPrice = parseFloat(product.basePrice);
        let variantSize = null;
        let variantColor = null;
        let productSku = product.sku;
        let productImageUrl = null;

        // Get primary image
        const images = await storage.getProductImages(product.id);
        productImageUrl = images.find(img => img.isPrimary)?.url || images[0]?.url;

        if (item.variantId) {
          const variant = await storage.getVariant(item.variantId);
          if (!variant) {
            return res.status(400).json({ message: `Variant not found: ${item.variantId}` });
          }

          if (variant.stock < item.quantity) {
            return res.status(400).json({ message: `Insufficient stock for ${product.name} (${variant.size}/${variant.color})` });
          }

          unitPrice += parseFloat(variant.priceModifier || '0');
          variantSize = variant.size;
          variantColor = variant.color;
          productSku = variant.sku;
          if (variant.imageUrl) {
            productImageUrl = variant.imageUrl;
          }
        } else if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        }

        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          productId: product.id,
          variantId: item.variantId || null,
          productName: product.name,
          productSku,
          variantSize,
          variantColor,
          productImageUrl,
          quantity: item.quantity,
          unitPrice: unitPrice.toString(),
          totalPrice: totalPrice.toString(),
        });
      }

      // Get affiliate if code provided
      let affiliateId = null;
      if (affiliateCode) {
        const affiliate = await storage.getAffiliateByCode(affiliateCode);
        if (affiliate) {
          affiliateId = affiliate.id;
        }
      }

      const shippingCost = subtotal >= 10000 ? 0 : 500; // Free shipping over 10000
      const totalAmount = subtotal + shippingCost;

      const order = await storage.createOrder(
        {
          userId,
          affiliateId,
          subtotal: subtotal.toString(),
          shippingCost: shippingCost.toString(),
          totalAmount: totalAmount.toString(),
          status: 'pending',
          paymentMethod: 'razorpay',
          shippingAddressId,
          shippingAddress: address,
          customerNotes,
          orderNumber: '', // Will be generated
        },
        orderItems as any
      );

      // Clear cart after successful order
      await storage.clearCart(userId);

      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  // Get user orders
  app.get('/api/orders/my-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const orders = await storage.getUserOrders(userId);

      // Fetch items for each order
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await storage.getOrderItems(order.id);
        return { ...order, items };
      }));

      res.json(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Get single order
  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      // Allow user to see their own orders, or admin to see all
      if (order.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  // Admin: Get all orders
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const orders = await storage.getAllOrders({
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      });

      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Admin: Update order status
  app.patch('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { status } = req.body;
      await storage.updateOrderStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  // ============================================
  // AFFILIATE ROUTES
  // ============================================

  // Apply for affiliate account (creates pending application)
  app.post('/api/affiliates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;

      // Check if user already has an affiliate account
      const existing = await storage.getAffiliateByUserId(userId);
      if (existing) {
        return res.status(400).json({ message: 'Affiliate application already exists', affiliate: existing });
      }

      // Generate unique affiliate code
      const user = await storage.getUser(userId);
      const codeBase = (user?.firstName || 'AFF').substring(0, 3).toUpperCase();
      const codeRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${codeBase}${codeRandom}`;

      const affiliateData = insertAffiliateSchema.parse({
        userId,
        code,
        websiteUrl: req.body.websiteUrl,
        socialMedia: req.body.socialMedia,
        promotionMethod: req.body.promotionMethod,
        status: 'pending', // Start as pending, requires admin approval
        isActive: false, // Not active until approved
      });

      const affiliate = await storage.createAffiliate(affiliateData);

      // Don't update user role yet - only after approval
      res.status(201).json({
        success: true,
        message: 'Affiliate application submitted successfully. Pending admin approval.',
        affiliate,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid affiliate data', errors: error.errors });
      }
      console.error('Error creating affiliate:', error);
      res.status(500).json({ message: 'Failed to submit affiliate application' });
    }
  });

  // Get my affiliate stats
  app.get('/api/affiliates/my-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const affiliate = await storage.getAffiliateByUserId(userId);

      if (!affiliate) {
        return res.status(404).json({ message: 'Affiliate account not found' });
      }

      const allStats = await storage.getAffiliateStats();
      const myStats = allStats.find(s => s.id === affiliate.id);

      res.json({
        ...affiliate,
        stats: myStats || { traffic: 0, sales: 0, conversionRate: 0, revenue: '0' }
      });
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
      res.status(500).json({ message: 'Failed to fetch affiliate stats' });
    }
  });

  // Admin: Get all affiliate stats
  app.get('/api/affiliates/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const stats = await storage.getAffiliateStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
      res.status(500).json({ message: 'Failed to fetch affiliate stats' });
    }
  });

  // Track affiliate click (public endpoint)
  app.post('/api/affiliates/track-click', async (req, res) => {
    try {
      const { code, landingPage } = req.body;
      const affiliate = await storage.getAffiliateByCode(code);

      if (!affiliate) {
        return res.status(404).json({ message: 'Invalid affiliate code' });
      }

      const ipAddress = req.ip || (req.socket?.remoteAddress) || '';
      const userAgent = req.get('user-agent') || '';
      const referrerUrl = req.get('referer');

      await storage.trackAffiliateClick(affiliate.id, ipAddress, userAgent, referrerUrl, landingPage);

      res.json({ success: true, affiliateId: affiliate.id });
    } catch (error) {
      console.error('Error tracking click:', error);
      res.status(500).json({ message: 'Failed to track click' });
    }
  });

  // Admin: Get pending affiliates
  app.get('/api/affiliates/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const pending = await storage.getPendingAffiliates();

      // Enrich with user data
      const enriched = await Promise.all(pending.map(async (affiliate) => {
        const affUser = await storage.getUser(affiliate.userId);
        return {
          ...affiliate,
          user: affUser ? {
            id: affUser.id,
            email: affUser.email,
            firstName: affUser.firstName,
            lastName: affUser.lastName,
          } : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error('Error fetching pending affiliates:', error);
      res.status(500).json({ message: 'Failed to fetch pending affiliates' });
    }
  });

  // Admin: Get all affiliates
  app.get('/api/affiliates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const allAffiliates = await storage.getAllAffiliates();

      // Enrich with user data
      const enriched = await Promise.all(allAffiliates.map(async (affiliate) => {
        const affUser = await storage.getUser(affiliate.userId);
        return {
          ...affiliate,
          user: affUser ? {
            id: affUser.id,
            email: affUser.email,
            firstName: affUser.firstName,
            lastName: affUser.lastName,
          } : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      res.status(500).json({ message: 'Failed to fetch affiliates' });
    }
  });

  // Admin: Approve affiliate
  app.patch('/api/affiliates/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const affiliate = await storage.approveAffiliate(req.params.id, userId);
      if (!affiliate) {
        return res.status(404).json({ message: 'Affiliate not found' });
      }

      res.json(affiliate);
    } catch (error) {
      console.error('Error approving affiliate:', error);
      res.status(500).json({ message: 'Failed to approve affiliate' });
    }
  });

  // Admin: Reject affiliate
  app.patch('/api/affiliates/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { reason } = req.body;
      const affiliate = await storage.rejectAffiliate(req.params.id, reason || 'Application rejected');
      if (!affiliate) {
        return res.status(404).json({ message: 'Affiliate not found' });
      }

      res.json(affiliate);
    } catch (error) {
      console.error('Error rejecting affiliate:', error);
      res.status(500).json({ message: 'Failed to reject affiliate' });
    }
  });

  // ============================================
  // ADMIN ANALYTICS ROUTES
  // ============================================

  // Get admin analytics dashboard data
  app.get('/api/admin/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analytics = await storage.getAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Send exclusive discount to user (admin only)
  app.post('/api/admin/send-discount', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { userEmail, discountPercent, expiresInDays, code } = req.body;

      if (!userEmail || !discountPercent) {
        return res.status(400).json({ message: 'User email and discount percent are required' });
      }

      const targetUser = await storage.getUserByEmail(userEmail);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate or use provided coupon code
      const couponCode = code || `EXCL${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

      // Create the coupon in database
      await storage.createCoupon({
        code: couponCode,
        discountType: 'percentage',
        discountValue: discountPercent.toString(),
        minOrderAmount: '0',
        usageLimit: 1,
        usedCount: 0,
        isActive: true,
        startDate: new Date(),
        endDate: expiresAt,
      });

      // Send the email
      const expiresText = expiresInDays === 1 ? 'in 24 hours' : `in ${expiresInDays || 7} days`;
      await sendExclusiveDiscountEmail(
        targetUser.email,
        couponCode,
        discountPercent,
        expiresText,
        targetUser.firstName || undefined
      );

      res.json({
        success: true,
        message: `Exclusive ${discountPercent}% discount sent to ${userEmail}`,
        couponCode
      });
    } catch (error) {
      console.error('Error sending exclusive discount:', error);
      res.status(500).json({ message: 'Failed to send exclusive discount' });
    }
  });

  // ============================================
  // COUPON ROUTES
  // ============================================

  // Validate coupon
  app.post('/api/coupons/validate', async (req, res) => {
    try {
      const { code, orderAmount } = req.body;

      if (!code || !orderAmount) {
        return res.status(400).json({ message: 'Code and order amount are required' });
      }

      const result = await storage.validateCoupon(code, orderAmount);
      res.json(result);
    } catch (error) {
      console.error('Error validating coupon:', error);
      res.status(500).json({ message: 'Failed to validate coupon' });
    }
  });

  // ============================================
  // ANNOUNCEMENTS ROUTES
  // ============================================

  // Get active announcements
  app.get('/api/announcements', async (_req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  // Get popup announcements
  app.get('/api/announcements/popups', async (_req, res) => {
    try {
      const announcements = await storage.getPopupAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching popup announcements:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  // ============================================
  // UPLOAD ROUTES (S3)
  // ============================================

  // Get presigned upload URL
  app.post('/api/uploads/presigned-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      if (!isS3Configured()) {
        // Return a flag indicating local upload should be used
        return res.json({ useLocalUpload: true, message: 'S3 not configured, use local upload' });
      }

      const { filename, contentType, folder } = req.body;

      if (!filename || !contentType) {
        return res.status(400).json({ message: 'Filename and content type are required' });
      }

      const validation = validateImageFile(contentType, 0);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      const result = await getPresignedUploadUrl(filename, contentType, folder || 'products');
      res.json(result);
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      res.status(500).json({ message: 'Failed to generate upload URL' });
    }
  });

  // Setup multer for local file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for high-quality images
    fileFilter: (_req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'image/bmp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
      }
    },
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Proxy S3 images (for buckets without public access)
  // This endpoint generates fresh signed URLs on-demand, preventing broken images
  // Images are served at full resolution without compression
  app.get('/api/images/s3/*', async (req, res) => {
    try {
      const s3Key = (req.params as any)[0];
      if (!s3Key) {
        return res.status(400).json({ message: 'Image key required' });
      }

      const { getSignedDownloadUrl } = await import('./s3');
      // Generate a fresh signed URL with 24-hour expiry for better caching
      const signedUrl = await getSignedDownloadUrl(s3Key, 86400);

      // Set cache headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString());

      // Ensure images are served at full quality
      // Note: The actual image quality is preserved from S3 - we're just ensuring
      // the browser doesn't compress on download
      res.setHeader('Accept-Ranges', 'bytes');

      // Redirect to signed URL
      res.redirect(signedUrl);
    } catch (error) {
      console.error('Error proxying S3 image:', error);
      res.status(500).json({ message: 'Failed to load image' });
    }
  });

  // Local file upload endpoint (fallback when S3 not configured)
  app.post('/api/uploads/local', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Return the public URL for the uploaded file
      const publicUrl = `/uploads/products/${req.file.filename}`;
      res.json({
        success: true,
        publicUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error('Error uploading file locally:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  // Server-side S3 upload (avoids CORS issues by uploading through server)
  // Images are uploaded at FULL QUALITY - no compression or resizing
  app.post('/api/uploads/s3', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (!isS3Configured()) {
        // Fall back to local storage
        const publicUrl = `/uploads/products/${req.file.filename}`;
        return res.json({ success: true, publicUrl });
      }

      // Read the file and upload to S3 at full quality (no compression)
      const fileBuffer = fs.readFileSync(req.file.path);

      const result = await uploadFile(
        fileBuffer,
        req.file.originalname,
        req.file.mimetype,
        'products'
      );

      // Delete local temp file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        publicUrl: result.url,
        key: result.key,
      });
    } catch (error: any) {
      console.error('Error uploading to S3:', error);
      res.status(500).json({ message: 'Failed to upload to S3' });
    }
  });

  // ============================================
  // PAYMENT ROUTES (Razorpay)
  // ============================================

  // Get Razorpay config (public key)
  app.get('/api/payments/config', (_req, res) => {
    res.json({
      configured: isRazorpayConfigured(),
      keyId: getRazorpayKeyId(),
    });
  });

  // Create Razorpay order
  app.post('/api/payments/create-order', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ message: 'Order ID is required' });
      }

      if (!isRazorpayConfigured()) {
        return res.status(503).json({ message: 'Payment gateway not configured' });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ message: 'Order already paid' });
      }

      // Create Razorpay order (amount in paise)
      const amountInPaise = Math.round(parseFloat(order.totalAmount) * 100);
      const razorpayOrder = await createRazorpayOrder({
        amount: amountInPaise,
        orderId: order.id,
        notes: {
          order_number: order.orderNumber,
        },
      });

      res.json({
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: getRazorpayKeyId(),
      });
    } catch (error) {
      console.error('Error creating payment order:', error);
      res.status(500).json({ message: 'Failed to create payment order' });
    }
  });

  // Verify payment
  app.post('/api/payments/verify', isAuthenticated, async (req: any, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
      }

      // Verify signature
      const isValid = verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isValid) {
        await handlePaymentFailure(orderId, 'Invalid signature');
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      // Handle successful payment
      const result = await handlePaymentSuccess(orderId, razorpay_payment_id, razorpay_signature);

      if (result.success) {
        const order = await storage.getOrder(orderId);
        res.json({ success: true, order });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
  });

  // Razorpay webhook
  app.post('/api/razorpay/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const body = JSON.stringify(req.body);

      // Verify webhook signature
      if (signature && !verifyWebhookSignature(body, signature)) {
        console.warn('Invalid webhook signature');
        return res.status(400).json({ message: 'Invalid signature' });
      }

      // Process the webhook event
      await processWebhookEvent(req.body);

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  return httpServer;
}

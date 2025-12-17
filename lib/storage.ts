import {
  users,
  addresses,
  otpCodes,
  passwordResetTokens,
  brands,
  products,
  productImages,
  productVariants,
  affiliates,
  affiliateClicks,
  orders,
  orderItems,
  cartItems,
  wishlistItems,
  announcements,
  coupons,
  abandonedCartEmails,
  blogs,
  type User,
  type UpsertUser,
  type Address,
  type InsertAddress,
  type OtpCode,
  type PasswordResetToken,
  type Brand,
  type InsertBrand,
  type Product,
  type InsertProduct,
  type ProductImage,
  type InsertProductImage,
  type ProductVariant,
  type InsertProductVariant,
  type Affiliate,
  type InsertAffiliate,
  type AffiliateClick,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type CartItem,
  type InsertCartItem,
  type WishlistItem,
  type Announcement,
  type Coupon,
  type InsertCoupon,
  type AbandonedCartEmail,
  type InsertAbandonedCartEmail,
  type Blog,
  type InsertBlog,
  customPrices,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, or, and, gte, lte, sql, inArray, getTableColumns } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // OTP operations
  createOtp(email: string, code: string, type: string, userId?: string): Promise<OtpCode>;
  getValidOtp(email: string, code: string, type: string): Promise<OtpCode | undefined>;
  markOtpUsed(id: string): Promise<void>;

  // Password reset operations
  createPasswordResetToken(userId: string, token: string): Promise<PasswordResetToken>;
  getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;

  // Address operations
  getAddresses(userId: string): Promise<Address[]>;
  getAddress(id: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: string): Promise<void>;
  setDefaultAddress(userId: string, addressId: string): Promise<void>;

  // Wishlist operations
  getWishlistItems(userId: string): Promise<(WishlistItem & { product: Product })[]>;
  addToWishlist(userId: string, productId: string): Promise<WishlistItem>;
  removeFromWishlist(id: string): Promise<void>;
  isInWishlist(userId: string, productId: string): Promise<boolean>;

  // Coupon operations
  getCoupon(code: string): Promise<Coupon | undefined>;
  validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message?: string }>;
  incrementCouponUsage(id: string): Promise<void>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;

  // Brand operations
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  getBrandByName(name: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: string): Promise<void>;

  // Product operations
  getProducts(filters?: ProductFilters, userId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductsByCategory(category: string, subCategory?: string): Promise<Product[]>;
  getProductsByBrand(brand: string): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Product images operations
  getProductImages(productId: string): Promise<ProductImage[]>;
  addProductImage(image: InsertProductImage): Promise<ProductImage>;
  updateProductImage(id: string, image: Partial<InsertProductImage>): Promise<ProductImage | undefined>;
  deleteProductImage(id: string): Promise<void>;
  setPrimaryImage(productId: string, imageId: string): Promise<void>;

  // Product variants operations
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  getVariant(id: string): Promise<ProductVariant | undefined>;
  getVariantBySku(sku: string): Promise<ProductVariant | undefined>;
  createVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined>;
  deleteVariant(id: string): Promise<void>;
  updateVariantStock(id: string, stock: number): Promise<void>;

  // Affiliate operations
  getAffiliate(id: string): Promise<Affiliate | undefined>;
  getAffiliateByCode(code: string): Promise<Affiliate | undefined>;
  getAffiliateByUserId(userId: string): Promise<Affiliate | undefined>;
  createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate>;
  updateAffiliate(id: string, data: Partial<InsertAffiliate>): Promise<Affiliate | undefined>;
  getAllAffiliates(): Promise<Affiliate[]>;
  getPendingAffiliates(): Promise<Affiliate[]>;
  approveAffiliate(id: string, approvedBy: string): Promise<Affiliate | undefined>;
  rejectAffiliate(id: string, reason: string): Promise<Affiliate | undefined>;
  getAffiliateStats(): Promise<Array<{
    id: string;
    name: string;
    code: string;
    traffic: number;
    sales: number;
    conversionRate: number;
    revenue: string;
    status: string;
    totalEarnings: string;
  }>>;
  trackAffiliateClick(affiliateId: string, ipAddress: string, userAgent: string, referrerUrl?: string, landingPage?: string): Promise<void>;
  updateAffiliateEarnings(id: string, amount: number): Promise<void>;

  // Analytics operations
  getAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
    pendingOrders: number;
    lowStockProducts: number;
    recentOrders: Order[];
    salesByDay: Array<{ date: string; sales: number; orders: number }>;
    topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>;
  }>;

  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getUserOrders(userId: string): Promise<Order[]>;
  getAllOrders(filters?: OrderFilters): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<void>;
  updateOrderPayment(id: string, paymentData: {
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentStatus: string;
    paidAt?: Date;
  }): Promise<void>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Cart operations
  getCartItems(userId: string): Promise<(CartItem & { product: Product; variant: ProductVariant | null })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<void>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Wishlist operations
  getWishlistItems(userId: string): Promise<(WishlistItem & { product: Product })[]>;
  addToWishlist(userId: string, productId: string): Promise<WishlistItem>;
  removeFromWishlist(id: string): Promise<void>;
  isInWishlist(userId: string, productId: string): Promise<boolean>;

  // Announcements
  getActiveAnnouncements(): Promise<Announcement[]>;
  getPopupAnnouncements(): Promise<Announcement[]>;

  // Coupons
  getCoupon(code: string): Promise<Coupon | undefined>;
  validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message?: string }>;
  incrementCouponUsage(id: string): Promise<void>;

  // Blog operations
  getBlogs(publishedOnly?: boolean): Promise<Blog[]>;
  getBlog(id: string): Promise<Blog | undefined>;
  getBlogBySlug(slug: string): Promise<Blog | undefined>;
  createBlog(blog: InsertBlog): Promise<Blog>;
  updateBlog(id: string, blog: Partial<InsertBlog>): Promise<Blog | undefined>;
  deleteBlog(id: string): Promise<void>;
  incrementBlogViews(id: string): Promise<void>;
}

export interface ProductFilters {
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

export interface OrderFilters {
  status?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class DatabaseStorage implements IStorage {
  // ============================================
  // USER OPERATIONS
  // ============================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      email: userData.email?.toLowerCase(),
    }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        email: userData.email?.toLowerCase(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // ============================================
  // OTP OPERATIONS
  // ============================================

  async createOtp(email: string, code: string, type: string, userId?: string): Promise<OtpCode> {
    // Invalidate previous OTPs of same type
    await db.update(otpCodes)
      .set({ isUsed: true })
      .where(and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.type, type),
        eq(otpCodes.isUsed, false)
      ));

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const [otp] = await db.insert(otpCodes).values({
      email: email.toLowerCase(),
      code,
      type,
      userId,
      expiresAt,
    }).returning();
    return otp;
  }

  async getValidOtp(email: string, code: string, type: string): Promise<OtpCode | undefined> {
    const [otp] = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.type, type),
        eq(otpCodes.isUsed, false),
        gte(otpCodes.expiresAt, new Date())
      ));
    return otp;
  }

  async markOtpUsed(id: string): Promise<void> {
    await db.update(otpCodes).set({ isUsed: true }).where(eq(otpCodes.id, id));
  }

  // ============================================
  // PASSWORD RESET OPERATIONS
  // ============================================

  async createPasswordResetToken(userId: string, token: string): Promise<PasswordResetToken> {
    // Invalidate previous tokens
    await db.update(passwordResetTokens)
      .set({ isUsed: true })
      .where(and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.isUsed, false)
      ));

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const [resetToken] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    }).returning();
    return resetToken;
  }

  async getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.isUsed, false),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    return resetToken;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ isUsed: true }).where(eq(passwordResetTokens.id, id));
  }

  // ============================================
  // ADDRESS OPERATIONS
  // ============================================

  async getAddresses(userId: string): Promise<Address[]> {
    return await db.select().from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  }

  async getAddress(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address;
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    // If this is the first address or marked as default, update others
    if (address.isDefault) {
      await db.update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, address.userId));
    }

    const [newAddress] = await db.insert(addresses).values(address).returning();
    return newAddress;
  }

  async updateAddress(id: string, data: Partial<InsertAddress>): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    if (!address) return undefined;

    if (data.isDefault) {
      await db.update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, address.userId));
    }

    const [updated] = await db.update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(addresses.id, id))
      .returning();
    return updated;
  }

  async deleteAddress(id: string): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await db.update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));

    await db.update(addresses)
      .set({ isDefault: true })
      .where(eq(addresses.id, addressId));
  }

  // ============================================
  // BRAND OPERATIONS
  // ============================================

  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).where(eq(brands.isActive, true)).orderBy(brands.name);
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async getBrandByName(name: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.name, name));
    return brand;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    // Generate slug if not provided
    if (!brand.slug) {
      brand.slug = brand.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }

  async updateBrand(id: string, data: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [updated] = await db.update(brands)
      .set(data)
      .where(eq(brands.id, id))
      .returning();
    return updated;
  }

  async deleteBrand(id: string): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================

  async getProducts(filters?: ProductFilters, userId?: string): Promise<Product[]> {
    let query = db.select({
      ...getTableColumns(products),
      basePrice: userId ? sql`COALESCE(${customPrices.price}, ${products.basePrice})`.mapWith(Number) : products.basePrice,
    }).from(products);

    if (userId) {
      query.leftJoin(customPrices, and(
        eq(customPrices.productId, products.id),
        eq(customPrices.userId, userId),
        eq(customPrices.isActive, true)
      )) as any;
    }

    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters?.subCategory) {
      conditions.push(eq(products.subCategory, filters.subCategory));
    }
    if (filters?.brand) {
      conditions.push(eq(products.brand, filters.brand));
    }
    if (filters?.minPrice) {
      conditions.push(gte(products.basePrice, filters.minPrice.toString()));
    }
    if (filters?.maxPrice) {
      conditions.push(lte(products.basePrice, filters.maxPrice.toString()));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(products.name, `%${filters.search}%`),
        ilike(products.description, `%${filters.search}%`),
        ilike(products.brand, `%${filters.search}%`)
      ));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    }
    if (filters?.isFeatured !== undefined) {
      conditions.push(eq(products.isFeatured, filters.isFeatured));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(products.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const result = await query;

    // Fetch relations
    const productIds = result.map((p: any) => p.id);
    if (productIds.length === 0) return [];

    const images = await db.select().from(productImages).where(inArray(productImages.productId, productIds));
    const variants = await db.select().from(productVariants).where(inArray(productVariants.productId, productIds));

    // Map relations to products
    const productsWithRelations = result.map((p: any) => {
      return {
        ...p,
        images: images.filter(img => img.productId === p.id).sort((a, b) => a.sortOrder - b.sortOrder),
        variants: variants.filter(v => v.productId === p.id),
      };
    });

    return productsWithRelations as unknown as Product[];
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));

    if (!product) return undefined;

    const images = await db.select().from(productImages).where(eq(productImages.productId, id));
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, id));

    return {
      ...product,
      images: images.sort((a, b) => a.sortOrder - b.sortOrder),
      variants,
    } as Product;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product;
  }

  async getProductsByCategory(category: string, subCategory?: string): Promise<Product[]> {
    if (subCategory) {
      return await db.select().from(products)
        .where(and(
          eq(products.category, category),
          eq(products.subCategory, subCategory),
          eq(products.isActive, true)
        ))
        .orderBy(desc(products.createdAt));
    }
    return await db.select().from(products)
      .where(and(
        eq(products.category, category),
        eq(products.isActive, true)
      ))
      .orderBy(desc(products.createdAt));
  }

  async getProductsByBrand(brand: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(
        eq(products.brand, brand),
        eq(products.isActive, true)
      ))
      .orderBy(desc(products.createdAt));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.description, `%${query}%`),
          ilike(products.brand, `%${query}%`),
          ilike(products.tags, `%${query}%`)
        ),
        eq(products.isActive, true)
      ))
      .orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    // Generate slug if not provided
    if (!product.slug) {
      product.slug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const [deleted] = await db.delete(products)
      .where(eq(products.id, id))
      .returning();
    return !!deleted;
  }

  // ============================================
  // PRODUCT IMAGES OPERATIONS
  // ============================================

  async getProductImages(productId: string): Promise<ProductImage[]> {
    return await db.select().from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder);
  }

  async addProductImage(image: InsertProductImage): Promise<ProductImage> {
    // If this is the primary image, unset others
    if (image.isPrimary) {
      await db.update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, image.productId));
    }

    const [newImage] = await db.insert(productImages).values(image).returning();
    return newImage;
  }

  async updateProductImage(id: string, data: Partial<InsertProductImage>): Promise<ProductImage | undefined> {
    if (data.isPrimary) {
      const [existing] = await db.select().from(productImages).where(eq(productImages.id, id));
      if (existing) {
        await db.update(productImages)
          .set({ isPrimary: false })
          .where(eq(productImages.productId, existing.productId));
      }
    }

    const [updated] = await db.update(productImages)
      .set(data)
      .where(eq(productImages.id, id))
      .returning();
    return updated;
  }

  async deleteProductImage(id: string): Promise<void> {
    await db.delete(productImages).where(eq(productImages.id, id));
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    await db.update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, productId));

    await db.update(productImages)
      .set({ isPrimary: true })
      .where(eq(productImages.id, imageId));
  }

  // ============================================
  // PRODUCT VARIANTS OPERATIONS
  // ============================================

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return await db.select().from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.size, productVariants.color);
  }

  async getVariant(id: string): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, id));
    return variant;
  }

  async getVariantBySku(sku: string): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.sku, sku));
    return variant;
  }

  async createVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const [newVariant] = await db.insert(productVariants).values(variant).returning();

    // Mark product as having variants
    await db.update(products)
      .set({ hasVariants: true })
      .where(eq(products.id, variant.productId));

    return newVariant;
  }

  async updateVariant(id: string, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const [updated] = await db.update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();
    return updated;
  }

  async deleteVariant(id: string): Promise<void> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, id));
    if (variant) {
      await db.delete(productVariants).where(eq(productVariants.id, id));

      // Check if product still has variants
      const remaining = await db.select().from(productVariants)
        .where(eq(productVariants.productId, variant.productId));

      if (remaining.length === 0) {
        await db.update(products)
          .set({ hasVariants: false })
          .where(eq(products.id, variant.productId));
      }
    }
  }

  async updateVariantStock(id: string, stock: number): Promise<void> {
    await db.update(productVariants)
      .set({ stock, updatedAt: new Date() })
      .where(eq(productVariants.id, id));
  }

  // ============================================
  // AFFILIATE OPERATIONS
  // ============================================

  async getAffiliate(id: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }

  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.code, code));
    return affiliate;
  }

  async getAffiliateByUserId(userId: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, userId));
    return affiliate;
  }

  async createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate> {
    const [newAffiliate] = await db.insert(affiliates).values(affiliate).returning();
    return newAffiliate;
  }

  async updateAffiliate(id: string, data: Partial<InsertAffiliate>): Promise<Affiliate | undefined> {
    const [updated] = await db.update(affiliates)
      .set(data)
      .where(eq(affiliates.id, id))
      .returning();
    return updated;
  }

  async getAllAffiliates(): Promise<Affiliate[]> {
    return await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
  }

  async getPendingAffiliates(): Promise<Affiliate[]> {
    return await db.select().from(affiliates)
      .where(eq(affiliates.status, 'pending'))
      .orderBy(desc(affiliates.createdAt));
  }

  async approveAffiliate(id: string, approvedBy: string): Promise<Affiliate | undefined> {
    const [updated] = await db.update(affiliates)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy,
        isActive: true,
      })
      .where(eq(affiliates.id, id))
      .returning();

    // Update user role to affiliate
    if (updated) {
      await db.update(users)
        .set({ role: 'affiliate' })
        .where(eq(users.id, updated.userId));
    }

    return updated;
  }

  async rejectAffiliate(id: string, reason: string): Promise<Affiliate | undefined> {
    const [updated] = await db.update(affiliates)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        isActive: false,
      })
      .where(eq(affiliates.id, id))
      .returning();
    return updated;
  }

  async getAffiliateStats(): Promise<Array<{
    id: string;
    name: string;
    code: string;
    traffic: number;
    sales: number;
    conversionRate: number;
    revenue: string;
    status: string;
    totalEarnings: string;
  }>> {
    const stats = await db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        userId: affiliates.userId,
        status: affiliates.status,
        totalEarnings: affiliates.totalEarnings,
        traffic: sql<number>`count(distinct ${affiliateClicks.id})`.as('traffic'),
        sales: sql<number>`count(distinct ${orders.id})`.as('sales'),
        revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`.as('revenue'),
      })
      .from(affiliates)
      .leftJoin(affiliateClicks, eq(affiliateClicks.affiliateId, affiliates.id))
      .leftJoin(orders, eq(orders.affiliateId, affiliates.id))
      .groupBy(affiliates.id, affiliates.code, affiliates.userId, affiliates.status, affiliates.totalEarnings);

    const enriched = await Promise.all(stats.map(async (stat: { id: string; code: string; userId: string; status: string; totalEarnings: string; traffic: number; sales: number; revenue: string }) => {
      const user = await this.getUser(stat.userId);
      const traffic = stat.traffic || 0;
      const sales = stat.sales || 0;
      const conversionRate = traffic > 0 ? ((sales / traffic) * 100) : 0;

      return {
        id: stat.id,
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
        code: stat.code,
        traffic,
        sales,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        revenue: stat.revenue || '0',
        status: stat.status,
        totalEarnings: stat.totalEarnings || '0',
      };
    }));

    return enriched;
  }

  async trackAffiliateClick(affiliateId: string, ipAddress: string, userAgent: string, referrerUrl?: string, landingPage?: string): Promise<void> {
    await db.insert(affiliateClicks).values({
      affiliateId,
      ipAddress,
      userAgent,
      referrerUrl,
      landingPage,
    });
  }

  async updateAffiliateEarnings(id: string, amount: number): Promise<void> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    if (affiliate) {
      const currentEarnings = parseFloat(affiliate.totalEarnings || '0');
      const newEarnings = (currentEarnings + amount).toFixed(2);
      await db.update(affiliates)
        .set({ totalEarnings: newEarnings })
        .where(eq(affiliates.id, id));
    }
  }

  // ============================================
  // ANALYTICS OPERATIONS
  // ============================================

  async getAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
    pendingOrders: number;
    lowStockProducts: number;
    recentOrders: Order[];
    salesByDay: Array<{ date: string; sales: number; orders: number }>;
    topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>;
  }> {
    // Basic stats
    const [revenueResult] = await db.select({ value: sql<string>`COALESCE(sum(${orders.totalAmount}), 0)` }).from(orders);
    const totalRevenue = parseFloat(revenueResult?.value || '0') || 0;

    const [ordersResult] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const totalOrders = Number(ordersResult?.count || 0) || 0;

    const [productsResult] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const totalProducts = Number(productsResult?.count || 0) || 0;

    const [usersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = Number(usersResult?.count || 0) || 0;

    const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'pending'));
    const pendingOrders = Number(pendingResult?.count || 0) || 0;

    // Low stock products (less than 5 units)
    const [lowStockResult] = await db.select({ count: sql<number>`count(*)` }).from(productVariants).where(lte(productVariants.stock, 5));
    const lowStockProducts = Number(lowStockResult?.count || 0) || 0;

    // Recent orders
    const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

    // Sales by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDayResult = await db.execute(sql`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as orders, 
        COALESCE(SUM(total_amount), 0) as sales 
      FROM orders 
      WHERE created_at >= ${thirtyDaysAgo.toISOString()} 
      GROUP BY DATE(created_at) 
      ORDER BY DATE(created_at)
    `);

    const salesByDay = salesByDayResult.rows.map((row: any) => ({
      date: new Date(row.date).toISOString().split('T')[0],
      sales: parseFloat(row.sales || '0') || 0,
      orders: parseInt(row.orders || '0', 10) || 0,
    }));

    // Top products
    const topProductsResult = await db.execute(sql`
      SELECT 
        p.id, 
        p.name, 
        COUNT(oi.id) as sales, 
        COALESCE(SUM(oi.total_price), 0) as revenue 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    const topProducts = topProductsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      sales: parseInt(row.sales || '0', 10) || 0,
      revenue: parseFloat(row.revenue || '0') || 0,
    }));

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      salesByDay,
      topProducts,
    };
  }

  // ============================================
  // ORDER OPERATIONS
  // ============================================

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    try {
      const [newOrder] = await db.insert(orders).values(order).returning();

      if (!newOrder) {
        throw new Error("Failed to create order in database");
      }

      for (const item of items) {
        // Validate required fields
        if (!item.productId || !item.productName || !item.unitPrice || !item.totalPrice || !item.quantity) {
          throw new Error(`Invalid order item: missing required fields. Item: ${JSON.stringify(item)}`);
        }

        await db.insert(orderItems).values({
          ...item,
          orderId: newOrder.id,
        });

        // Update stock
        if (item.variantId) {
          const variant = await this.getVariant(item.variantId);
          if (variant) {
            await this.updateVariantStock(variant.id, Math.max(0, variant.stock - item.quantity));
          }
        }
      }

      return newOrder;
    } catch (error: any) {
      console.error("Error in createOrder:", error);
      console.error("Order data:", JSON.stringify(order, null, 2));
      console.error("Order items:", JSON.stringify(items, null, 2));
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders(filters?: OrderFilters): Promise<Order[]> {
    let query = db.select().from(orders);
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    if (filters?.userId) {
      conditions.push(eq(orders.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(orders.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(orders.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(orders.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  // ... existing code ...

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await db.update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  async updateOrderPayment(id: string, paymentData: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentStatus?: string;
    paidAt?: Date;
  }): Promise<void> {
    await db.update(orders)
      .set({ ...paymentData, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  // Aliases for backward compatibility
  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    return this.getAllOrders(filters);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return this.getUserOrders(userId);
  }

  // ============================================
  // CART OPERATIONS
  // ============================================

  async getCartItems(userId: string): Promise<(CartItem & { product: Product; variant: ProductVariant | null })[]> {
    const items = await db.select().from(cartItems)
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));

    const result: (CartItem & { product: Product; variant: ProductVariant | null })[] = [];
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      const variant = item.variantId ? await this.getVariant(item.variantId) : null;

      if (product) {
        result.push({
          ...item,
          product,
          variant: variant || null,
        });
      }
    }
    return result;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const existing = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.userId, item.userId),
        eq(cartItems.productId, item.productId),
        item.variantId ? eq(cartItems.variantId, item.variantId) : sql`${cartItems.variantId} IS NULL`
      ));

    if (existing.length > 0) {
      // Update quantity
      const quantityToAdd = item.quantity || 1;
      const newQuantity = existing[0].quantity + quantityToAdd;
      const [updated] = await db.update(cartItems)
        .set({ quantity: newQuantity, updatedAt: new Date() })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newItem] = await db.insert(cartItems).values(item).returning();
    return newItem;
  }

  // ============================================
  // WISHLIST FUNCTIONS
  // ============================================

  async getWishlistItems(userId: string): Promise<(WishlistItem & { product: Product })[]> {
    const items = await db.select({
      wishlistItem: wishlistItems,
      product: products,
    })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, userId));

    return items.map(item => ({
      ...item.wishlistItem,
      product: item.product,
    }));
  }

  async addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
    const [item] = await db.insert(wishlistItems)
      .values({ userId, productId })
      .returning();
    return item;
  }

  async removeFromWishlist(id: string): Promise<void> {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const [item] = await db.select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
    return !!item;
  }
  async updateCartItemQuantity(id: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeFromCart(id);
      return;
    }
    await db.update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id));
  }

  async updateCartItem(id: string, quantity: number): Promise<void> {
    return this.updateCartItemQuantity(id, quantity);
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // ... existing wishlist operations ...

  // ============================================
  // ANNOUNCEMENTS
  // ============================================

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements)
      .where(and(
        eq(announcements.isActive, true),
        lte(announcements.startDate, new Date()),
        gte(announcements.endDate, new Date())
      ))
      .orderBy(desc(announcements.createdAt));
  }

  async getPopupAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements)
      .where(and(
        eq(announcements.isActive, true),
        eq(announcements.type, 'popup'),
        lte(announcements.startDate, new Date()),
        gte(announcements.endDate, new Date())
      ))
      .orderBy(desc(announcements.createdAt));
  }

  // ============================================
  // COUPONS
  // ============================================

  async getCoupon(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon;
  }

  async validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message?: string }> {
    const coupon = await this.getCoupon(code);

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }

    if (!coupon.isActive) {
      return { valid: false, discount: 0, message: 'Coupon is inactive' };
    }

    if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
      return { valid: false, discount: 0, message: 'Coupon is not yet active' };
    }

    if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
      return { valid: false, discount: 0, message: 'Coupon has expired' };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    if (coupon.minOrderAmount && orderAmount < parseFloat(coupon.minOrderAmount)) {
      return { valid: false, discount: 0, message: `Minimum order amount is ${coupon.minOrderAmount}` };
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (orderAmount * parseFloat(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount && discount > parseFloat(coupon.maxDiscountAmount)) {
        discount = parseFloat(coupon.maxDiscountAmount);
      }
    } else {
      discount = parseFloat(coupon.discountValue);
    }

    return { valid: true, discount, message: 'Coupon applied successfully' };
  }

  async incrementCouponUsage(id: string): Promise<void> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    if (coupon) {
      await db.update(coupons)
        .set({ usedCount: coupon.usedCount + 1 })
        .where(eq(coupons.id, id));
    }
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db.insert(coupons).values(coupon).returning();
    return newCoupon;
  }

  // ============================================
  // BLOG OPERATIONS
  // ============================================

  async getBlogs(publishedOnly: boolean = true): Promise<Blog[]> {
    let query = db.select().from(blogs);

    if (publishedOnly) {
      query = query.where(eq(blogs.isPublished, true)) as any;
    }

    return await query.orderBy(desc(blogs.publishedAt), desc(blogs.createdAt));
  }

  async getBlog(id: string): Promise<Blog | undefined> {
    const [blog] = await db.select().from(blogs).where(eq(blogs.id, id));
    return blog;
  }

  async getBlogBySlug(slug: string): Promise<Blog | undefined> {
    const [blog] = await db.select().from(blogs).where(eq(blogs.slug, slug));
    return blog;
  }

  async createBlog(blog: InsertBlog): Promise<Blog> {
    // Generate slug if not provided
    if (!blog.slug) {
      blog.slug = blog.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const [newBlog] = await db.insert(blogs).values(blog).returning();
    return newBlog;
  }

  async updateBlog(id: string, data: Partial<InsertBlog>): Promise<Blog | undefined> {
    const [updated] = await db.update(blogs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogs.id, id))
      .returning();
    return updated;
  }

  async deleteBlog(id: string): Promise<void> {
    await db.delete(blogs).where(eq(blogs.id, id));
  }

  async incrementBlogViews(id: string): Promise<void> {
    const [blog] = await db.select().from(blogs).where(eq(blogs.id, id));
    if (blog) {
      await db.update(blogs)
        .set({ views: (blog.views || 0) + 1 })
        .where(eq(blogs.id, id));
    }
  }

  // ============================================
  // ABANDONED CART METHODS
  // ============================================

  async getAbandonedCarts(hoursAgo: number): Promise<Array<{
    userId: string;
    userEmail: string;
    firstName?: string | null;
    lastName?: string | null;
    cartItems: Array<{
      id: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      createdAt: Date;
      product: Product;
      variant: ProductVariant | null;
      imageUrl?: string;
    }>;
    cartTotal: number;
    lastUpdated: Date;
  }>> {
    // Get cart items that haven't been converted to orders
    // and are older than the specified hours
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Get all cart items older than cutoff
    const oldCartItems = await db.select({
      cartItem: cartItems,
      user: users,
    })
      .from(cartItems)
      .innerJoin(users, eq(cartItems.userId, users.id))
      .where(
        and(
          lte(cartItems.updatedAt, cutoffTime),
          // Exclude items from users who have orders (they might have checked out)
          sql`NOT EXISTS (
            SELECT 1 FROM ${orders} 
            WHERE ${orders.userId} = ${cartItems.userId} 
            AND ${orders.createdAt} > ${cartItems.createdAt}
          )`
        )
      )
      .orderBy(desc(cartItems.updatedAt));

    // Group by user
    const userCarts = new Map<string, {
      userId: string;
      userEmail: string;
      firstName?: string | null;
      lastName?: string | null;
      cartItems: Array<{
        id: string;
        productId: string;
        variantId: string | null;
        quantity: number;
        createdAt: Date;
        product: Product;
        variant: ProductVariant | null;
        imageUrl?: string;
      }>;
      cartTotal: number;
      lastUpdated: Date;
    }>();

    for (const row of oldCartItems) {
      const userId = row.cartItem.userId;

      if (!userCarts.has(userId)) {
        userCarts.set(userId, {
          userId,
          userEmail: row.user.email,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          cartItems: [],
          cartTotal: 0,
          lastUpdated: row.cartItem.updatedAt || row.cartItem.createdAt || new Date(),
        });
      }

      const cart = userCarts.get(userId)!;
      const product = await this.getProduct(row.cartItem.productId);
      const variant = row.cartItem.variantId ? await this.getVariant(row.cartItem.variantId) : null;
      const images = await this.getProductImages(row.cartItem.productId);
      const primaryImage = images.find(img => img.isPrimary) || images[0];

      cart.cartItems.push({
        id: row.cartItem.id,
        productId: row.cartItem.productId,
        variantId: row.cartItem.variantId,
        quantity: row.cartItem.quantity,
        createdAt: row.cartItem.createdAt || new Date(),
        product: product!,
        variant: variant ?? null,
        imageUrl: primaryImage?.url || undefined,
      });

      // Calculate total
      const price = variant?.priceModifier
        ? parseFloat(product!.basePrice) + parseFloat(variant.priceModifier)
        : parseFloat(product!.basePrice);
      cart.cartTotal += price * row.cartItem.quantity;

      // Update last updated time
      if (row.cartItem.updatedAt && row.cartItem.updatedAt > cart.lastUpdated) {
        cart.lastUpdated = row.cartItem.updatedAt;
      }
    }

    return Array.from(userCarts.values());
  }

  async hasAbandonedCartEmailBeenSent(cartItemId: string, emailType: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(abandonedCartEmails)
      .where(
        and(
          eq(abandonedCartEmails.cartItemId, cartItemId),
          eq(abandonedCartEmails.emailType, emailType)
        )
      )
      .limit(1);

    return !!existing;
  }

  async recordAbandonedCartEmail(email: InsertAbandonedCartEmail): Promise<AbandonedCartEmail> {
    const [result] = await db.insert(abandonedCartEmails)
      .values(email)
      .returning();
    return result;
  }

  async markEmailOpened(emailId: string): Promise<void> {
    await db.update(abandonedCartEmails)
      .set({
        opened: true,
        openedAt: new Date(),
      })
      .where(eq(abandonedCartEmails.id, emailId));
  }

  async markEmailClicked(emailId: string): Promise<void> {
    await db.update(abandonedCartEmails)
      .set({
        clicked: true,
        clickedAt: new Date(),
      })
      .where(eq(abandonedCartEmails.id, emailId));
  }

  // ============================================
  // ANALYTICS OPERATIONS
  // ============================================


}

export const storage = new DatabaseStorage();

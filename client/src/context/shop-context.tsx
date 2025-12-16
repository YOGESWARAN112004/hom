import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { trackAddToCart, trackRemoveFromCart } from "@/lib/analytics";
import { getApiUrl } from "@/lib/apiConfig";

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  priceModifier: string;
  stock: number;
  imageUrl: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  basePrice: string;
  compareAtPrice: string | null;
  category: string;
  subCategory: string;
  brand: string;
  hasVariants: boolean;
  stock: number;
  images: ProductImage[];
  variants: ProductVariant[];
  imageUrl: string | null;
  // Legacy compatibility
  price?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
  size?: string | null;
  color?: string | null;
  sku?: string;
}

export interface AffiliateStats {
  id: string;
  name: string;
  code: string;
  traffic: number;
  sales: number;
  conversionRate: number;
  revenue: string;
}

interface ShopContextType {
  // Products
  products: Product[];
  inventory: Product[]; // Alias for products (legacy)
  isLoadingProducts: boolean;
  featuredProducts: Product[];
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
  
  // Wishlist
  wishlist: string[];
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  
  // Affiliate
  affiliateCode: string | null;
  setAffiliateCode: (code: string | null) => void;
  affiliateStats: AffiliateStats[];
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'houses_of_medusa_cart';
const WISHLIST_STORAGE_KEY = 'houses_of_medusa_wishlist';
const AFFILIATE_STORAGE_KEY = 'houses_of_medusa_affiliate';

export function ShopProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Affiliate code
  const [affiliateCode, setAffiliateCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AFFILIATE_STORAGE_KEY);
  });
  
  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);
  
  // Persist wishlist to localStorage
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);
  
  // Persist affiliate code
  useEffect(() => {
    if (affiliateCode) {
      localStorage.setItem(AFFILIATE_STORAGE_KEY, affiliateCode);
    } else {
      localStorage.removeItem(AFFILIATE_STORAGE_KEY);
    }
  }, [affiliateCode]);
  
  // Check URL for affiliate code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || params.get('affiliate');
    if (refCode) {
      setAffiliateCode(refCode);
      // Track affiliate click
      fetch(getApiUrl('/api/affiliates/track-click'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: refCode,
          landingPage: window.location.pathname,
        }),
      }).catch(console.error);
    }
  }, []);
  
  // Fetch products from API
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Get featured products
  const featuredProducts = products.filter(p => p.isFeatured);
  
  // Fetch affiliate stats (only for admin)
  const { data: affiliateStats = [] } = useQuery<AffiliateStats[]>({
    queryKey: ["/api/affiliates/stats"],
    enabled: false, // Only fetch when needed
    retry: false,
  });

  // ============================================
  // CART FUNCTIONS
  // ============================================

  const addToCart = (product: Product, variant?: ProductVariant, quantity: number = 1) => {
    setCart((prev) => {
      // Create unique ID for cart item
      const itemId = variant ? `${product.id}-${variant.id}` : product.id;
      
      const existing = prev.find((item) => item.id === itemId);
      
      if (existing) {
        // Update quantity
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      // Calculate price
      const basePrice = parseFloat(product.basePrice || product.price || '0');
      const priceModifier = variant ? parseFloat(variant.priceModifier || '0') : 0;
      const finalPrice = basePrice + priceModifier;
      
      // Get image
      const imageUrl = variant?.imageUrl || 
        product.images?.find(img => img.isPrimary)?.url || 
        product.images?.[0]?.url || 
        product.imageUrl;
      
      const newItem: CartItem = {
        id: itemId,
        productId: product.id,
        variantId: variant?.id || null,
        name: product.name,
        brand: product.brand,
        category: product.category,
        subCategory: product.subCategory,
        price: finalPrice.toString(),
        imageUrl,
        quantity,
        size: variant?.size,
        color: variant?.color,
        sku: variant?.sku,
      };
      
      return [...prev, newItem];
    });
    
    // Track analytics
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
      item_category: product.category,
      item_variant: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : undefined,
      price: parseFloat(product.basePrice || product.price || '0'),
      quantity,
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your shopping bag.`,
    });
  };

  const removeFromCart = (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    
    setCart((prev) => prev.filter((item) => item.id !== itemId));
    
    if (item) {
      trackRemoveFromCart({
        item_id: item.productId,
        item_name: item.name,
        item_brand: item.brand,
        item_category: item.category,
        price: parseFloat(item.price),
        quantity: item.quantity,
      });
    }
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce(
    (total, item) => total + parseFloat(item.price) * item.quantity,
    0
  );
  
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // ============================================
  // WISHLIST FUNCTIONS
  // ============================================

  const addToWishlist = (productId: string) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) return prev;
      return [...prev, productId];
    });
    toast({
      title: "Added to Wishlist",
      description: "Item saved to your wishlist.",
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist((prev) => prev.filter((id) => id !== productId));
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <ShopContext.Provider
      value={{
        products,
        inventory: products, // Legacy alias
        isLoadingProducts,
        featuredProducts,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartItemCount,
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        affiliateCode,
        setAffiliateCode,
        affiliateStats,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}

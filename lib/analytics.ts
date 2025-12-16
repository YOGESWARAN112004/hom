// Google Analytics 4 E-commerce Tracking

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_MEASUREMENT_ID = process.env.VITE_GA_MEASUREMENT_ID || '';

// Initialize GA4
export function initGA() {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  // Add gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll handle page views manually
  });
}

// Helper to check if GA is ready
function isGAReady(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

// ============================================
// PAGE TRACKING
// ============================================

export function trackPageView(pagePath: string, pageTitle?: string) {
  if (!isGAReady()) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });
}

// ============================================
// E-COMMERCE EVENTS
// ============================================

interface ProductItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  currency?: string;
}

// View product list (category page, search results)
export function trackViewItemList(listId: string, listName: string, items: ProductItem[]) {
  if (!isGAReady()) return;

  window.gtag('event', 'view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items: items.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// View single product
export function trackViewItem(item: ProductItem) {
  if (!isGAReady()) return;

  window.gtag('event', 'view_item', {
    currency: item.currency || 'INR',
    value: item.price,
    items: [{
      ...item,
      currency: item.currency || 'INR',
      quantity: item.quantity || 1,
    }],
  });
}

// Select item from list (click on product in listing)
export function trackSelectItem(listId: string, listName: string, item: ProductItem) {
  if (!isGAReady()) return;

  window.gtag('event', 'select_item', {
    item_list_id: listId,
    item_list_name: listName,
    items: [{
      ...item,
      currency: item.currency || 'INR',
    }],
  });
}

// Add to cart
export function trackAddToCart(item: ProductItem) {
  if (!isGAReady()) return;

  window.gtag('event', 'add_to_cart', {
    currency: item.currency || 'INR',
    value: item.price * (item.quantity || 1),
    items: [{
      ...item,
      currency: item.currency || 'INR',
      quantity: item.quantity || 1,
    }],
  });
}

// Remove from cart
export function trackRemoveFromCart(item: ProductItem) {
  if (!isGAReady()) return;

  window.gtag('event', 'remove_from_cart', {
    currency: item.currency || 'INR',
    value: item.price * (item.quantity || 1),
    items: [{
      ...item,
      currency: item.currency || 'INR',
      quantity: item.quantity || 1,
    }],
  });
}

// View cart
export function trackViewCart(items: ProductItem[], value: number) {
  if (!isGAReady()) return;

  window.gtag('event', 'view_cart', {
    currency: 'INR',
    value,
    items: items.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// Begin checkout
export function trackBeginCheckout(items: ProductItem[], value: number, coupon?: string) {
  if (!isGAReady()) return;

  window.gtag('event', 'begin_checkout', {
    currency: 'INR',
    value,
    coupon,
    items: items.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// Add shipping info
export function trackAddShippingInfo(
  items: ProductItem[],
  value: number,
  shippingTier: string,
  coupon?: string
) {
  if (!isGAReady()) return;

  window.gtag('event', 'add_shipping_info', {
    currency: 'INR',
    value,
    coupon,
    shipping_tier: shippingTier,
    items: items.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// Add payment info
export function trackAddPaymentInfo(
  items: ProductItem[],
  value: number,
  paymentType: string,
  coupon?: string
) {
  if (!isGAReady()) return;

  window.gtag('event', 'add_payment_info', {
    currency: 'INR',
    value,
    coupon,
    payment_type: paymentType,
    items: items.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// Purchase completed
export function trackPurchase(
  transactionId: string,
  items: ProductItem[],
  value: number,
  tax: number,
  shipping: number,
  coupon?: string,
  affiliation?: string
) {
  if (!isGAReady()) return;

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    affiliation: affiliation || 'Houses of Medusa',
    value,
    tax,
    shipping,
    currency: 'INR',
    coupon,
    items: items.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// Refund
export function trackRefund(transactionId: string, value?: number, items?: ProductItem[]) {
  if (!isGAReady()) return;

  window.gtag('event', 'refund', {
    transaction_id: transactionId,
    value,
    currency: 'INR',
    items: items?.map((item, index) => ({
      ...item,
      index,
      currency: item.currency || 'INR',
    })),
  });
}

// ============================================
// USER EVENTS
// ============================================

export function trackLogin(method: string) {
  if (!isGAReady()) return;

  window.gtag('event', 'login', {
    method,
  });
}

export function trackSignUp(method: string) {
  if (!isGAReady()) return;

  window.gtag('event', 'sign_up', {
    method,
  });
}

// ============================================
// ENGAGEMENT EVENTS
// ============================================

export function trackSearch(searchTerm: string) {
  if (!isGAReady()) return;

  window.gtag('event', 'search', {
    search_term: searchTerm,
  });
}

export function trackShare(method: string, contentType: string, itemId: string) {
  if (!isGAReady()) return;

  window.gtag('event', 'share', {
    method,
    content_type: contentType,
    item_id: itemId,
  });
}

export function trackAddToWishlist(item: ProductItem) {
  if (!isGAReady()) return;

  window.gtag('event', 'add_to_wishlist', {
    currency: item.currency || 'INR',
    value: item.price,
    items: [{
      ...item,
      currency: item.currency || 'INR',
    }],
  });
}

// ============================================
// CUSTOM EVENTS
// ============================================

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!isGAReady()) return;

  window.gtag('event', eventName, params);
}

// Set user properties
export function setUserProperties(properties: Record<string, any>) {
  if (!isGAReady()) return;

  window.gtag('set', 'user_properties', properties);
}

// Set user ID for cross-device tracking
export function setUserId(userId: string | null) {
  if (!isGAReady()) return;

  if (userId) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      user_id: userId,
    });
  }
}


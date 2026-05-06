/**
 * Google Analytics 4 (gtag) utilities
 * Used for tracking ecommerce events: product views, add-to-cart, purchases, etc.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Track a page view (called on every client-side navigation)
 */
export const pageview = (url: string): void => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "page_view", {
      page_path: url,
      page_title: document.title,
    });
  }
};

/**
 * Track a generic ecommerce or custom event
 * @param action Event name (e.g., "add_to_cart", "purchase")
 * @param params Event data (items, value, currency, etc.)
 */
export const event = (
  action: string,
  params: Record<string, any> = {}
): void => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, params);
  }
};

/**
 * Convenience: Track product view
 */
export const trackProductView = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}): void => {
  event("view_item", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category || "uncategorized",
      },
    ],
  });
};

/**
 * Convenience: Track add to cart
 */
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}): void => {
  event("add_to_cart", {
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });
};

/**
 * Convenience: Track checkout started
 */
export const trackCheckoutStarted = (cartValue: number, itemCount: number): void => {
  event("begin_checkout", {
    value: cartValue,
    currency: "INR",
    items: itemCount,
  });
};

/**
 * Convenience: Track purchase completed
 */
export const trackPurchaseCompleted = (order: {
  order_id: string;
  value: number;
  items: number;
  currency?: string;
}): void => {
  event("purchase", {
    order_id: order.order_id,
    value: order.value,
    currency: order.currency || "INR",
    items: order.items,
  });
};

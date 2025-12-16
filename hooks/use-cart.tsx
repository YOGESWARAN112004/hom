
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "./use-toast";

export type CartItem = {
    productId: string;
    variantId?: string;
    name: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    imageUrl?: string;
    description?: string;
    sku?: string;
};

type CartStore = {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;

    // Subtotal helper
    getSubtotal: () => number;
};

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (item) => {
                const currentItems = get().items;
                const existingItem = currentItems.find(
                    (i) => i.productId === item.productId && i.variantId === item.variantId
                );

                if (existingItem) {
                    set({
                        items: currentItems.map((i) =>
                            i.productId === item.productId && i.variantId === item.variantId
                                ? { ...i, quantity: i.quantity + item.quantity }
                                : i
                        ),
                    });
                } else {
                    set({ items: [...currentItems, item] });
                }
                toast({ title: "Added to cart", description: `${item.name} added to your cart.` });
            },
            removeItem: (productId, variantId) => {
                set({
                    items: get().items.filter(
                        (i) => !(i.productId === productId && i.variantId === variantId)
                    ),
                });
                toast({ title: "Removed from cart", description: "Item removed from your cart." });
            },
            updateQuantity: (productId, quantity, variantId) => {
                if (quantity < 1) return;
                set({
                    items: get().items.map((i) =>
                        i.productId === productId && i.variantId === variantId
                            ? { ...i, quantity }
                            : i
                    ),
                });
            },
            clearCart: () => set({ items: [] }),
            getSubtotal: () => {
                return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
            },
        }),
        {
            name: "shopping-cart-storage",
        }
    )
);

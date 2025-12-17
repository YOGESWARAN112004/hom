import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { createRazorpayOrder } from "@/lib/razorpay";
import { insertOrderSchema } from "@shared/schema";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
        }

        // If admin, can fetch all orders (maybe with pagination/filter)
        // If user, fetch only their orders
        let orders;
        if (payload.role === 'admin') {
            orders = await storage.getOrders(); // Need to implement getOrders() or similar in storage if not exists. 
            // storage.ts has getOrders() which returns all orders.
        } else {
            orders = await storage.getOrdersByUserId(payload.userId);
        }

        return NextResponse.json(orders);
    } catch (error) {
        console.error("Get orders error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
        }

        const body = await req.json();

        // Validate shipping address
        if (!body.shippingAddress) {
            return NextResponse.json({ success: false, message: "Shipping address is required" }, { status: 400 });
        }

        const cartItems = await storage.getCartItems(payload.userId);
        if (cartItems.length === 0) {
            return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
        }

        // Calculate totals
        let subtotal = 0;
        const orderItemsData = [];

        for (const item of cartItems) {
            // Get base price from product
            let itemPrice = parseFloat(item.product.basePrice);
            
            // Adjust price if variant has price modifier
            if (item.variant && item.variant.priceModifier) {
                const modifier = parseFloat(item.variant.priceModifier);
                itemPrice = itemPrice + modifier; // Price modifier can be positive or negative
            }

            subtotal += itemPrice * item.quantity;

            orderItemsData.push({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                unitPrice: itemPrice.toString(),
                totalPrice: (itemPrice * item.quantity).toString(),
                productName: item.product.name,
                productSku: item.product.sku || null,
                variantSize: item.variant?.size || null,
                variantColor: item.variant?.color || null,
                productImageUrl: item.product.imageUrl || null,
            });
        }

        // Calculate shipping cost
        const shippingCost = subtotal > 10000 ? 0 : 500;
        
        // Validate and apply coupon discount if provided
        let discountAmount = 0;
        if (body.couponCode) {
            const couponValidation = await storage.validateCoupon(body.couponCode, subtotal + shippingCost);
            if (couponValidation.valid) {
                discountAmount = couponValidation.discount;
            } else {
                return NextResponse.json({ 
                    success: false, 
                    message: couponValidation.message || "Invalid coupon code" 
                }, { status: 400 });
            }
        }

        // Calculate tax (assuming 0% for now, can be configured later)
        const taxAmount = 0;
        
        // Calculate final total
        const totalAmount = Math.max(0, subtotal + shippingCost + taxAmount - discountAmount);

        // Create Order in DB
        const orderData = {
            userId: payload.userId,
            orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            subtotal: subtotal.toString(),
            shippingCost: shippingCost.toString(),
            taxAmount: taxAmount.toString(),
            discountAmount: discountAmount.toString(),
            totalAmount: totalAmount.toString(),
            status: 'pending',
            paymentMethod: body.paymentMethod || 'razorpay',
            shippingAddress: body.shippingAddress,
            billingAddress: body.billingAddress || body.shippingAddress,
        };

        // Create order in database
        const order = await storage.createOrder(orderData as any, orderItemsData as any);

        // Increment coupon usage if coupon was applied
        if (body.couponCode && discountAmount > 0) {
            const coupon = await storage.getCoupon(body.couponCode);
            if (coupon) {
                await storage.incrementCouponUsage(coupon.id);
            }
        }

        // Note: Razorpay order creation is now handled in /api/payments/create-order
        // This endpoint just creates the order in pending state
        
        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Create order error:", error);
        
        // Return more specific error messages
        if (error.message) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

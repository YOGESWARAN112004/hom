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

        // Validate shipping address fields
        const requiredFields = ['fullName', 'address', 'city', 'state', 'zipCode', 'phone', 'email'];
        const missingFields = requiredFields.filter(field => !body.shippingAddress[field]);
        if (missingFields.length > 0) {
            return NextResponse.json({ 
                success: false, 
                message: `Missing required shipping fields: ${missingFields.join(', ')}` 
            }, { status: 400 });
        }

        const cartItems = await storage.getCartItems(payload.userId);
        if (cartItems.length === 0) {
            return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
        }

        // Calculate totals
        let subtotal = 0;
        const orderItemsData = [];

        for (const item of cartItems) {
            // Validate product exists
            if (!item.product) {
                console.error(`Product not found for cart item: ${item.productId}`);
                return NextResponse.json({ 
                    success: false, 
                    message: `Product not found for item in cart` 
                }, { status: 400 });
            }

            // Get base price from product
            const basePrice = item.product.basePrice;
            if (!basePrice) {
                console.error(`Product ${item.productId} has no base price`);
                return NextResponse.json({ 
                    success: false, 
                    message: `Product ${item.product?.name || item.productId} has no price` 
                }, { status: 400 });
            }

            let itemPrice = parseFloat(basePrice);
            if (isNaN(itemPrice)) {
                console.error(`Invalid price for product ${item.productId}: ${basePrice}`);
                return NextResponse.json({ 
                    success: false, 
                    message: `Invalid price for product ${item.product?.name || item.productId}` 
                }, { status: 400 });
            }
            
            // Adjust price if variant has price modifier
            if (item.variant && item.variant.priceModifier) {
                const modifier = parseFloat(item.variant.priceModifier);
                if (!isNaN(modifier)) {
                    itemPrice = itemPrice + modifier; // Price modifier can be positive or negative
                }
            }

            if (item.quantity <= 0) {
                console.error(`Invalid quantity for product ${item.productId}: ${item.quantity}`);
                return NextResponse.json({ 
                    success: false, 
                    message: `Invalid quantity for product ${item.product?.name || item.productId}` 
                }, { status: 400 });
            }

            subtotal += itemPrice * item.quantity;

            orderItemsData.push({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                unitPrice: itemPrice.toString(),
                totalPrice: (itemPrice * item.quantity).toString(),
                productName: item.product.name || 'Unknown Product',
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
        try {
            const order = await storage.createOrder(orderData as any, orderItemsData as any);

            // Increment coupon usage if coupon was applied
            if (body.couponCode && discountAmount > 0) {
                try {
                    const coupon = await storage.getCoupon(body.couponCode);
                    if (coupon) {
                        await storage.incrementCouponUsage(coupon.id);
                    }
                } catch (couponError) {
                    console.error("Error incrementing coupon usage:", couponError);
                    // Don't fail the order if coupon increment fails
                }
            }

            // Note: Razorpay order creation is now handled in /api/payments/create-order
            // This endpoint just creates the order in pending state
            
            return NextResponse.json(order);
        } catch (dbError: any) {
            console.error("Database error creating order:", dbError);
            console.error("Order data:", JSON.stringify(orderData, null, 2));
            console.error("Order items:", JSON.stringify(orderItemsData, null, 2));
            
            // Check for specific database errors
            if (dbError.message?.includes('violates') || dbError.message?.includes('constraint')) {
                return NextResponse.json(
                    { success: false, message: "Database constraint error. Please check order data." },
                    { status: 400 }
                );
            }
            
            throw dbError; // Re-throw to be caught by outer catch
        }
    } catch (error: any) {
        console.error("Create order error:", error);
        console.error("Error stack:", error?.stack);
        console.error("Error details:", {
            message: error?.message,
            name: error?.name,
            code: error?.code,
        });
        
        // Return more specific error messages
        let errorMessage = "An internal server error occurred";
        let statusCode = 500;
        
        if (error.message) {
            errorMessage = error.message;
            // If it's a validation or client error, use 400
            if (error.message.includes('required') || 
                error.message.includes('invalid') || 
                error.message.includes('missing') ||
                error.message.includes('empty')) {
                statusCode = 400;
            }
        }
        
        return NextResponse.json(
            { success: false, message: errorMessage },
            { status: statusCode }
        );
    }
}

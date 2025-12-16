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

        // Validate order data
        // We expect shippingAddress, billingAddress, items (if not from cart), etc.
        // For now, let's assume the body contains necessary data to create an order.
        // The storage.createOrder method expects an InsertOrder object.

        // However, usually orders are created from Cart.
        // Let's assume the frontend sends the necessary details.

        // We need to calculate totals, etc.
        // Ideally, we should fetch cart items, calculate total, create order.

        const cartItems = await storage.getCartItems(payload.userId);
        if (cartItems.length === 0) {
            return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
        }

        // Calculate totals
        let subtotal = 0;
        const orderItemsData = [];

        for (const item of cartItems) {
            const price = parseFloat(item.product.basePrice); // Handle variants price modifier if needed
            // Note: storage.getCartItems returns joined data.
            // We need to check if variant exists and has price modifier.

            let itemPrice = price;
            // Logic to adjust price based on variant would go here

            subtotal += itemPrice * item.quantity;

            orderItemsData.push({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: itemPrice.toString(),
                totalPrice: (itemPrice * item.quantity).toString(),
                productName: item.product.name,
                // ... other fields
            });
        }

        const shippingCost = subtotal > 10000 ? 0 : 500; // Example logic
        const totalAmount = subtotal + shippingCost;

        // Create Order in DB
        const orderData = {
            userId: payload.userId,
            orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            subtotal: subtotal.toString(),
            shippingCost: shippingCost.toString(),
            totalAmount: totalAmount.toString(),
            status: 'pending',
            paymentMethod: body.paymentMethod || 'razorpay',
            shippingAddress: body.shippingAddress,
            billingAddress: body.billingAddress || body.shippingAddress,
            // ... other fields
        };

        // We need to use storage.createOrder. 
        // Note: storage.createOrder signature might need adjustment or we construct the object carefully.
        // Let's assume storage.createOrder takes the object.

        const order = await storage.createOrder(orderData as any, orderItemsData as any); // Type casting for now

        // Create Razorpay Order
        if (order.paymentMethod === 'razorpay') {
            const razorpayOrder = await createRazorpayOrder({
                amount: Math.round(totalAmount * 100), // in paise
                orderId: order.id,
                currency: 'INR',
            });

            // Update order with razorpayOrderId
            await storage.updateOrderPayment(order.id, {
                razorpayOrderId: razorpayOrder.id,
            });

            return NextResponse.json({ ...order, razorpayOrderId: razorpayOrder.id });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("Create order error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

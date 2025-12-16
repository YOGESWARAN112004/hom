
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

// Dynamic import
const getPaymentLib = async () => {
    try {
        return await import("@/lib/razorpay");
    } catch (e) {
        return null;
    }
};

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }

        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
        }

        const paymentLib = await getPaymentLib();
        if (!paymentLib || !paymentLib.isRazorpayConfigured()) {
            return NextResponse.json({ message: "Payment gateway not configured" }, { status: 503 });
        }

        const order = await storage.getOrder(orderId);
        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        if (order.userId !== payload.userId) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        if (order.paymentStatus === 'paid') {
            return NextResponse.json({ message: "Order already paid" }, { status: 400 });
        }

        const amountInPaise = Math.round(parseFloat(order.totalAmount) * 100);
        const razorpayOrder = await paymentLib.createRazorpayOrder({
            amount: amountInPaise,
            orderId: order.id,
            notes: {
                order_number: order.orderNumber,
            },
        });

        return NextResponse.json({
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: paymentLib.getRazorpayKeyId(),
        });

    } catch (error) {
        console.error("Create payment order error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to create payment order" },
            { status: 500 }
        );
    }
}

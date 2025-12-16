
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

        const body = await req.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId,
        } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
            return NextResponse.json({ success: false, message: "Missing payment details" }, { status: 400 });
        }

        const paymentLib = await getPaymentLib();
        if (!paymentLib) {
            return NextResponse.json({ message: "Payment library missing" }, { status: 500 });
        }

        const isValid = paymentLib.verifyPaymentSignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        if (!isValid) {
            await paymentLib.handlePaymentFailure(orderId, 'Invalid signature');
            return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
        }

        const result = await paymentLib.handlePaymentSuccess(orderId, razorpay_payment_id, razorpay_signature);

        if (result.success) {
            const order = await storage.getOrder(orderId);
            return NextResponse.json({ success: true, order });
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error) {
        console.error("Payment verify error:", error);
        return NextResponse.json(
            { success: false, message: "Payment verification failed" },
            { status: 500 }
        );
    }
}

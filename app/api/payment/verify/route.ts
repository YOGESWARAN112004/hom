import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature, handlePaymentSuccess } from "@/lib/razorpay";
import { storage } from "@/lib/storage";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json(
                { success: false, message: "Missing payment details" },
                { status: 400 }
            );
        }

        const isValid = verifyPaymentSignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        if (!isValid) {
            return NextResponse.json(
                { success: false, message: "Invalid payment signature" },
                { status: 400 }
            );
        }

        // If orderId is not provided, try to find it using razorpay_order_id
        // But handlePaymentSuccess expects our internal orderId.
        // We should pass internal orderId from frontend.

        let internalOrderId = orderId;
        if (!internalOrderId) {
            // Try to find order by razorpay_order_id
            // We need a method in storage for this, or just fail if not provided.
            // For now, let's assume frontend sends it.
            return NextResponse.json(
                { success: false, message: "Order ID is required" },
                { status: 400 }
            );
        }

        const result = await handlePaymentSuccess(internalOrderId, razorpay_payment_id, razorpay_signature);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: "Payment verified successfully" });
    } catch (error) {
        console.error("Payment verification error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

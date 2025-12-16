
import { NextRequest, NextResponse } from "next/server";
// Dynamic import to avoid build errors if lib/payment is missing
const getPaymentLib = async () => {
    try {
        return await import("@/lib/razorpay");
    } catch (e) {
        return null;
    }
};

export async function GET(req: NextRequest) {
    try {
        const paymentLib = await getPaymentLib();

        if (!paymentLib) {
            // Fallback if lib missing
            return NextResponse.json({
                configured: false,
                keyId: process.env.RAZORPAY_KEY_ID
            });
        }

        return NextResponse.json({
            configured: paymentLib.isRazorpayConfigured(),
            keyId: paymentLib.getRazorpayKeyId(),
        });

    } catch (error) {
        console.error("Payment config error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch payment config" },
            { status: 500 }
        );
    }
}

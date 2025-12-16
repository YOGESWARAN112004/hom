
import { NextRequest, NextResponse } from "next/server";

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
        const signature = req.headers.get("x-razorpay-signature");
        const body = await req.json();
        const bodyString = JSON.stringify(body);

        const paymentLib = await getPaymentLib();
        if (!paymentLib) {
            return NextResponse.json({ message: "Payment library missing" }, { status: 500 });
        }

        if (signature && !paymentLib.verifyWebhookSignature(bodyString, signature)) {
            console.warn("Invalid webhook signature");
            return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
        }

        await paymentLib.processWebhookEvent(body);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { success: false, message: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, processWebhookEvent } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get("x-razorpay-signature");

        if (!signature) {
            return NextResponse.json(
                { message: "Missing signature" },
                { status: 400 }
            );
        }

        const body = await req.text();

        const isValid = verifyWebhookSignature(body, signature);

        if (!isValid) {
            return NextResponse.json(
                { message: "Invalid signature" },
                { status: 400 }
            );
        }

        const event = JSON.parse(body);
        await processWebhookEvent(event);

        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}


import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(req: NextRequest) {
    try {
        const { code, orderAmount } = await req.json();

        if (!code || !orderAmount) {
            return NextResponse.json({ message: "Code and order amount are required" }, { status: 400 });
        }

        const result = await storage.validateCoupon(code, orderAmount);
        return NextResponse.json(result);

    } catch (error) {
        console.error("Coupon validation error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to validate coupon" },
            { status: 500 }
        );
    }
}

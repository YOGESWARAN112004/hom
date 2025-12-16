import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

        await storage.clearCart(payload.userId);
        return NextResponse.json({ success: true, message: "Cart cleared successfully" });
    } catch (error) {
        console.error("Clear cart error:", error);
        return NextResponse.json(
            { success: false, message: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

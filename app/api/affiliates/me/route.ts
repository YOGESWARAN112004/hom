
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        const payload = await verifyToken(token);

        if (!payload) {
            return NextResponse.json(
                { success: false, message: "Invalid token" },
                { status: 401 }
            );
        }

        const userId = payload.userId;
        const affiliate = await storage.getAffiliateByUserId(userId);

        if (!affiliate) {
            return NextResponse.json(
                { success: false, message: "Affiliate account not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(affiliate);

    } catch (error) {
        console.error("Get affiliate error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch affiliate details" },
            { status: 500 }
        );
    }
}

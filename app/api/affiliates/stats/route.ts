
import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
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

        const allStats = await storage.getAffiliateStats();
        const myStats = allStats.find(s => s.id === affiliate.id);

        return NextResponse.json({
            ...affiliate,
            stats: myStats || { traffic: 0, sales: 0, conversionRate: 0, revenue: '0' }
        });

    } catch (error) {
        console.error("Get affiliate stats error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch affiliate stats" },
            { status: 500 }
        );
    }
}

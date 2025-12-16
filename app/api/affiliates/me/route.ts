
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateClicks, orders } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

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

        // Get Stats
        // 1. Clicks
        const [clickStats] = await db
            .select({ count: sql<number>`count(*)` })
            .from(affiliateClicks)
            .where(eq(affiliateClicks.affiliateId, affiliate.id));

        // 2. Orders (Sales)
        const [orderStats] = await db
            .select({ count: sql<number>`count(*)` })
            .from(orders)
            .where(and(
                eq(orders.affiliateId, affiliate.id),
                eq(orders.paymentStatus, 'paid') // Only count paid orders as sales
            ));

        return NextResponse.json({
            ...affiliate,
            clicks: Number(clickStats?.count || 0),
            sales: Number(orderStats?.count || 0),
        });

    } catch (error) {
        console.error("Get affiliate error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch affiliate details" },
            { status: 500 }
        );
    }
}


import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
        }

        const searchParams = req.nextUrl.searchParams;
        const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate") as string) : undefined;
        const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate") as string) : undefined;

        // Note: storage.getAnalytics might need to be implemented or verified in storage.ts
        // Based on legacy code, it should exist.
        const analytics = await storage.getAnalytics(startDate, endDate);

        return NextResponse.json(analytics);

    } catch (error) {
        console.error("Admin analytics error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}

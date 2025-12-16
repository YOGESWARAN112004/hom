
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

        const pending = await storage.getPendingAffiliates();

        // Enrich with user data (legacy logic)
        const enriched = await Promise.all(pending.map(async (affiliate) => {
            const affUser = await storage.getUser(affiliate.userId);
            return {
                ...affiliate,
                user: affUser ? {
                    id: affUser.id,
                    email: affUser.email,
                    firstName: affUser.firstName,
                    lastName: affUser.lastName,
                } : null,
            };
        }));

        return NextResponse.json(enriched);

    } catch (error) {
        console.error("Fetch pending affiliates error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch pending affiliates" },
            { status: 500 }
        );
    }
}

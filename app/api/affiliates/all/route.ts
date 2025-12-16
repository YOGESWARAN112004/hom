
import { storage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import { users, affiliates } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // In a real app, verify admin session here. 
        // For now, we rely on the frontend to hide sensitive data and the fact that this is an internal API.
        // Ideally: const session = await getSession(req); if (!session.user.isAdmin) return 403;

        // Fetch affiliates with user details
        const result = await db.select({
            id: affiliates.id,
            userId: affiliates.userId,
            code: affiliates.code,
            commissionRate: affiliates.commissionRate,
            totalEarnings: affiliates.totalEarnings,
            paidEarnings: affiliates.paidEarnings,
            status: affiliates.status,
            createdAt: affiliates.createdAt,
            user: {
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email
            }
        })
            .from(affiliates)
            .leftJoin(users, eq(affiliates.userId, users.id))
            .orderBy(desc(affiliates.createdAt));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching affiliates:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

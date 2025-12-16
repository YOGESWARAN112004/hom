
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertAffiliateSchema } from "@shared/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
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
        const body = await req.json();

        // Check if user already has an application
        const existing = await storage.getAffiliateByUserId(userId);
        if (existing) {
            return NextResponse.json(
                { success: false, message: "You have already applied or are an affiliate" },
                { status: 400 }
            );
        }

        const affiliateData = insertAffiliateSchema.parse({
            ...body,
            userId,
            status: 'pending',
            earnings: '0',
            commissionRate: '10', // Default 10%
        });

        const affiliate = await storage.createAffiliate(affiliateData);

        return NextResponse.json({
            success: true,
            message: 'Affiliate application submitted successfully. Pending admin approval.',
            affiliate,
        }, { status: 201 });

    } catch (error) {
        console.error("Affiliate application error:", error);
        // Zod error handling could be improved here similar to legacy
        if ((error as any).name === 'ZodError') {
            return NextResponse.json({ success: false, message: "Invalid input", errors: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json(
            { success: false, message: "Failed to submit affiliate application" },
            { status: 500 }
        );
    }
}

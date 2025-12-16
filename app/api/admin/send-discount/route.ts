
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { sendExclusiveDiscountEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
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

        const { userEmail, discountPercent, expiresInDays, code } = await req.json();

        if (!userEmail || !discountPercent) {
            return NextResponse.json({ message: "User email and discount percent are required" }, { status: 400 });
        }

        // Note: storage.getUserByEmail might need to be verified or created if missing from interface
        // Checking legacy route usage from server/routes.ts line 1684, it uses storage.getUserByEmail
        let targetUser = await storage.getUserByEmail(userEmail);

        if (!targetUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const couponCode = code || `EXCL${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

        await storage.createCoupon({
            code: couponCode,
            discountType: 'percentage',
            discountValue: discountPercent.toString(),
            minOrderAmount: '0',
            usageLimit: 1,
            usedCount: 0,
            isActive: true,
            startDate: new Date(),
            endDate: expiresAt,
        });

        const expiresText = expiresInDays === 1 ? 'in 24 hours' : `in ${expiresInDays || 7} days`;

        // This function needs to be imported from lib/email
        await sendExclusiveDiscountEmail(
            targetUser.email,
            couponCode,
            discountPercent,
            expiresText,
            targetUser.firstName || undefined
        );

        return NextResponse.json({
            success: true,
            message: `Exclusive ${discountPercent}% discount sent to ${userEmail}`,
            couponCode
        });

    } catch (error) {
        console.error("Send discount error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to send exclusive discount" },
            { status: 500 }
        );
    }
}

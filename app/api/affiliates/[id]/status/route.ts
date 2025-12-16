
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { status, rejectionReason } = await req.json();

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const [updated] = await db.update(affiliates)
            .set({
                status: status as any,
                rejectionReason: rejectionReason || null,
                approvedAt: status === 'approved' ? new Date() : null,
                isActive: status === 'approved'
            })
            .where(eq(affiliates.id, params.id))
            .returning();

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating affiliate status:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

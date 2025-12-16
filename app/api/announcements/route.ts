
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(req: NextRequest) {
    try {
        const announcements = await storage.getActiveAnnouncements();
        return NextResponse.json(announcements);
    } catch (error) {
        console.error("Fetch announcements error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch announcements" },
            { status: 500 }
        );
    }
}

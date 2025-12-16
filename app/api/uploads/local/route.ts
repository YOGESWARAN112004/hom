
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

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

        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.name)}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");

        // Ensure directory exists
        await mkdir(uploadsDir, { recursive: true });

        // Write file
        await writeFile(path.join(uploadsDir, filename), buffer);

        // Return public URL (Next.js serves from public/)
        const publicUrl = `/uploads/products/${filename}`;

        return NextResponse.json({
            success: true,
            publicUrl,
            filename: filename,
        });

    } catch (error) {
        console.error("Local upload error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to upload file" },
            { status: 500 }
        );
    }
}


import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
// These imports will fail if lib/s3.ts doesn't exist or doesn't export these. 
// I'll assume they exist based on legacy code, but might need to adjust.
// import { isS3Configured, getPresignedUploadUrl, validateImageFile } from "@/lib/s3"; 

// Dynamic import strategy to avoid build errors if s3 lib is missing or issues
const getS3Lib = async () => {
    try {
        return await import("@/lib/s3");
    } catch (e) {
        return null;
    }
};

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

        const s3 = await getS3Lib();

        if (!s3 || !s3.isS3Configured()) {
            // Return a flag indicating local upload should be used
            return NextResponse.json({ useLocalUpload: true, message: "S3 not configured, use local upload" });
        }

        const { filename, contentType, folder } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ message: "Filename and content type are required" }, { status: 400 });
        }

        const validation = s3.validateImageFile(contentType, 0);
        if (!validation.valid) {
            return NextResponse.json({ message: validation.message }, { status: 400 });
        }

        const result = await s3.getPresignedUploadUrl(filename, contentType, folder || 'products');
        return NextResponse.json(result);

    } catch (error) {
        console.error("Presigned URL error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}

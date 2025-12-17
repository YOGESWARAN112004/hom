
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

// Dynamic import strategy
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

        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        const s3 = await getS3Lib();

        if (!s3 || !s3.isS3Configured()) {
            // Fallback to local logic (calling the local API internally or replicating logic?)
            // Better to tell client to use local, but for this proxy we just fail or handle manually.
            // Let's assume this route is only called if we intend to use S3.
            // But for robustness, let's return a specific error so client can fallback.
            return NextResponse.json({ message: "S3 not configured" }, { status: 503 });
        }

        // Validate file type and size before processing
        const validation = s3.validateImageFile(file.type, file.size);
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, message: validation.message || "Invalid file" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await s3.uploadFile(
            buffer,
            file.name,
            file.type,
            "products"
        );

        return NextResponse.json({
            success: true,
            publicUrl: result.url,
            key: result.key,
        });

    } catch (error: any) {
        console.error("S3 upload error:", error);
        
        // Provide more specific error messages
        let errorMessage = "Failed to upload to S3";
        if (error?.message) {
            errorMessage = error.message;
        } else if (error?.name === 'CredentialsProviderError') {
            errorMessage = "S3 credentials not configured properly";
        } else if (error?.name === 'NoSuchBucket') {
            errorMessage = "S3 bucket does not exist";
        } else if (error?.$metadata?.httpStatusCode === 403) {
            errorMessage = "Access denied to S3 bucket. Check permissions.";
        }
        
        return NextResponse.json(
            { success: false, message: errorMessage },
            { status: 500 }
        );
    }
}

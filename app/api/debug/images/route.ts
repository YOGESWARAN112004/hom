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

        // Get a sample product with images
        const products = await storage.getProducts({ limit: 5 });
        
        const diagnostics = products.map((product: any) => ({
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            images: product.images?.map((img: any) => ({
                id: img.id,
                url: img.url,
                isPrimary: img.isPrimary,
                sortOrder: img.sortOrder,
                urlStartsWith: img.url?.substring(0, 50) || 'null',
                isAbsolute: img.url?.startsWith('http://') || img.url?.startsWith('https://'),
            })) || [],
            imagesCount: product.images?.length || 0,
        }));

        return NextResponse.json({
            totalProducts: products.length,
            diagnostics,
            s3Config: {
                bucket: process.env.AWS_S3_BUCKET,
                region: process.env.AWS_REGION,
                hasCloudFront: !!process.env.CLOUDFRONT_URL,
                cloudFrontUrl: process.env.CLOUDFRONT_URL || 'Not configured',
            }
        });
    } catch (error: any) {
        console.error("Image diagnostics error:", error);
        return NextResponse.json(
            { 
                success: false, 
                message: error?.message || "Failed to fetch diagnostics",
                error: error?.stack 
            },
            { status: 500 }
        );
    }
}


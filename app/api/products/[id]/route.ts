
import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const product = await storage.getProduct(id);

        if (!product) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }
        return NextResponse.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { message: "Failed to fetch product" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

        const { id } = await params;
        const body = await req.json();
        const { images, ...updateData } = body;

        // Separate variants logic if handled separately, but here we update the main product
        // Note: storage.updateProduct might need to handle partial updates
        const product = await storage.updateProduct(id, updateData);

        if (!product) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        // Handle Images Update
        if (images && Array.isArray(images)) {
            // Get existing images
            const existingImages = await storage.getProductImages(id);
            const existingUrls = existingImages.map(img => img.url);

            // 1. Add new images
            for (let i = 0; i < images.length; i++) {
                const url = images[i];
                if (!existingUrls.includes(url)) {
                    await storage.addProductImage({
                        productId: id,
                        url: url,
                        sortOrder: i,
                        isPrimary: url === updateData.imageUrl
                    });
                } else {
                    // Update sort order or primary status for existing
                    const existing = existingImages.find(img => img.url === url);
                    if (existing) {
                        // We can update the order/primary status here if we had an update method
                        // For now, let's just ensuring primary status is correct if it matches
                        if (url === updateData.imageUrl && !existing.isPrimary) {
                            await storage.setPrimaryImage(id, existing.id);
                        }
                    }
                }
            }

            // 2. Remove deleted images
            for (const existing of existingImages) {
                if (!images.includes(existing.url)) {
                    await storage.deleteProductImage(existing.id);
                }
            }
        }

        return NextResponse.json(product);

    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json(
            { success: false, message: "Failed to update product" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

        const { id } = await params;
        await storage.deleteProduct(id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json(
            { success: false, message: "Failed to delete product" },
            { status: 500 }
        );
    }
}


import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { deleteFile } from "@/lib/s3";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const product = await storage.getProduct(id);

        if (!product) {
            return NextResponse.json({ message: "Product not found" }, { status: 404 });
        }

        // Debug: Log product images
        // getProduct returns Product with images/variants added, but TypeScript doesn't know
        const productWithRelations = product as typeof product & { images?: any[]; variants?: any[] };
        console.log('Product images for', id, ':', {
            imageUrl: product.imageUrl,
            images: productWithRelations.images,
            imagesCount: productWithRelations.images?.length || 0
        });

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
            let primaryImageUrl = updateData.imageUrl;

            // 1. Add new images
            for (let i = 0; i < images.length; i++) {
                const url = images[i];
                // Ensure URL is absolute
                const absoluteUrl = url.startsWith('http://') || url.startsWith('https://')
                    ? url
                    : url;
                
                const isPrimary = absoluteUrl === updateData.imageUrl || (i === 0 && !updateData.imageUrl && !primaryImageUrl);
                
                if (!existingUrls.includes(absoluteUrl)) {
                    await storage.addProductImage({
                        productId: id,
                        url: absoluteUrl,
                        sortOrder: i,
                        isPrimary: isPrimary
                    });
                } else {
                    // Update sort order or primary status for existing
                    const existing = existingImages.find(img => img.url === absoluteUrl);
                    if (existing) {
                        // Update primary status if needed
                        if (isPrimary && !existing.isPrimary) {
                            await storage.setPrimaryImage(id, existing.id);
                        }
                        // Update sort order if changed
                        if (existing.sortOrder !== i) {
                            await storage.updateProductImage(existing.id, { sortOrder: i });
                        }
                    }
                }
                
                // Track primary image URL
                if (isPrimary && !primaryImageUrl) {
                    primaryImageUrl = absoluteUrl;
                }
            }

            // 2. Remove deleted images and clean up S3 files
            for (const existing of existingImages) {
                if (!images.includes(existing.url)) {
                    // Delete from S3 before removing from database
                    try {
                        await deleteFile(existing.url);
                    } catch (error) {
                        console.error(`Failed to delete S3 file ${existing.url}:`, error);
                        // Continue with database deletion even if S3 deletion fails
                    }
                    await storage.deleteProductImage(existing.id);
                }
            }
            
            // 3. Update product imageUrl to match primary image if needed
            if (primaryImageUrl && primaryImageUrl !== product.imageUrl) {
                await storage.updateProduct(id, { imageUrl: primaryImageUrl });
            } else if (images.length > 0 && !primaryImageUrl) {
                // If no primary set but images exist, set first one as primary
                const firstImage = images[0];
                const absoluteFirstUrl = firstImage.startsWith('http://') || firstImage.startsWith('https://')
                    ? firstImage
                    : firstImage;
                await storage.updateProduct(id, { imageUrl: absoluteFirstUrl });
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
        
        // Get product images before deletion to clean up S3 files
        const productImages = await storage.getProductImages(id);
        
        // Delete product (this will cascade delete images due to foreign key)
        await storage.deleteProduct(id);
        
        // Clean up S3 files for all product images
        for (const image of productImages) {
            try {
                await deleteFile(image.url);
            } catch (error) {
                console.error(`Failed to delete S3 file ${image.url}:`, error);
                // Continue with other deletions even if one fails
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json(
            { success: false, message: "Failed to delete product" },
            { status: 500 }
        );
    }
}

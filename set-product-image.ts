
import * as dotenv from "dotenv";
dotenv.config();

import { db } from "./lib/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

async function setProductImages() {
    try {
        console.log("Setting placeholder image for products...");

        // Update all products to have a placeholder image
        const result = await db.update(products)
            .set({
                imageUrl: "/assets/generated_images/coach_style_leather_handbag_craftsmanship.png"
            })
            .returning();

        console.log(`Updated ${result.length} products with placeholder image.`);
        process.exit(0);
    } catch (error) {
        console.error("Error updating products:", error);
        process.exit(1);
    }
}

setProductImages();

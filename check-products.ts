
import * as dotenv from "dotenv";
dotenv.config();

import { storage } from "./lib/storage";

async function checkProducts() {
    try {
        console.log("Fetching products to check relations...");
        const productsNoUser = await storage.getProducts({ limit: 1 });
        console.log(`Success! Got ${productsNoUser.length} products.`);

        if (productsNoUser.length > 0) {
            // Cast to any to access relations without strict type checking for this script
            const p = productsNoUser[0] as any;
            console.log("Sample product relations:");
            console.log(`- Images count: ${p.images?.length ?? 'undefined'}`);
            console.log(`- Variants count: ${p.variants?.length ?? 'undefined'}`);
            console.log(`- Image URL: ${p.imageUrl}`);

            // Also check singular getProduct
            console.log("Fetching single product...");
            const singleP = await storage.getProduct(p.id) as any;
            console.log("Single product relations:");
            console.log(`- Images count: ${singleP?.images?.length ?? 'undefined'}`);
            console.log(`- Variants count: ${singleP?.variants?.length ?? 'undefined'}`);
        }

        console.log("Check DONE.");
        process.exit(0);
    } catch (error) {
        console.error("Error fetching products:", error);
        process.exit(1);
    }
}

checkProducts();


import * as dotenv from "dotenv";
dotenv.config();

import { storage } from "./lib/storage";

async function checkProducts() {
    try {
        console.log("Fetching products without userId...");
        const productsNoUser = await storage.getProducts({ limit: 5 });
        console.log(`Success! Got ${productsNoUser.length} products.`);
        if (productsNoUser.length > 0) {
            console.log("Sample product:", JSON.stringify(productsNoUser[0], null, 2));
        }

        // Determine a valid user ID to test with
        // (We rely on check-data logic that users exist, assuming ID '1' or similar might not work if UUIDs)
        // We won't test with userId unless we fetch one first.

        console.log("Fetching products DONE.");
        process.exit(0);
    } catch (error) {
        console.error("Error fetching products:", error);
        process.exit(1);
    }
}

checkProducts();


import * as dotenv from "dotenv";
dotenv.config();

import { db } from "./lib/db";
import { users, orders, products, orderItems } from "@shared/schema";
import { storage } from "./lib/storage";
import { sql, eq } from "drizzle-orm";

async function seedData() {
    try {
        console.log("Seeding data...");

        // Get users and products
        const allUsers = await db.select().from(users);
        const allProducts = await db.select().from(products);

        if (allUsers.length === 0 || allProducts.length === 0) {
            console.error("No users or products found to create orders for.");
            return;
        }

        const user = allUsers[0];
        const product = allProducts[0];

        console.log(`Found User: ${user.id}, Product: ${product.id}`);

        // Create a dummy order
        // Minimal insert
        const [newOrder] = await db.insert(orders).values({
            orderNumber: `ORD-${Date.now()}`,
            userId: user.id,
            totalAmount: "150.00",
            subtotal: "150.00",
            // status: "paid", // Rely on default or separate update if enum is issue
            // paymentStatus: "paid",
            // createdAt: new Date(),
        }).returning({ id: orders.id });

        console.log("Created Order:", newOrder.id);

        /*
        // Create order item
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          productId: product.id,
          quantity: 1,
          unitPrice: "150.00",
          totalPrice: "150.00",
          productName: product.name || "Test Product",
          productSku: product.sku || "TEST-SKU",
        });
    
        console.log("Created Order Item");
        */

        // Test getAnalytics
        console.log("Fetching analytics...");
        const analytics = await storage.getAnalytics();
        console.log("Analytics Result:", JSON.stringify(analytics, null, 2));

    } catch (error) {
        console.error("Error seeding data:", error);
    } finally {
        process.exit(0);
    }
}

seedData();

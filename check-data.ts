import * as dotenv from "dotenv";
dotenv.config();

import { db } from "./lib/db";
import { users, orders, products } from "@shared/schema";
import { sql } from "drizzle-orm";

async function checkData() {
    try {
        const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
        const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);

        console.log("Users:", userCount?.count);
        console.log("Orders:", orderCount?.count);

        // Check columns
        console.log("Adding image_url column...");
        await db.execute(sql`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
    `);

        console.log("Column added.");

        // Verify
        const columns = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'image_url';
    `);

        console.log("Products Specific Columns Verify:", columns.rows.map((r: any) => r.column_name));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkData();

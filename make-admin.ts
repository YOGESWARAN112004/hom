
import 'dotenv/config';
import { db } from './lib/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function makeAdmin() {
    console.log("--- Make User Admin Script ---");

    rl.question('Enter the email address of the user to promote to admin: ', async (email) => {
        try {
            if (!email) {
                console.error("Email is required.");
                process.exit(1);
            }

            console.log(`Looking for user with email: ${email}...`);
            const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

            if (!user) {
                console.error("User not found!");
                process.exit(1);
            }

            console.log(`Found user: ${user.email} (Current Role: ${user.role})`);

            const [updatedUser] = await db.update(users)
                .set({ role: 'admin' })
                .where(eq(users.id, user.id))
                .returning();

            console.log(`Success! User ${updatedUser.email} is now an ADMIN.`);
        } catch (error) {
            console.error("Error updating user:", error);
        } finally {
            rl.close();
            process.exit(0);
        }
    });
}

makeAdmin();

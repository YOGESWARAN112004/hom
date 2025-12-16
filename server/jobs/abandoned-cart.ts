import { storage } from '../storage';
import { sendAbandonedCartEmail, sendEmailToAdmins } from '../email';

// Template selection based on time interval
const TEMPLATE_MAP: Record<string, number[]> = {
  '1hour': [1, 2, 3, 4, 5], // Templates 1-5 for 1 hour
  '24hour': [6, 7, 8, 9, 10], // Templates 6-10 for 24 hours
  '72hour': [11, 12, 13, 14, 15], // Templates 11-15 for 72 hours
};

// Randomly select a template from the available templates for the interval
function selectTemplate(emailType: string): number {
  const templates = TEMPLATE_MAP[emailType] || TEMPLATE_MAP['1hour'];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Process abandoned carts for a specific time interval
async function processAbandonedCarts(hoursAgo: number, emailType: string) {
  try {
    console.log(`[Abandoned Cart] Processing ${emailType} abandoned carts (${hoursAgo} hours ago)...`);
    
    const abandonedCarts = await storage.getAbandonedCarts(hoursAgo);

    for (const cart of abandonedCarts) {
      // Check if we've already sent an email for any cart item
      let shouldSend = false;
      let cartItemId: string | null = null;

      for (const item of cart.cartItems) {
        const alreadySent = await storage.hasAbandonedCartEmailBeenSent(item.id, emailType);
        if (!alreadySent) {
          shouldSend = true;
          cartItemId = item.id;
          break;
        }
      }

      if (!shouldSend) {
        continue; // Already sent email for this cart
      }

      // Prepare cart data for email
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      const checkoutUrl = `${appUrl}/checkout`;

      // Convert image URLs to proxy URLs if they're S3 URLs
      const convertToProxyUrl = (url?: string): string | undefined => {
        if (!url) return undefined;
        if (url.includes('.s3.') && url.includes('amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `${appUrl}/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        if (url.includes('cloudfront.net') || url.includes('s3.amazonaws.com')) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            return `${appUrl}/api/images/s3/${key}`;
          } catch {
            return url;
          }
        }
        return url;
      };

      const cartData = {
        firstName: cart.firstName || undefined,
        cartItems: cart.cartItems.map(item => ({
          name: item.product.name,
          brand: item.product.brand,
          price: item.variant?.priceModifier
            ? (parseFloat(item.product.basePrice) + parseFloat(item.variant.priceModifier)).toString()
            : item.product.basePrice,
          quantity: item.quantity,
          imageUrl: convertToProxyUrl(item.imageUrl),
        })),
        cartTotal: cart.cartTotal.toString(),
        checkoutUrl,
      };

      // Select a random template for this interval
      const templateId = selectTemplate(emailType);
      
      // Generate discount code for 24hr and 72hr emails (optional)
      let discountCode: string | undefined;
      if (emailType === '24hour' && templateId === 10) {
        discountCode = `CART24${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      } else if (emailType === '72hour' && templateId === 15) {
        discountCode = `CART72${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      // Send email to customer
      const emailSent = await sendAbandonedCartEmail(
        cart.userEmail,
        templateId,
        cartData,
        discountCode
      );

      if (emailSent && cartItemId) {
        // Record that we sent the email
        await storage.recordAbandonedCartEmail({
          userId: cart.userId,
          cartItemId,
          emailType,
          templateId,
        });

        console.log(`[Abandoned Cart] Sent ${emailType} email to ${cart.userEmail} (template ${templateId})`);

        // Notify admins
        await sendEmailToAdmins(
          `🛒 Abandoned Cart Alert: ${cart.firstName || cart.userEmail}`,
          `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Abandoned Cart Alert</h2>
              <p><strong>Customer:</strong> ${cart.firstName || ''} ${cart.lastName || ''} (${cart.userEmail})</p>
              <p><strong>Cart Total:</strong> ₹${cart.cartTotal.toLocaleString()}</p>
              <p><strong>Items:</strong> ${cart.cartItems.length}</p>
              <p><strong>Time Since Last Update:</strong> ${hoursAgo} hours</p>
              <p><strong>Email Sent:</strong> ${emailType} reminder (Template ${templateId})</p>
            </div>
          `,
          `Abandoned cart alert: ${cart.userEmail} - ₹${cart.cartTotal.toLocaleString()} - ${hoursAgo} hours ago`
        );
      }
    }

    console.log(`[Abandoned Cart] Processed ${abandonedCarts.length} ${emailType} carts`);
  } catch (error) {
    console.error(`[Abandoned Cart] Error processing ${emailType} carts:`, error);
  }
}

// Track if job is currently running to prevent concurrent execution
let isJobRunning = false;

// Main function to run all abandoned cart checks
export async function runAbandonedCartJob() {
  // Prevent concurrent execution
  if (isJobRunning) {
    console.log('[Abandoned Cart] Job already running, skipping this execution');
    return;
  }

  isJobRunning = true;
  const startTime = Date.now();

  try {
    console.log('[Abandoned Cart] Starting abandoned cart job...');
    
    // Process 1-hour abandoned carts
    await processAbandonedCarts(1, '1hour');
    
    // Process 24-hour abandoned carts
    await processAbandonedCarts(24, '24hour');
    
    // Process 72-hour abandoned carts
    await processAbandonedCarts(72, '72hour');
    
    const duration = Date.now() - startTime;
    console.log(`[Abandoned Cart] Job completed successfully in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Abandoned Cart] Job failed after ${duration}ms:`, error);
    // Re-throw to allow caller to handle if needed
    throw error;
  } finally {
    isJobRunning = false;
  }
}

// Store interval reference for cleanup
let schedulerInterval: NodeJS.Timeout | null = null;

// Start the job scheduler
export function startAbandonedCartScheduler() {
  // Check if scheduler should be enabled (can be disabled via env var)
  const schedulerEnabled = process.env.ENABLE_ABANDONED_CART_SCHEDULER !== 'false';
  
  if (!schedulerEnabled) {
    console.log('[Abandoned Cart] Scheduler is disabled via ENABLE_ABANDONED_CART_SCHEDULER=false');
    return;
  }

  // Get interval from env or default to 15 minutes
  const intervalMinutes = parseInt(process.env.ABANDONED_CART_INTERVAL_MINUTES || '15', 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  // Get whether to run on startup
  const runOnStartup = process.env.ABANDONED_CART_RUN_ON_STARTUP !== 'false';

  console.log(`[Abandoned Cart] Scheduler started - will run every ${intervalMinutes} minutes`);

  // Run immediately on startup if enabled
  if (runOnStartup) {
    console.log('[Abandoned Cart] Running initial job on startup...');
    runAbandonedCartJob().catch(err => {
      console.error('[Abandoned Cart] Error in initial run:', err);
    });
  }

  // Then run on schedule
  schedulerInterval = setInterval(() => {
    runAbandonedCartJob().catch(err => {
      console.error('[Abandoned Cart] Error in scheduled run:', err);
    });
  }, intervalMs);
}

// Stop the scheduler (useful for graceful shutdown)
export function stopAbandonedCartScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Abandoned Cart] Scheduler stopped');
  }
}


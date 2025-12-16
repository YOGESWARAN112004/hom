import Razorpay from "razorpay";
import crypto from "crypto";
import { storage } from "./storage";
import { sendOrderConfirmationEmail, sendOrderInvoiceEmail } from "./email";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

interface CreateOrderOptions {
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency?: string;
  orderId: string; // Our internal order ID
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

interface VerifyPaymentOptions {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ============================================
// CREATE RAZORPAY ORDER
// ============================================

export async function createRazorpayOrder(options: CreateOrderOptions): Promise<RazorpayOrder> {
  const { amount, currency = 'INR', orderId, notes } = options;

  const razorpayOrder = await razorpay.orders.create({
    amount, // Amount in paise
    currency,
    receipt: orderId,
    notes: {
      internal_order_id: orderId,
      ...notes,
    },
  });

  // Update our order with Razorpay order ID
  const order = await storage.getOrder(orderId);
  if (order) {
    await storage.updateOrderPayment(orderId, {
      paymentStatus: 'pending',
    });

    // We need to store razorpayOrderId - let's update the order
    // This requires a direct DB update or adding to updateOrderPayment
  }

  return razorpayOrder as RazorpayOrder;
}

// ============================================
// VERIFY PAYMENT SIGNATURE
// ============================================

export function verifyPaymentSignature(options: VerifyPaymentOptions): boolean {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = options;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex');

  return expectedSignature === razorpay_signature;
}

// ============================================
// HANDLE SUCCESSFUL PAYMENT
// ============================================

export async function handlePaymentSuccess(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    const order = await storage.getOrder(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    // Update order with payment details
    await storage.updateOrderPayment(orderId, {
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    // Update order status
    await storage.updateOrderStatus(orderId, 'confirmed');

    // Send comprehensive invoice email
    if (order.userId) {
      const user = await storage.getUser(order.userId);
      if (user?.email) {
        const items = await storage.getOrderItems(orderId);
        
        // Send detailed invoice email
        await sendOrderInvoiceEmail(
          user.email,
          {
            orderNumber: order.orderNumber,
            orderDate: order.createdAt || new Date(),
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            taxAmount: order.taxAmount,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod || 'razorpay',
            paymentId: order.razorpayPaymentId || undefined,
            shippingAddress: order.shippingAddress,
            items: items.map(item => ({
              name: item.productName,
              quantity: item.quantity,
              price: item.totalPrice,
              sku: item.productSku || undefined,
              size: item.variantSize || undefined,
              color: item.variantColor || undefined,
            })),
          },
          user.firstName || undefined
        );
      }
    }

    // Note: Commission is calculated when order status changes to "delivered"
    // This ensures affiliates only earn commission after successful delivery

    return { success: true, message: 'Payment processed successfully' };
  } catch (error) {
    console.error('Error handling payment success:', error);
    return { success: false, message: 'Failed to process payment' };
  }
}

// ============================================
// HANDLE PAYMENT FAILURE
// ============================================

export async function handlePaymentFailure(
  orderId: string,
  error?: string
): Promise<void> {
  try {
    await storage.updateOrderPayment(orderId, {
      paymentStatus: 'failed',
    });

    // Optionally restore stock for failed orders
    // This depends on your business logic
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
}

// ============================================
// REFUND PAYMENT
// ============================================

export async function refundPayment(
  paymentId: string,
  amount?: number, // Optional: partial refund amount in paise
  notes?: Record<string, string>
): Promise<{ success: boolean; refundId?: string; message?: string }> {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount,
      notes,
    });

    return {
      success: true,
      refundId: refund.id,
    };
  } catch (error: any) {
    console.error('Refund error:', error);
    return {
      success: false,
      message: error.message || 'Refund failed',
    };
  }
}

// ============================================
// GET PAYMENT DETAILS
// ============================================

export async function getPaymentDetails(paymentId: string) {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return null;
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

export interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        email: string;
        contact: string;
        notes: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        receipt: string;
        amount: number;
        status: string;
      };
    };
  };
  created_at: number;
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not set');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

export async function processWebhookEvent(event: RazorpayWebhookEvent): Promise<void> {
  switch (event.event) {
    case 'payment.captured':
      if (event.payload.payment) {
        const payment = event.payload.payment.entity;
        const internalOrderId = payment.notes?.internal_order_id;
        
        if (internalOrderId) {
          await handlePaymentSuccess(
            internalOrderId,
            payment.id,
            '' // Signature not available in webhook
          );
        }
      }
      break;

    case 'payment.failed':
      if (event.payload.payment) {
        const payment = event.payload.payment.entity;
        const internalOrderId = payment.notes?.internal_order_id;
        
        if (internalOrderId) {
          await handlePaymentFailure(internalOrderId);
        }
      }
      break;

    case 'refund.created':
      // Handle refund if needed
      break;

    default:
      console.log(`Unhandled webhook event: ${event.event}`);
  }
}

// ============================================
// RAZORPAY AVAILABILITY CHECK
// ============================================

export function isRazorpayConfigured(): boolean {
  return !!(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );
}

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || '';
}


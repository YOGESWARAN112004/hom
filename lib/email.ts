import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter based on environment
function createTransporter() {
  // In production, use actual SMTP settings
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // For development, use console logging
  console.log('[Email Service] Running in development mode - emails will be logged to console');
  return null;
}

const transporter = createTransporter();

// Admin email recipients
const ADMIN_EMAILS = [
  '12147yogeshwaransnm@gmail.com',
  'hellboypranesh03@gmail.com',
];

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!transporter) {
      // Development mode - log email
      console.log('\n=== EMAIL ===');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Content: ${options.text || 'See HTML'}`);
      console.log('=============\n');
      return true;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Houses of Medusa" <noreply@housesofmedusa.com>',
      ...options,
    });

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Send email to multiple admin recipients
export async function sendEmailToAdmins(subject: string, html: string, text?: string): Promise<boolean> {
  const results = await Promise.all(
    ADMIN_EMAILS.map(email => sendEmail({ to: email, subject, html, text }))
  );
  return results.every(r => r);
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export async function sendVerificationEmail(email: string, otp: string, firstName?: string): Promise<boolean> {
  const name = firstName || 'there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9a520 0%, #b8860b 100%); padding: 30px; text-align: center; }
        .header h1 { color: #000; margin: 0; font-size: 24px; letter-spacing: 2px; }
        .content { padding: 40px 30px; color: #ccc; line-height: 1.6; }
        .otp-box { background: #1a1a1a; border: 2px solid #d9a520; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 36px; font-weight: bold; color: #d9a520; letter-spacing: 8px; font-family: monospace; }
        .footer { padding: 20px 30px; border-top: 1px solid #222; color: #666; font-size: 12px; text-align: center; }
        .warning { color: #888; font-size: 13px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOUSES OF MEDUSA</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>Welcome to Houses of Medusa! Please use the verification code below to confirm your email address:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p style="margin: 10px 0 0; color: #888; font-size: 13px;">This code expires in 10 minutes</p>
          </div>
          
          <p>If you didn't create an account with us, please ignore this email.</p>
          
          <p class="warning">⚠️ Never share this code with anyone. Our team will never ask for your verification code.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${otp} is your Houses of Medusa verification code`,
    html,
    text: `Your verification code is: ${otp}. This code expires in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string, firstName?: string): Promise<boolean> {
  const name = firstName || 'there';
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9a520 0%, #b8860b 100%); padding: 30px; text-align: center; }
        .header h1 { color: #000; margin: 0; font-size: 24px; letter-spacing: 2px; }
        .content { padding: 40px 30px; color: #ccc; line-height: 1.6; }
        .button { display: inline-block; background: #d9a520; color: #000; text-decoration: none; padding: 15px 30px; border-radius: 4px; font-weight: bold; letter-spacing: 1px; margin: 20px 0; }
        .footer { padding: 20px 30px; border-top: 1px solid #222; color: #666; font-size: 12px; text-align: center; }
        .warning { color: #888; font-size: 13px; margin-top: 20px; }
        .link { color: #d9a520; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOUSES OF MEDUSA</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">RESET PASSWORD</a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p class="link">${resetUrl}</p>
          
          <p class="warning">This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset your Houses of Medusa password',
    html,
    text: `Reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
  });
}

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
  sku?: string;
  size?: string;
  color?: string;
}

interface OrderData {
  orderNumber: string;
  orderDate: Date;
  subtotal: string;
  shippingCost: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paymentMethod?: string;
  paymentId?: string;
  shippingAddress?: any;
  items: OrderItem[];
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  totalAmount: string,
  items: Array<{ name: string; quantity: number; price: string }>,
  firstName?: string
): Promise<boolean> {
  // Legacy function - kept for backward compatibility
  const name = firstName || 'there';

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #222;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #222; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #222; text-align: right;">₹${item.price}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9a520 0%, #b8860b 100%); padding: 30px; text-align: center; }
        .header h1 { color: #000; margin: 0; font-size: 24px; letter-spacing: 2px; }
        .content { padding: 40px 30px; color: #ccc; line-height: 1.6; }
        .order-box { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .order-number { font-size: 18px; color: #d9a520; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 10px; border-bottom: 2px solid #d9a520; color: #d9a520; }
        .total { font-size: 20px; color: #d9a520; font-weight: bold; margin-top: 20px; text-align: right; }
        .footer { padding: 20px 30px; border-top: 1px solid #222; color: #666; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOUSES OF MEDUSA</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>Thank you for your order! We're excited to prepare your luxury items for delivery.</p>
          
          <div class="order-box">
            <p class="order-number">Order #${orderNumber}</p>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <p class="total">Total: ₹${totalAmount}</p>
          </div>
          
          <p>You can track your order status in your account dashboard. We'll send you another email when your order ships.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.</p>
          <p>Questions? Contact us at support@housesofmedusa.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Order Confirmed - #${orderNumber}`,
    html,
    text: `Thank you for your order #${orderNumber}. Total: ₹${totalAmount}`,
  });
}

// New comprehensive invoice email function
export async function sendOrderInvoiceEmail(
  email: string,
  orderData: OrderData,
  firstName?: string
): Promise<boolean> {
  const name = firstName || 'there';
  const orderDate = new Date(orderData.orderDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format shipping address
  let shippingAddressHtml = '';
  if (orderData.shippingAddress) {
    const addr = orderData.shippingAddress;
    shippingAddressHtml = `
      <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #d9a520; margin-top: 0; margin-bottom: 15px;">Shipping Address</h3>
        <p style="margin: 5px 0; color: #ccc;">
          ${addr.fullName || ''}<br>
          ${addr.addressLine1 || ''}${addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br>
          ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}<br>
          ${addr.country || 'India'}<br>
          ${addr.phone ? `Phone: ${addr.phone}` : ''}
        </p>
      </div>
    `;
  }

  // Format order items
  const itemsHtml = orderData.items.map(item => {
    const itemDetails = [];
    if (item.sku) itemDetails.push(`SKU: ${item.sku}`);
    if (item.size) itemDetails.push(`Size: ${item.size}`);
    if (item.color) itemDetails.push(`Color: ${item.color}`);

    return `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #222;">
          <div style="color: #fff; font-weight: 500; margin-bottom: 5px;">${item.name}</div>
          ${itemDetails.length > 0 ? `<div style="color: #888; font-size: 12px;">${itemDetails.join(' | ')}</div>` : ''}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #222; text-align: center; color: #ccc;">${item.quantity}</td>
        <td style="padding: 15px; border-bottom: 1px solid #222; text-align: right; color: #ccc;">₹${parseFloat(item.price).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  // Payment method display
  let paymentMethodHtml = '';
  if (orderData.paymentMethod) {
    const paymentMethod = orderData.paymentMethod === 'razorpay' ? 'UPI / Cards / Net Banking' : orderData.paymentMethod;
    paymentMethodHtml = `
      <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; margin: 15px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #888;">Payment Method:</span>
          <span style="color: #d9a520; font-weight: 500;">${paymentMethod}</span>
        </div>
        ${orderData.paymentId ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <span style="color: #888;">Transaction ID:</span>
            <span style="color: #ccc; font-size: 12px; font-family: monospace;">${orderData.paymentId.substring(0, 20)}...</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Invoice - ${orderData.orderNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; margin: 0; padding: 20px; }
        .container { max-width: 700px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9a520 0%, #b8860b 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #000; margin: 0; font-size: 28px; letter-spacing: 3px; }
        .header p { color: #333; margin: 10px 0 0; font-size: 14px; }
        .content { padding: 40px 30px; color: #ccc; line-height: 1.6; }
        .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #d9a520; }
        .invoice-info { flex: 1; }
        .invoice-number { font-size: 24px; color: #d9a520; font-weight: bold; margin-bottom: 10px; }
        .invoice-date { color: #888; font-size: 14px; }
        .company-info { text-align: right; color: #888; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { text-align: left; padding: 15px; border-bottom: 2px solid #d9a520; color: #d9a520; font-weight: 600; }
        .price-breakdown { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .price-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #222; }
        .price-row:last-child { border-bottom: none; }
        .price-label { color: #888; }
        .price-value { color: #ccc; }
        .total-row { margin-top: 15px; padding-top: 15px; border-top: 2px solid #d9a520; }
        .total-label { color: #d9a520; font-size: 18px; font-weight: bold; }
        .total-value { color: #d9a520; font-size: 24px; font-weight: bold; }
        .footer { padding: 30px; border-top: 1px solid #222; color: #666; font-size: 12px; text-align: center; background: #0a0a0a; }
        .success-badge { background: #1a5f1a; color: #90ee90; padding: 10px 20px; border-radius: 6px; display: inline-block; margin-bottom: 20px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOUSES OF MEDUSA</h1>
          <p>Luxury Outlet Retail</p>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <div class="success-badge">✓ Payment Successful - Order Confirmed</div>
          </div>
          
          <p>Hello ${name},</p>
          <p>Thank you for your purchase! Your order has been confirmed and payment has been received. We're preparing your luxury items for delivery.</p>
          
          <div class="invoice-header">
            <div class="invoice-info">
              <div class="invoice-number">Invoice #${orderData.orderNumber}</div>
              <div class="invoice-date">Order Date: ${orderDate}</div>
            </div>
            <div class="company-info">
              <strong style="color: #d9a520;">Houses of Medusa</strong><br>
              Luxury Outlet Retail<br>
              support@housesofmedusa.com
            </div>
          </div>
          
          ${shippingAddressHtml}
          
          <h3 style="color: #d9a520; margin-top: 30px; margin-bottom: 15px;">Order Items</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="price-breakdown">
            <div class="price-row">
              <span class="price-label">Subtotal</span>
              <span class="price-value">₹${parseFloat(orderData.subtotal).toLocaleString('en-IN')}</span>
            </div>
            ${parseFloat(orderData.shippingCost) > 0 ? `
            <div class="price-row">
              <span class="price-label">Shipping</span>
              <span class="price-value">₹${parseFloat(orderData.shippingCost).toLocaleString('en-IN')}</span>
            </div>
            ` : `
            <div class="price-row">
              <span class="price-label">Shipping</span>
              <span class="price-value" style="color: #1a5f1a;">FREE</span>
            </div>
            `}
            ${parseFloat(orderData.taxAmount) > 0 ? `
            <div class="price-row">
              <span class="price-label">Tax</span>
              <span class="price-value">₹${parseFloat(orderData.taxAmount).toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            ${parseFloat(orderData.discountAmount) > 0 ? `
            <div class="price-row">
              <span class="price-label">Discount</span>
              <span class="price-value" style="color: #1a5f1a;">-₹${parseFloat(orderData.discountAmount).toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            <div class="price-row total-row">
              <span class="total-label">Total Amount</span>
              <span class="total-value">₹${parseFloat(orderData.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          ${paymentMethodHtml}
          
          <div style="background: #1a1a1a; border-left: 4px solid #d9a520; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h4 style="color: #d9a520; margin-top: 0;">What's Next?</h4>
            <p style="margin: 5px 0; color: #ccc;">
              • Your order is being processed and will be shipped soon<br>
              • You'll receive a tracking number via email once your order ships<br>
              • Expected delivery: 5-7 business days<br>
              • You can track your order status in your account dashboard
            </p>
          </div>
          
          <p style="color: #888; font-size: 13px; margin-top: 30px;">
            This is your official invoice. Please keep this email for your records.
          </p>
        </div>
        <div class="footer">
          <p><strong>Houses of Medusa</strong> - Luxury Outlet Retail</p>
          <p>© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.</p>
          <p>Questions? Contact us at support@housesofmedusa.com</p>
          <p style="margin-top: 15px; color: #444;">
            This is an automated invoice. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Order Confirmed - Invoice #${orderData.orderNumber}

Hello ${name},

Thank you for your purchase! Your order has been confirmed.

Order Number: ${orderData.orderNumber}
Order Date: ${orderDate}
Total Amount: ₹${parseFloat(orderData.totalAmount).toLocaleString('en-IN')}

Items:
${orderData.items.map(item => `- ${item.name} (Qty: ${item.quantity}) - ₹${parseFloat(item.price).toLocaleString('en-IN')}`).join('\n')}

Price Breakdown:
Subtotal: ₹${parseFloat(orderData.subtotal).toLocaleString('en-IN')}
Shipping: ${parseFloat(orderData.shippingCost) > 0 ? `₹${parseFloat(orderData.shippingCost).toLocaleString('en-IN')}` : 'FREE'}
${parseFloat(orderData.taxAmount) > 0 ? `Tax: ₹${parseFloat(orderData.taxAmount).toLocaleString('en-IN')}\n` : ''}
${parseFloat(orderData.discountAmount) > 0 ? `Discount: -₹${parseFloat(orderData.discountAmount).toLocaleString('en-IN')}\n` : ''}
Total: ₹${parseFloat(orderData.totalAmount).toLocaleString('en-IN')}

You can track your order status in your account dashboard.

© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.
  `;

  return sendEmail({
    to: email,
    subject: `Order Confirmed & Invoice - #${orderData.orderNumber}`,
    html,
    text,
  });
}

export async function sendCartNotificationEmail(
  user: { email: string; firstName?: string | null; lastName?: string | null },
  product: { name: string; basePrice: string; brand: string },
  quantity: number
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cart Activity Alert</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .header { background: #111; padding: 20px; text-align: center; }
        .header h1 { color: #d9a520; margin: 0; font-size: 20px; letter-spacing: 2px; }
        .content { padding: 30px; color: #333; line-height: 1.6; }
        .info-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .value { color: #111; font-size: 16px; font-weight: 500; }
        .product-box { border-left: 3px solid #d9a520; padding-left: 15px; margin: 15px 0; }
        .footer { padding: 15px 30px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 CART ACTIVITY</h1>
        </div>
        <div class="content">
          <p>A customer has added an item to their cart:</p>
          
          <div class="info-box">
            <div class="label">Customer</div>
            <div class="value">${user.firstName || ''} ${user.lastName || ''}</div>
            <div style="color: #666; font-size: 14px;">${user.email}</div>
          </div>
          
          <div class="product-box">
            <div class="label">Product Added</div>
            <div class="value">${product.name}</div>
            <div style="color: #666; margin-top: 5px;">
              Brand: ${product.brand} | Qty: ${quantity} | Price: ₹${parseFloat(product.basePrice).toLocaleString()}
            </div>
          </div>
          
          <p style="margin-top: 20px; color: #666; font-size: 13px;">
            💡 <strong>Tip:</strong> Consider sending this customer an exclusive discount to encourage checkout!
          </p>
        </div>
        <div class="footer">
          <p>Houses of Medusa Admin Notification</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailToAdmins(
    `🛒 Cart Activity: ${user.firstName || user.email} added ${product.name}`,
    html,
    `Cart Activity: ${user.email} added ${product.name} (${product.brand}) x${quantity} - ₹${product.basePrice}`
  );
}

export async function sendExclusiveDiscountEmail(
  email: string,
  discountCode: string,
  discountPercent: number,
  expiresIn: string,
  firstName?: string
): Promise<boolean> {
  const name = firstName || 'there';
  const shopUrl = process.env.APP_URL || 'http://localhost:5000';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Exclusive Offer Just For You</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9a520 0%, #b8860b 100%); padding: 40px; text-align: center; }
        .header h1 { color: #000; margin: 0; font-size: 32px; letter-spacing: 2px; }
        .header p { color: #333; margin: 10px 0 0; font-size: 14px; }
        .content { padding: 40px 30px; color: #ccc; line-height: 1.6; text-align: center; }
        .discount-box { background: linear-gradient(135deg, #1a1a1a 0%, #222 100%); border: 2px solid #d9a520; border-radius: 12px; padding: 30px; margin: 30px 0; }
        .discount-percent { font-size: 64px; font-weight: bold; color: #d9a520; line-height: 1; }
        .discount-label { font-size: 24px; color: #fff; margin-top: 10px; }
        .code-box { background: #d9a520; color: #000; font-size: 28px; font-weight: bold; padding: 15px 30px; border-radius: 8px; display: inline-block; margin: 20px 0; letter-spacing: 3px; font-family: monospace; }
        .expires { color: #888; font-size: 13px; margin-top: 10px; }
        .button { display: inline-block; background: #d9a520; color: #000; text-decoration: none; padding: 18px 40px; border-radius: 4px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; font-size: 16px; }
        .footer { padding: 20px 30px; border-top: 1px solid #222; color: #666; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EXCLUSIVE OFFER</h1>
          <p>Just for you, ${name}</p>
        </div>
        <div class="content">
          <p>We noticed you've been browsing our collection. Here's a special discount just for you:</p>
          
          <div class="discount-box">
            <div class="discount-percent">${discountPercent}%</div>
            <div class="discount-label">OFF YOUR ORDER</div>
            <div class="code-box">${discountCode}</div>
            <div class="expires">⏰ Expires ${expiresIn}</div>
          </div>
          
          <p>Use this code at checkout to save on your luxury purchase!</p>
          
          <a href="${shopUrl}/shop" class="button">SHOP NOW</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.</p>
          <p>This exclusive offer is just for you and cannot be combined with other discounts.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎁 ${discountPercent}% OFF - Exclusive offer just for you, ${name}!`,
    html,
    text: `Exclusive ${discountPercent}% discount! Use code ${discountCode} at checkout. Expires ${expiresIn}.`,
  });
}

export async function sendWelcomeEmail(email: string, firstName?: string): Promise<boolean> {
  const name = firstName || 'there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Houses of Medusa</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d9a520 0%, #b8860b 100%); padding: 40px; text-align: center; }
        .header h1 { color: #000; margin: 0; font-size: 28px; letter-spacing: 3px; }
        .header p { color: #333; margin: 10px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 40px 30px; color: #ccc; line-height: 1.8; }
        .button { display: inline-block; background: #d9a520; color: #000; text-decoration: none; padding: 15px 30px; border-radius: 4px; font-weight: bold; letter-spacing: 1px; margin: 20px 0; }
        .features { margin: 30px 0; }
        .feature { margin: 20px 0; }
        .feature-icon { display: inline-block; width: 32px; height: 32px; background: #d9a520; border-radius: 50%; text-align: center; line-height: 32px; color: #000; font-size: 16px; font-weight: bold; vertical-align: middle; margin-right: 12px; }
        .feature-text { display: inline-block; vertical-align: middle; max-width: calc(100% - 50px); }
        .footer { padding: 20px 30px; border-top: 1px solid #222; color: #666; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOUSES OF MEDUSA</h1>
          <p>Luxury Outlet Retail</p>
        </div>
        <div class="content">
          <h2 style="color: #fff; margin-top: 0;">Welcome, ${name}!</h2>
          <p>You've just joined an exclusive community of luxury enthusiasts. At Houses of Medusa, we curate the finest pieces from world-renowned brands.</p>
          
          <div class="features">
            <div class="feature">
              <span class="feature-icon">&#10003;</span>
              <span class="feature-text">
                <strong style="color: #fff;">Authentic Luxury</strong><br>
                <span style="font-size: 13px;">100% authentic products from top brands</span>
              </span>
            </div>
            <div class="feature">
              <span class="feature-icon">&#10003;</span>
              <span class="feature-text">
                <strong style="color: #fff;">Exclusive Deals</strong><br>
                <span style="font-size: 13px;">Member-only discounts up to 70% off</span>
              </span>
            </div>
            <div class="feature">
              <span class="feature-icon">&#10003;</span>
              <span class="feature-text">
                <strong style="color: #fff;">Free Shipping</strong><br>
                <span style="font-size: 13px;">Complimentary shipping on orders over ₹10,000</span>
              </span>
            </div>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.APP_URL || 'http://localhost:5000'}" class="button">START SHOPPING</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Houses of Medusa. All rights reserved.</p>
          <p>Follow us for exclusive previews and offers</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Houses of Medusa - Your Luxury Journey Begins',
    html,
    text: `Welcome to Houses of Medusa, ${name}! Start shopping at ${process.env.APP_URL || 'http://localhost:5000'}`,
  });
}

export async function sendAbandonedCartEmail(
  email: string,
  templateId: number,
  cartData: any,
  discountCode?: string
): Promise<boolean> {
  // This is a placeholder implementation since the actual templates might be complex
  // For now, we'll send a generic abandoned cart email

  const subject = discountCode
    ? `You left something behind! (Here's ${discountCode} for a discount)`
    : 'You left something behind in your cart';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body>
      <h1>Don't forget your items!</h1>
      <p>You have items waiting in your cart.</p>
      <p>Total: ₹${cartData.cartTotal}</p>
      <a href="${cartData.checkoutUrl}">Complete Checkout</a>
      ${discountCode ? `<p>Use code <strong>${discountCode}</strong> for a discount!</p>` : ''}
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text: `You have items waiting in your cart. Complete checkout here: ${cartData.checkoutUrl}`,
  });
}

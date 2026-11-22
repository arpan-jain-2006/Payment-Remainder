const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Customer = require('../models/Customer');

// Create email transporter
function getTransporter() {
    const emailUser = process.env.EMAIL;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || emailUser === 'your@gmail.com' || !emailPass || emailPass === 'your-app-password') {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });
}

// Generate beautiful HTML invoice/reminder template
function generateReminderHtml(customer, paymentUrl) {
    const formattedAmount = Number(customer.amount).toLocaleString('en-IN');
    const formattedDate = new Date(customer.dueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .body { padding: 32px 24px; }
            .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
            .card-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
            .row:last-child { margin-bottom: 0; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: 700; color: #0f172a; }
            .amount { font-size: 24px; color: #4f46e5; font-weight: 800; }
            .cta-container { text-align: center; margin: 30px 0 15px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.35); }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 13px; color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💳 Payment Reminder</h1>
                <p>RemindPro Payment Management System</p>
            </div>
            <div class="body">
                <div class="greeting">Dear ${customer.name},</div>
                <p>This is a friendly reminder that a payment of <strong style="color: #4f46e5;">₹${formattedAmount}</strong> is due on or before <strong>${formattedDate}</strong>.</p>
                
                <div class="card-info">
                    <div class="row">
                        <span class="label">Invoice / Description:</span>
                        <span class="value">${customer.notes || 'Payment Due'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Due Date:</span>
                        <span class="value">${formattedDate}</span>
                    </div>
                    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 12px 0;">
                    <div class="row" style="align-items: center;">
                        <span class="label" style="font-size: 16px;">Total Amount Due:</span>
                        <span class="amount">₹${formattedAmount}</span>
                    </div>
                </div>

                <div class="cta-container">
                    <a href="${paymentUrl}" class="btn">Pay Securely Now →</a>
                </div>
                
                <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 15px;">
                    If you have already made this payment, please disregard this notice.
                </p>
            </div>
            <div class="footer">
                © ${new Date().getFullYear()} RemindPro. All rights reserved.<br>
                For any queries, please reach out directly to the billing department.
            </div>
        </div>
    </body>
    </html>
    `;
}

// Send manual reminder email
async function sendCustomerReminder(customerId, baseUrl = 'http://localhost:3000') {
    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new Error('Customer not found');
    }

    if (customer.isPaid) {
        throw new Error('Customer has already completed the payment');
    }

    const transporter = getTransporter();
    const paymentUrl = `${baseUrl}/pay/${customer._id}`;

    if (!transporter) {
        console.warn(`[WARN] Email service not configured in .env. Mock reminder logged for: ${customer.email} (Payment URL: ${paymentUrl})`);
        customer.lastReminderSent = new Date();
        customer.reminderCount += 1;
        await customer.save();
        return {
            success: true,
            simulated: true,
            message: `Mock email logged for ${customer.name} (Configure EMAIL & EMAIL_PASS in .env for live dispatch)`
        };
    }

    const mailOptions = {
        from: `"RemindPro Billing" <${process.env.EMAIL}>`,
        to: customer.email,
        subject: `Payment Reminder: ₹${customer.amount} due on ${new Date(customer.dueDate).toLocaleDateString('en-IN')}`,
        html: generateReminderHtml(customer, paymentUrl)
    };

    const info = await transporter.sendMail(mailOptions);
    customer.lastReminderSent = new Date();
    customer.reminderCount += 1;
    await customer.save();

    return {
        success: true,
        simulated: false,
        messageId: info.messageId,
        message: `Reminder email successfully dispatched to ${customer.email}`
    };
}

// Initialize automated daily cron job (runs at 9:00 AM every day)
function initReminderCron(baseUrl = 'http://localhost:3000') {
    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Running daily payment reminder dispatch at 09:00 AM...');
        try {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            // Customers unpaid and due today or overdue
            const dueCustomers = await Customer.find({
                dueDate: { $lte: today },
                isPaid: false
            });

            console.log(`[CRON] Found ${dueCustomers.length} pending customer(s) due for reminders.`);

            for (const customer of dueCustomers) {
                try {
                    await sendCustomerReminder(customer._id, baseUrl);
                    console.log(`[CRON] Automated reminder sent to ${customer.email}`);
                } catch (err) {
                    console.error(`[CRON] Error sending reminder to ${customer.email}:`, err.message);
                }
            }
        } catch (error) {
            console.error('[CRON] Error in payment reminder cron job:', error.message);
        }
    });

    console.log('[CRON] Daily payment reminder schedule registered (09:00 AM every morning).');
}

module.exports = {
    sendCustomerReminder,
    initReminderCron,
    getTransporter
};

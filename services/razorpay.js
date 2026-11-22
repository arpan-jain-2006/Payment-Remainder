const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

function getRazorpayInstance() {
    if (!razorpayInstance && process.env.RZP_KEY && process.env.RZP_SECRET) {
        try {
            razorpayInstance = new Razorpay({
                key_id: process.env.RZP_KEY,
                key_secret: process.env.RZP_SECRET
            });
        } catch (err) {
            console.error('Razorpay initialization error:', err.message);
        }
    }
    return razorpayInstance;
}

// Create Razorpay Order
async function createOrder(amountInRupees, receiptId) {
    const rzp = getRazorpayInstance();
    if (!rzp) {
        throw new Error('Razorpay is not configured with valid API keys');
    }
    const options = {
        amount: Math.round(amountInRupees * 100), // amount in paise
        currency: 'INR',
        receipt: receiptId || `receipt_${Date.now()}`
    };
    return await rzp.orders.create(options);
}

// Verify Razorpay payment signature
function verifySignature(orderId, paymentId, signature) {
    if (!process.env.RZP_SECRET) return false;
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RZP_SECRET)
        .update(body.toString())
        .digest('hex');
    return expectedSignature === signature;
}

module.exports = {
    getRazorpayInstance,
    createOrder,
    verifySignature
};

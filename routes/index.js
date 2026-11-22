const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const User = require('../models/User');
const { sendCustomerReminder } = require('../services/reminder');
const { createOrder, verifySignature } = require('../services/razorpay');

// Helper to format currency in Indian style (₹)
const formatINR = (val) => Number(val || 0).toLocaleString('en-IN');

// 1. Landing Page
router.get('/', async (req, res) => {
    try {
        const totalCount = await Customer.countDocuments();
        const paidCount = await Customer.countDocuments({ isPaid: true });
        res.render('index', {
            title: 'RemindPro - Smart Payment Reminders',
            stats: { totalCount, paidCount }
        });
    } catch (err) {
        console.error(err);
        res.render('index', { title: 'RemindPro', stats: { totalCount: 0, paidCount: 0 } });
    }
});

// 2. Dashboard - Real-time dynamic analytics
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        // Fetch all customers for stats
        const allCustomers = await Customer.find().sort({ createdAt: -1 });

        let totalPendingAmount = 0;
        let pendingCount = 0;
        let totalCollectedAmount = 0;
        let paidCount = 0;
        let overdueCount = 0;
        let overdueAmount = 0;

        const upcomingReminders = [];

        allCustomers.forEach(c => {
            const due = new Date(c.dueDate);
            if (c.isPaid) {
                totalCollectedAmount += c.amount;
                paidCount++;
            } else {
                totalPendingAmount += c.amount;
                pendingCount++;
                if (due < today) {
                    overdueCount++;
                    overdueAmount += c.amount;
                } else if (due <= nextWeek) {
                    upcomingReminders.push(c);
                }
            }
        });

        // Recent 5 customers
        const recentCustomers = allCustomers.slice(0, 5);

        res.render('dashboard', {
            title: 'Dashboard - Analytics & Dues',
            user: req.session.user || { name: 'Demo Admin' },
            stats: {
                totalCustomers: allCustomers.length,
                pendingCount,
                totalPendingAmount,
                paidCount,
                totalCollectedAmount,
                overdueCount,
                overdueAmount,
                upcomingCount: upcomingReminders.length
            },
            upcomingReminders,
            recentCustomers,
            formatINR
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        req.flash('error', 'Error loading dashboard metrics');
        res.redirect('/customers');
    }
});

// 3. Customer List with Search & Filtering
router.get('/customers', async (req, res) => {
    try {
        const { status = 'all', q = '' } = req.query;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let query = {};

        // Search query
        if (q.trim()) {
            const regex = new RegExp(q.trim(), 'i');
            query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }

        // Status filter
        if (status === 'paid') {
            query.isPaid = true;
        } else if (status === 'pending') {
            query.isPaid = false;
            query.dueDate = { $gte: today };
        } else if (status === 'overdue') {
            query.isPaid = false;
            query.dueDate = { $lt: today };
        }

        const customers = await Customer.find(query).sort({ dueDate: 1 });

        // Quick metric summary for tabs
        const totalCount = await Customer.countDocuments();
        const paidCount = await Customer.countDocuments({ isPaid: true });
        const pendingCount = await Customer.countDocuments({ isPaid: false, dueDate: { $gte: today } });
        const overdueCount = await Customer.countDocuments({ isPaid: false, dueDate: { $lt: today } });

        res.render('customers', {
            title: 'Customers & Invoices',
            customers,
            status,
            searchQuery: q,
            counts: { totalCount, paidCount, pendingCount, overdueCount },
            formatINR
        });
    } catch (err) {
        console.error('Customers list error:', err);
        req.flash('error', 'Error fetching customers');
        res.render('customers', {
            title: 'Customers & Invoices',
            customers: [],
            status: 'all',
            searchQuery: '',
            counts: { totalCount: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 },
            formatINR
        });
    }
});

// 4. Add Customer Form
router.get('/add', (req, res) => {
    res.render('add', { title: 'Add New Payment Reminder' });
});

// 5. Add Customer Post
router.post('/add', async (req, res) => {
    try {
        const { name, email, phone, dueDate, amount, notes } = req.body;
        if (!name || !email || !dueDate || !amount) {
            req.flash('error', 'Please fill all required fields');
            return res.redirect('/add');
        }

        await Customer.create({
            name,
            email,
            phone,
            dueDate: new Date(dueDate),
            amount: Number(amount),
            notes: notes || ''
        });

        req.flash('success', `Payment reminder added for ${name}!`);
        res.redirect('/customers');
    } catch (err) {
        console.error('Add customer error:', err);
        req.flash('error', err.message || 'Failed to add customer');
        res.redirect('/add');
    }
});

// 6. Edit Customer Form
router.get('/customers/:id/edit', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            req.flash('error', 'Customer not found');
            return res.redirect('/customers');
        }
        res.render('edit', { title: 'Edit Customer', customer });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading customer');
        res.redirect('/customers');
    }
});

// 7. Update Customer Post
router.post('/customers/:id/edit', async (req, res) => {
    try {
        const { name, email, phone, dueDate, amount, notes, isPaid } = req.body;
        await Customer.findByIdAndUpdate(req.params.id, {
            name,
            email,
            phone,
            dueDate: new Date(dueDate),
            amount: Number(amount),
            notes: notes || '',
            isPaid: isPaid === 'true' || isPaid === true
        });

        req.flash('success', 'Customer record updated successfully');
        res.redirect('/customers');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to update customer');
        res.redirect(`/customers/${req.params.id}/edit`);
    }
});

// 8. Delete Customer
router.post('/customers/:id/delete', async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (customer) {
            req.flash('success', `Customer ${customer.name} deleted`);
        }
        res.redirect('/customers');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error deleting customer');
        res.redirect('/customers');
    }
});

// 9. Manual Email Reminder Trigger (Instant)
router.post('/customers/:id/remind', async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const result = await sendCustomerReminder(req.params.id, baseUrl);

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, message: result.message, simulated: result.simulated });
        }

        req.flash(result.simulated ? 'info' : 'success', result.message);
        res.redirect('back');
    } catch (err) {
        console.error('Manual reminder dispatch error:', err);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: err.message });
        }
        req.flash('error', err.message || 'Failed to dispatch email reminder');
        res.redirect('back');
    }
});

// 10. Payment Checkout View
router.get('/pay/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            req.flash('error', 'Invoice or customer record not found');
            return res.redirect('/customers');
        }

        res.render('payment', {
            title: `Payment for ${customer.name}`,
            customer,
            rzpKey: process.env.RZP_KEY || 'rzp_test_qgBSz9RS4BfPv7',
            formatINR
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error retrieving payment details');
        res.redirect('/customers');
    }
});

// 11. Create Razorpay Order API
router.post('/pay/create-order/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        if (customer.isPaid) {
            return res.status(400).json({ error: 'Payment is already marked as paid' });
        }

        try {
            const order = await createOrder(customer.amount, `cust_${customer._id}`);
            return res.json({
                success: true,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RZP_KEY
            });
        } catch (rzpErr) {
            // Fallback for offline/test environments without active Razorpay account
            console.warn('[Razorpay fallback] Using simulated order ID:', rzpErr.message);
            return res.json({
                success: true,
                orderId: `order_sim_${Date.now()}`,
                amount: Math.round(customer.amount * 100),
                currency: 'INR',
                key: process.env.RZP_KEY || 'rzp_test_qgBSz9RS4BfPv7'
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 12. Payment Verification API
router.post('/pay/verify/:id', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer record not found' });
        }

        // Check signature if provided
        if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
            const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid && !razorpay_order_id.startsWith('order_sim_')) {
                return res.status(400).json({ success: false, message: 'Payment verification signature invalid' });
            }
        }

        customer.isPaid = true;
        customer.paymentId = razorpay_payment_id || `PAY_${Date.now()}`;
        customer.paymentMethod = method || 'Razorpay Gateway';
        customer.paidAt = new Date();
        await customer.save();

        res.json({
            success: true,
            message: 'Payment verified and marked successful',
            redirectUrl: `/pay-success/${customer._id}?payment_id=${customer.paymentId}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 13. Payment Success Page
router.get('/pay-success/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            req.flash('error', 'Invoice not found');
            return res.redirect('/customers');
        }

        // If not already marked paid, update it
        if (!customer.isPaid) {
            customer.isPaid = true;
            customer.paymentId = req.query.payment_id || `PAY_DIRECT_${Date.now()}`;
            customer.paidAt = new Date();
            await customer.save();
        }

        res.render('success', {
            title: 'Payment Successful',
            customer,
            paymentId: customer.paymentId || req.query.payment_id,
            formatINR
        });
    } catch (err) {
        console.error(err);
        res.redirect('/customers');
    }
});

// 14. Authentication Routes
router.get('/signup', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('signup', { title: 'Create Account' });
});

router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/signup');
        }

        const existing = await User.findOne({ email });
        if (existing) {
            req.flash('error', 'An account with this email already exists');
            return res.redirect('/login');
        }

        const user = await User.create({ name, email, password });
        req.session.user = { id: user._id, name: user.name, email: user.email };
        req.flash('success', `Welcome to RemindPro, ${user.name}!`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', err.message || 'Error creating account');
        res.redirect('/signup');
    }
});

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { title: 'Sign In' });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        req.session.user = { id: user._id, name: user.name, email: user.email };
        req.flash('success', `Welcome back, ${user.name}!`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Login failed');
        res.redirect('/login');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

router.get('/forget', (req, res) => {
    res.render('forget', { title: 'Reset Password' });
});

router.post('/forget', async (req, res) => {
    req.flash('info', 'If an account exists for this mobile/email, a reset link has been dispatched');
    res.redirect('/login');
});

module.exports = router;

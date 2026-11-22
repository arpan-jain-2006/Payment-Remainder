const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Customer email is required'],
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [1, 'Amount must be greater than 0']
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paymentId: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        default: 'Razorpay'
    },
    paidAt: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    reminderCount: {
        type: Number,
        default: 0
    },
    lastReminderSent: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Virtual for overdue status
customerSchema.virtual('isOverdue').get(function() {
    if (this.isPaid) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(this.dueDate) < today;
});

// Virtual for formatted date string (DD Mon YYYY)
customerSchema.virtual('formattedDueDate').get(function() {
    if (!this.dueDate) return '';
    return new Date(this.dueDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
});

customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', customerSchema);

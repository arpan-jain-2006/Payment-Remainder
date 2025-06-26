const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    dueDate: Date,
    amount: Number,
    isPaid: { type: Boolean, default: false },
    paymentId: String
});

module.exports = mongoose.model('Customer', customerSchema);
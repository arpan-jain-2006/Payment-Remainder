const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Customer = require('../models/customer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS }
});


cron.schedule('0 9 * * *', async () => {
    const dueCustomers = await Customer.find({ dueDate: { $lte: new Date() }, isPaid: false });
    
    dueCustomers.forEach(customer => {
        transporter.sendMail({
            to: customer.email,
            subject: 'Payment Reminder',
            html: `<h1>Hi ${customer.name}, please pay ₹${customer.amount}!</h1>`
        });
    });
});
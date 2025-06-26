const express = require('express');
const router = express.Router();
const Customer = require('../models/customer');


router.get('/', (req, res) => res.render('index'));

router.get('/customers', async (req, res) => {
    const customers = await Customer.find();
    res.render('customers', { customers });
});


router.get('/add', (req, res) => res.render('add'));


router.post('/add', async (req, res) => {
    const { name, email, dueDate, amount } = req.body;
    await Customer.create({ name, email, dueDate, amount });
    res.redirect('/customers');
});


router.get('/pay/:id', async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    res.render('payment', { customer }); 
});


router.get('/pay-success/:id', async (req, res) => {
    await Customer.findByIdAndUpdate(req.params.id, {
        isPaid: true,
        paymentId: req.query.payment_id
    });
    res.redirect('/customers?success=Payment successful!');
});

router.get("/signup",(req,res)=>{
    res.render("signup")
})
 router.get("/dashboard",async (req,res)=>{
    const customers = await Customer.find();
    res.render("dashboard")
 })
 router.post("/signup",(req,res)=>{
    res.redirect("dashboard")
 })

 router.get("/login", (req,res)=>{
    res.render("login");
 })
 router.post("/login",(req,res)=>{
    res.redirect("dashboard")
 })
 router.get("/forget",(req,res)=>{
    res.render("forget");
 })
  router.post("/forget",(req,res)=>{
    res.redirect("dashboard");
 })
 

module.exports = router;
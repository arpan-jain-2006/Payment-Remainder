require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;
const path = require('path');
app.set('views', path.join(__dirname, 'views'));
const ejsMate = require("ejs-mate");
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/paymentApp')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.engine("ejs",ejsMate);


const indexRouter = require('./routes/index');
app.use('/', indexRouter);


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
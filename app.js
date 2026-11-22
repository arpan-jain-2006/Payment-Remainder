require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const { initReminderCron } = require('./services/reminder');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paymentApp';
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
    });

// Template Engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'remindpro-super-secret-key-9812',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Flash messages
app.use(flash());

// Global locals for all views
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    res.locals.currentPath = req.path;
    next();
});

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Page Not Found',
        message: 'The requested page does not exist.'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).render('404', {
        title: 'Something went wrong',
        message: err.message || 'Internal Server Error'
    });
});

// Start Server & Register Background Cron Jobs
app.listen(PORT, () => {
    console.log(`🚀 RemindPro server is running on http://localhost:${PORT}`);
    initReminderCron(`http://localhost:${PORT}`);
});

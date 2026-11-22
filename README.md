# 💳 RemindPro - Smart Payment Reminder & Dues Tracker

A full-stack Node.js, Express, and MongoDB payment reminder application with automated daily 9:00 AM email reminders, Razorpay online checkout, and real-time financial analytics dashboard.

---

## 🚀 Key Features & Optimizations

- **Architecture (MVC)**: Clean separation of concerns with `models/`, `routes/`, `views/`, `services/`, and `public/`.
- **Real-Time Financial Dashboard**:
  - Total pending dues, total collected revenue, and overdue tracking.
  - Upcoming reminders scheduled for the next 7 days.
  - Live activity table with instant status badges.
- **Automated & Manual Reminders**:
  - **Daily Cron Job**: Background worker runs every morning at 09:00 AM (`node-cron`) to scan due and overdue customers and send email notices.
  - **One-Click Manual Reminder**: Dispatch reminders anytime directly from the customer table with live loading spinners and toast notifications.
  - **Custom HTML Email Invoices**: Polished invoice email containing due amount, date, and a direct "Pay Now" link.
- **Payment Gateway (Razorpay & Direct Simulation)**:
  - Supports Razorpay test checkout with dynamic order creation and verification.
  - Quick simulation mode for development and testing without cards.
  - Payment acknowledgment receipt with print/download option.
- **Customer Dues Management**:
  - Full CRUD: Add, View, Edit, and Delete records with confirmation modals.
  - Client-side instant search filter by name, email, or phone.
  - Status tabs: All, Pending, Overdue, and Paid.
- **Modern UI / UX**:
  - Premium dark glassmorphism theme (`Plus Jakarta Sans`, FontAwesome 6, Bootstrap 5.3).
  - SweetAlert2 interactive toasts for flash messages and delete confirmations.

---

## 📁 Project Directory Structure

```text
Payment-Remainder/
├── config/
├── middleware/
├── models/
│   ├── Customer.js
│   └── User.js
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── main.js
├── routes/
│   └── index.js
├── services/
│   ├── razorpay.js
│   └── reminder.js
├── views/
│   ├── layouts/
│   │   └── boilerplate.ejs
│   ├── partials/
│   │   ├── navbar.ejs
│   │   └── footer.ejs
│   ├── 404.ejs
│   ├── add.ejs
│   ├── customers.ejs
│   ├── dashboard.ejs
│   ├── edit.ejs
│   ├── forget.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── payment.ejs
│   ├── signup.ejs
│   └── success.ejs
├── .env
├── app.js
├── index.js
├── package.json
└── README.md
```

---

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
Update `.env` with your MongoDB connection string and credentials:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/paymentApp
SESSION_SECRET=your_secret_key

# Nodemailer Gmail credentials (optional for testing)
EMAIL=your@gmail.com
EMAIL_PASS=your-gmail-app-password

# Razorpay Test Keys
RZP_KEY=rzp_test_...
RZP_SECRET=...
```

### 3. Run the Application
```bash
# Start server
npm start

# Or in development mode with auto-reload:
npm run dev
```

Visit: **`http://localhost:3000`** in your browser.

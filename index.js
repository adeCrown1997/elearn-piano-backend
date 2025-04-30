require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const authRouter = require('./routers/authRouter');
const adminRouter = require('./routers/adminRouter');
// const notificationRouter = require('./routers/notificationRouter');
const courseRouter = require('./routers/courseRouter');
const commentRouter = require('./routers/commentRouter');
const enrollmentRouter = require('./routers/enrollmentRouter');
const progressRouter = require('./routers/progressRouter');
const userDashboardRouter = require('./routers/userDashboardRouter');
const paystackRouter = require('./routers/paystackRouter');

const app = express();
app.use(cors())
app.use(helmet())
app.use(cookieParser())

app.use(express.json());
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }
    next();
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("Database connected")
}).catch((err) => {
    console.log(err)
}),

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.json({ message: 'Server is active!' });
});

app.use('/api/auth', authRouter);
app.use('/api/auth/admin', adminRouter);
// app.use('/api/auth', notificationRouter);
app.use('/api/auth', courseRouter);
app.use('/api/auth', commentRouter);
app.use('/api/auth', enrollmentRouter);
app.use('/api/auth', progressRouter);
app.use('/api/auth/user', userDashboardRouter);
app.use('/api/auth/paystack', paystackRouter);
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
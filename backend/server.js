import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import Order from './models/Order.js';
import Product from './models/Product.js';

dotenv.config();
const app = express();

// 🔒 БЕЗПЕКА: CORS приймає запити ТІЛЬКИ з твого домену (локального або бойового)
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Database CONNECTED'))
    .catch((err) => console.log('❌ Error connecting to database', err));

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage });

const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ message: 'Доступ заборонено' });

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Токен недійсний' });
    }
};

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Невірний пароль' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        let query = {}; 
        if (req.query.models) query.model = { $in: req.query.models.split(',') };
        if (req.query.conditions) query.condition = { $in: req.query.conditions.split(',') };
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
        }
        const products = await Product.find(query).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження каталогу" });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Товар не знайдено" });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Помилка отримання данних про товар" });
    }
});

app.post('/api/products', verifyAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const { title, model, price, condition, description } = req.body;
        const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const newProduct = new Product({ title, model, price, condition, description, imageUrls });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: "Помилка додавання товару" });
    }
});

app.put('/api/products/:id', verifyAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const { title, model, price, condition, description } = req.body;
        let updateData = { title, model, price, condition, description };
        if (req.files && req.files.length > 0) {
            updateData.imageUrls = req.files.map(file => `/uploads/${file.filename}`);
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: "Помилка оновлення товару" });
    }
});

app.post('/api/products/:id/reviews', async (req, res) => {
    try {
        const { name, rating, comment } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Товар не знайдено" });

        product.reviews.push({ name, rating: Number(rating), comment });
        const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
        product.rating = (totalRating / product.reviews.length).toFixed(1);

        await product.save();
        res.status(201).json({ message: "Відгук успішно додано", product });
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера" });
    }
});

app.delete('/api/products/:productId/reviews/:reviewId', verifyAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) return res.status(404).json({ message: "Товар не знайдено" });

        product.reviews = product.reviews.filter(r => r._id.toString() !== req.params.reviewId);
        if (product.reviews.length > 0) {
            const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
            product.rating = (totalRating / product.reviews.length).toFixed(1);
        } else {
            product.rating = 0;
        }

        await product.save();
        res.json({ message: "Відгук видалено", product });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення відгуку" });
    }
});

app.post('/api/products/:productId/reviews/:reviewId/reply', verifyAdmin, async (req, res) => {
    try {
        const { reply } = req.body;
        const product = await Product.findById(req.params.productId);
        if (!product) return res.status(404).json({ message: "Товар не знайдено" });

        const review = product.reviews.id(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Відгук не знайдено" });

        review.adminReply = reply;
        await product.save();
        res.json({ message: "Відповідь збережено", product });
    } catch (error) {
        res.status(500).json({ message: "Помилка відповіді на відгук" });
    }
});

app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: "Товар не знайдено" });
        res.json({ message: "Товар успішно видалено" });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення товару" });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, email, phone, address, items, totalAmount } = req.body;
        const newOrder = new Order({ customerName, email, phone, address, items, totalAmount });
        await newOrder.save();

        const merchantAccount = process.env.WAYFORPAY_ACCOUNT || 'test_merch_n1'; 
        const merchantSecret = process.env.WAYFORPAY_SECRET || 'flk3409refn54t54t*FNJRET'; 
        const merchantDomainName = process.env.CLIENT_URL || 'http://localhost:5173'; 
        const orderReference = newOrder._id.toString();
        const orderDate = Math.floor(Date.now() / 1000); 
        const amount = totalAmount; 
        const currency = 'USD';

        const productNames = items.map(item => item.title);
        const productCounts = items.map(item => item.quantity);
        const productPrices = items.map(item => item.price);

        const signatureString = `${merchantAccount};${merchantDomainName};${orderReference};${orderDate};${amount};${currency};${productNames.join(';')};${productCounts.join(';')};${productPrices.join(';')}`;
        const signature = crypto.createHmac('md5', merchantSecret).update(signatureString).digest('hex');

        res.status(201).json({ 
            orderId: newOrder._id,
            paymentData: {
                merchantAccount, merchantDomainName, orderReference, orderDate, amount, currency,
                productName: productNames, productCount: productCounts, productPrice: productPrices,
                merchantSignature: signature,
                serviceUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payment/webhook`
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Помилка при оформленні замовлення" });
    }
});

app.put('/api/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status, trackingNumber } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status, trackingNumber }, { returnDocument: 'after' });
        if (!updatedOrder) return res.status(404).json({ message: "Замовлення не знайдено" });

        if (status === 'Shipped' && trackingNumber && updatedOrder.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });

            const mailOptions = {
                from: `"FATALITY Store" <${process.env.EMAIL_USER}>`,
                to: updatedOrder.email,
                subject: '📦 Ваше замовлення відправлено!',
                html: `
                    <div style="font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 20px; border-radius: 10px; max-width: 600px; margin: auto; border: 1px solid #333;">
                        <h2 style="color: #ff0000;">Привіт, ${updatedOrder.customerName}! 🎮</h2>
                        <p style="font-size: 16px;">Ваша консоль мрії вже в дорозі. Ми успішно передали замовлення до служби доставки.</p>
                        <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff0000;">
                            <p style="margin: 0; color: #888;">Номер накладної (ТТН):</p>
                            <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #ffffff;">${trackingNumber}</p>
                        </div>
                    </div>`
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.error("❌ Помилка відправки email:", error);
            });
        }
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: "Помилка оновлення замовлення" });
    }
});

app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера" });
    }
});
app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
            return res.status(404).json({ message: "Замовлення не знайдено" });
        }
        res.json({ message: "Замовлення успішно видалено" });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення замовлення" });
    }
});

// 🔒 БЕЗПЕКА: ВЕБХУК З ПЕРЕВІРКОЮ ПІДПИСУ ВІД WAYFORPAY
app.post('/api/payment/webhook', async (req, res) => {
    try {
        let data = req.body;
        if (typeof req.body === 'string') {
            try { data = JSON.parse(req.body); } catch(e) {}
        }

        const { merchantAccount, orderReference, amount, currency, authCode, cardPan, transactionStatus, reasonCode, merchantSignature, time } = data;
        
        // 1. Отримуємо секретний ключ
        const secret = process.env.WAYFORPAY_SECRET || 'flk3409refn54t54t*FNJRET';
        
        // 2. Створюємо строку для підпису (суворий стандарт WayForPay для вебхука)
        const signString = `${merchantAccount};${orderReference};${amount};${currency};${authCode};${cardPan};${transactionStatus};${reasonCode}`;
        
        // 3. Генеруємо очікуваний підпис
        const expectedSignature = crypto.createHmac('md5', secret).update(signString).digest('hex');

        // 4. Порівнюємо підписи (Відхиляємо хакерів)
        if (merchantSignature !== expectedSignature) {
            console.warn(`⚠️ ВТРУЧАННЯ! Невірний підпис вебхука для замовлення ${orderReference}`);
            return res.status(400).send("Invalid Signature");
        }

        console.log(`\n📦 ВЕБХУК: Замовлення: ${orderReference} | Статус: ${transactionStatus}`);

        if (transactionStatus === 'Approved') {
            await Order.findByIdAndUpdate(orderReference, { status: 'Paid' }, { new: true });
        }

        const responseSignatureString = `${orderReference};accept;${time}`;
        const responseSignature = crypto.createHmac('md5', secret).update(responseSignatureString).digest('hex');

        res.status(200).json({
            orderReference: orderReference,
            status: "accept",
            time: time,
            signature: responseSignature
        });

    } catch (error) {
        console.error("❌ Помилка вебхука:", error);
        res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on ${PORT} port`));
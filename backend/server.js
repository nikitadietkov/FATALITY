import { GoogleGenAI } from '@google/genai';
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
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

import Order from './models/Order.js';
import Client from './models/Client.js';
import Product from './models/Product.js';
import CRMTask from './models/CRMTask.js';
import BuyoutRequest from './models/BuyoutRequest.js';
import ServiceRequest from './models/ServiceRequest.js';
import TradeInRequest from './models/TradeInRequest.js';

dotenv.config();
const app = express();

const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const safeClientUrl = rawClientUrl.trim().replace(/\/$/, '');

app.use(cors({
    origin: [safeClientUrl, 'http://localhost:5173', 'https://comforting-starburst-22a5df.netlify.app'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Database CONNECTED'))
    .catch((err) => console.log('❌ Error connecting to database', err));

// Настройка Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Настройка хранилища для multer в облаке
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fatality-store',
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1000, crop: 'limit' }]
    },
});

const upload = multer({ storage });

const linkClientToRequest = async (name, phone, email, docId, docType) => {
    try {
        let client = await Client.findOne({ phone });

        if (!client) {
            client = new Client({ name, phone, email });
        } else {
            if (email && !client.email) client.email = email;
            if (name) client.name = name;
        }

        if (docType === 'Order') client.orders.push(docId);
        if (docType === 'ServiceRequest') client.serviceRequests.push(docId);
        if (docType === 'TradeInRequest') client.tradeInRequests.push(docId);
        if (docType === 'BuyoutRequest') client.buyoutRequests.push(docId);

        await client.save();
    } catch (error) {
        console.error('❌ Помилка оновлення картки клієнта в CRM:', error);
    }
};

const sendTelegramMessage = async (message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
        console.log("⚠️ Telegram Bot не налаштовано (немає токена або ID чату).");
        return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: message, 
                parse_mode: 'HTML' 
            })
        });
    } catch (err) {
        console.error("❌ Помилка відправки в Telegram:", err);
    }
};

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

app.get('/api/products/meta', async (req, res) => {
    try {
        const stats = await Product.aggregate([
            { 
                $group: { 
                    _id: null, 
                    minPrice: { $min: "$price" }, 
                    maxPrice: { $max: "$price" } 
                } 
            }
        ]);
        
        if (stats.length === 0) {
            return res.json({ minPrice: 0, maxPrice: 40000 });
        }
        res.json({ minPrice: stats[0].minPrice, maxPrice: stats[0].maxPrice });
    } catch (error) {
        res.status(500).json({ message: "Помилка отримання метаданих" });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        let query = {}; 
        
        if (req.query.categories) query.category = { $in: req.query.categories.split(',') };
        if (req.query.brands) query.brand = { $in: req.query.brands.split(',') };
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
        const { title, category, brand, model, price, condition, description, searchTags, specs, weight, width, length, height } = req.body;
        
        // Зберігаємо готові посилання з Cloudinary
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        let parsedSpecs = [];
        if (specs) {
            try {
                parsedSpecs = JSON.parse(specs);
                if (!Array.isArray(parsedSpecs)) parsedSpecs = [];
            } catch (e) {
                parsedSpecs = [];
            }
        }

        const newProduct = new Product({ title, category, brand, model, price, condition, description, searchTags, imageUrls, specs: parsedSpecs });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: "Помилка додавання товару" });
    }
});

app.put('/api/products/:id', verifyAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const { title, category, brand, model, price, condition, description, searchTags, specs, weight, width, length, height } = req.body;
        let updateData = { title, category, brand, model, price, condition, description, searchTags};

        if (specs !== undefined) {
            try {
                const parsedSpecs = JSON.parse(specs);
                updateData.specs = Array.isArray(parsedSpecs) ? parsedSpecs : [];
            } catch (e) {
                updateData.specs = [];
            }
        }

        // Оновлюємо готові посилання з Cloudinary
        if (req.files && req.files.length > 0) {
            updateData.imageUrls = req.files.map(file => file.path);
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { 
                new: true, 
                runValidators: true 
            } 
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Товар не знайдено" });
        }

        res.json(updatedProduct);
    } catch (error) {
        console.error("Помилка оновлення товару:", error); 
        res.status(500).json({ message: "Помилка оновлення товару" });
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

app.post('/api/products/:id/reviews', async (req, res) => {
    try {
        const { name, rating, comment, contact } = req.body;
        const hasPurchased = await Order.findOne({
            $or: [{ email: contact }, { phone: contact }],
            status: 'Shipped'
        });

        if (!hasPurchased) {
            return res.status(403).json({ 
                message: "Відгук відхилено: ми не знайшли успішних замовлень за цим Email або номером телефону." 
            });
        }

        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Товар не знайдено" });

        product.reviews.push({ name, rating: Number(rating), comment });

        const totalRating = product.reviews.reduce((sum, rev) => sum + rev.rating, 0);
        product.rating = totalRating / product.reviews.length;

        await product.save();
        
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера при додаванні відгуку" });
    }
});

app.delete('/api/products/:productId/reviews/:reviewId', verifyAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) return res.status(404).json({ message: "Товар не знайдено" });

        product.reviews = product.reviews.filter(r => r._id.toString() !== req.params.reviewId);

        const totalRating = product.reviews.reduce((sum, rev) => sum + rev.rating, 0);
        product.rating = product.reviews.length > 0 ? (totalRating / product.reviews.length).toFixed(1) : 0;

        await product.save();
        res.json(product); 
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

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Помилка збереження відповіді" });
    }
});

app.post('/api/generate-tags', verifyAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
             return res.status(500).json({ message: "Gemini API ключ не налаштовано в .env" });
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `Проаналізуй цей товар для ігрового магазину:
Назва: ${title}
Опис: ${description || 'Опис відсутній'}

Згенеруй 20-25 релевантних пошукових тегів (синоніми, сленг, можливі помилки при написанні, пов'язані бренди). 
Поверни ЛИШЕ рядок тегів через кому, без додаткового тексту, нумерації чи лапок. Наприклад: плойка, пс5, playstation 5, соні, ігрова приставка`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        res.json({ tags: response.text.trim() });
    } catch (error) {
        console.error("Помилка генерації AI тегів:", error);
        res.status(500).json({ message: "Помилка AI. Перевірте ключ або логи сервера." });
    }
});

app.post('/api/service-requests', async (req, res) => {
    try {
        const { name, phone, consoleModel, problem } = req.body;
        const newRequest = new ServiceRequest({ name, phone, consoleModel, problem });
        await newRequest.save();

        await linkClientToRequest(name, phone, null, newRequest._id, 'ServiceRequest');
        
        const tgMessage = `
🚨 <b>НОВА ЗАЯВКА НА СЕРВІС!</b> 🚨

👤 <b>Клієнт:</b> ${name}
📞 <b>Телефон:</b> ${phone}
🎮 <b>Пристрій:</b> ${consoleModel}

💬 <b>Проблема:</b>
<i>${problem || 'Клієнт не залишив опису...'}</i>`;
        
        await sendTelegramMessage(tgMessage);
        
        res.status(201).json({ message: "Заявку успішно створено", request: newRequest });
    } catch (error) {
        res.status(500).json({ message: "Помилка при відправленні заявки" });
    }
});

app.get('/api/service-requests', verifyAdmin, async (req, res) => {
    try {
        const requests = await ServiceRequest.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження заявок" });
    }
});

app.put('/api/service-requests/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await ServiceRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Помилка оновлення статусу" });
    }
});

app.delete('/api/service-requests/:id', verifyAdmin, async (req, res) => {
    try {
        await ServiceRequest.findByIdAndDelete(req.params.id);
        res.json({ message: "Заявку видалено" });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення" });
    }
});

app.post('/api/trade-in', upload.array('images', 10), async (req, res) => {
    try {
        const { name, phone, consoleName, description } = req.body;
        let equipment = [];
        if (req.body.equipment) {
            equipment = Array.isArray(req.body.equipment) ? req.body.equipment : req.body.equipment.split(',');
        }
        
        // Зберігаємо готові посилання з Cloudinary
        const images = req.files ? req.files.map(file => file.path) : [];

        if (images.length === 0) {
            return res.status(400).json({ message: "Потрібно завантажити хоча б одне фото" });
        }

        const newTradeIn = new TradeInRequest({ name, phone, consoleName, equipment, description, images });
        await newTradeIn.save();
        
        await linkClientToRequest(name, phone, null, newTradeIn._id, 'TradeInRequest');
        const tgMessage = `
♻️ <b>НОВА ЗАЯВКА НА TRADE-IN!</b> ♻️

👤 <b>Клієнт:</b> ${name}
📞 <b>Телефон:</b> ${phone}
🎮 <b>Консоль:</b> ${consoleName}

📦 <b>Комплектація:</b> ${equipment.length > 0 ? equipment.join(', ') : 'Не вказано'}
💬 <b>Опис / Дефекти:</b>
<i>${description || 'Без опису'}</i>
📸 <b>Прикріплено фото:</b> ${images.length} шт.`;
        
        await sendTelegramMessage(tgMessage);
        res.status(201).json({ message: "Заявку успішно відправлено", request: newTradeIn });
    } catch (error) {
        res.status(500).json({ message: "Помилка при відправленні заявки" });
    }
});

app.get('/api/trade-in', verifyAdmin, async (req, res) => {
    try {
        const requests = await TradeInRequest.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження заявок" });
    }
});

app.put('/api/trade-in/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await TradeInRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Помилка оновлення статусу" });
    }
});

app.delete('/api/trade-in/:id', verifyAdmin, async (req, res) => {
    try {
        await TradeInRequest.findByIdAndDelete(req.params.id);
        res.json({ message: "Заявку видалено" });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення" });
    }
});

app.post('/api/buyout', upload.array('images', 10), async (req, res) => {
    try {
        const { name, phone, consoleName, expectedPrice, description } = req.body;
        
        let equipment = [];
        if (req.body.equipment) {
            equipment = Array.isArray(req.body.equipment) ? req.body.equipment : req.body.equipment.split(',');
        }
        
        // Зберігаємо готові посилання з Cloudinary
        const images = req.files ? req.files.map(file => file.path) : [];

        if (images.length === 0) {
            return res.status(400).json({ message: "Потрібно завантажити хоча б одне фото" });
        }

        const newBuyout = new BuyoutRequest({ name, phone, consoleName, expectedPrice, equipment, description, images });
        await newBuyout.save();

        await linkClientToRequest(name, phone, null, newBuyout._id, 'BuyoutRequest');
        
        const tgMessage = `
💰 <b>НОВА ЗАЯВКА НА ВИКУП!</b> 💰

👤 <b>Клієнт:</b> ${name}
📞 <b>Телефон:</b> ${phone}
🎮 <b>Консоль:</b> ${consoleName}
💵 <b>Очікує отримати:</b> ${expectedPrice || 'Не вказано'} грн

📦 <b>Комплектація:</b> ${equipment.length > 0 ? equipment.join(', ') : 'Не вказано'}
💬 <b>Опис:</b>
<i>${description || 'Без опису'}</i>
📸 <b>Прикріплено фото:</b> ${images.length} шт.`;
        
        await sendTelegramMessage(tgMessage);
        res.status(201).json({ message: "Заявку успішно відправлено", request: newBuyout });
    } catch (error) {
        res.status(500).json({ message: "Помилка при відправленні заявки" });
    }
});

app.get('/api/buyout', verifyAdmin, async (req, res) => {
    try {
        const requests = await BuyoutRequest.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження заявок" });
    }
});

app.put('/api/buyout/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await BuyoutRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Помилка оновлення статусу" });
    }
});

app.delete('/api/buyout/:id', verifyAdmin, async (req, res) => {
    try {
        await BuyoutRequest.findByIdAndDelete(req.params.id);
        res.json({ message: "Заявку видалено" });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення" });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, email, phone, address, items, totalAmount } = req.body;
        const newOrder = new Order({ customerName, email, phone, address, items, totalAmount });
        await newOrder.save();
        await linkClientToRequest(customerName, phone, email, newOrder._id, 'Order');

        const merchantAccount = process.env.WAYFORPAY_ACCOUNT || 'test_merch_n1'; 
        const merchantSecret = process.env.WAYFORPAY_SECRET || 'flk3409refn54t54t*FNJRET'; 
        const merchantDomainName = process.env.CLIENT_URL || 'http://localhost:5173'; 
        const orderReference = newOrder._id.toString();
        const orderDate = Math.floor(Date.now() / 1000); 
        const amount = totalAmount; 
        const currency = 'UAH'; 
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
                serviceUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payment/webhook`,
                returnUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/orders/payment-return/${orderReference}`
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Помилка при оформленні замовлення" });
    }
});

const handlePaymentReturn = (req, res) => {
    const orderId = req.params.orderId || (req.body && req.body.orderReference); 
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    if (orderId) {
        res.redirect(303, `${clientUrl}/success?orderId=${orderId}`);
    } else {
        res.redirect(303, `${clientUrl}/`);
    }
};

app.all('/api/orders/payment-return', handlePaymentReturn);
app.all('/api/orders/payment-return/:orderId', handlePaymentReturn);

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
            transporter.sendMail(mailOptions, (error, info) => {});
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
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: "Замовлення успішно видалено" });
    } catch (error) {
        res.status(500).json({ message: "Помилка видалення замовлення" });
    }
});

app.post('/api/payment/webhook', async (req, res) => {
    try {
        let data = req.body;
        if (typeof req.body === 'string') {
            try { data = JSON.parse(req.body); } catch(e) {}
        }
        
        if (!data || !data.merchantAccount) return res.status(400).send("No data received");

        const { merchantAccount, orderReference, amount, currency, authCode, cardPan, transactionStatus, reasonCode, merchantSignature, time } = data;
        const secret = process.env.WAYFORPAY_SECRET || 'flk3409refn54t54t*FNJRET';
        const signString = `${merchantAccount};${orderReference};${amount};${currency};${authCode};${cardPan};${transactionStatus};${reasonCode}`;
        const expectedSignature = crypto.createHmac('md5', secret).update(signString).digest('hex');

        if (merchantSignature !== expectedSignature) return res.status(400).send("Invalid Signature");

        if (transactionStatus === 'Approved') {
            await Order.findByIdAndUpdate(orderReference, { status: 'Paid' }, { new: true });
        }

        const responseSignatureString = `${orderReference};accept;${time}`;
        const responseSignature = crypto.createHmac('md5', secret).update(responseSignatureString).digest('hex');

        res.status(200).json({ orderReference, status: "accept", time, signature: responseSignature });
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});

app.post('/api/orders/track', async (req, res) => {
    try {
        const { orderId, phone } = req.body;
        if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: "Невірний формат ID замовлення" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Замовлення не знайдено" });
        if (order.phone !== phone) return res.status(403).json({ message: "Невірний номер телефону для цього замовлення" });

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера" });
    }
});

app.post('/api/orders/bulk', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) return res.json([]);
        const orders = await Order.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження ваших замовлень" });
    }
});

app.get('/api/crm/clients', verifyAdmin, async (req, res) => {
    try {
        const clients = await Client.find().sort({ updatedAt: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження клієнтів" });
    }
});

app.get('/api/crm/clients/:id', verifyAdmin, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id)
            .populate('orders')
            .populate('serviceRequests')
            .populate('tradeInRequests')
            .populate('buyoutRequests');
        if (!client) return res.status(404).json({ message: "Клієнта не знайдено" });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження картки клієнта" });
    }
});

app.get('/api/crm/tasks', verifyAdmin, async (req, res) => {
    try {
        const tasks = await CRMTask.find().populate('client', 'name phone').sort({ scheduledDate: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Помилка завантаження календаря" });
    }
});

app.post('/api/crm/tasks', verifyAdmin, async (req, res) => {
    try {
        const newTask = new CRMTask(req.body);
        await newTask.save();
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: "Помилка створення нагадування" });
    }
});

app.put('/api/crm/tasks/:id', verifyAdmin, async (req, res) => {
    try {
        const updatedTask = await CRMTask.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: "Помилка оновлення завдання" });
    }
});

app.post('/api/shipping/calculate', async (req, res) => {
    try {
        const { cityRecipientRef, items, totalCost } = req.body;
        
        let totalWeight = 0;
        let totalVolume = 0;

        items.forEach(item => {
            const w = item.weight || 2;
            const l = item.length || 30;
            const wd = item.width || 20;
            const h = item.height || 15;
            
            totalWeight += (w * item.quantity);
            totalVolume += (((l * wd * h) / 1000000) * item.quantity); 
        });
        const senderCityRef = process.env.NP_SENDER_CITY || "db5c88f0-391c-11dd-90d9-001a92567626";

        const npResponse = await fetch('https://api.novaposhta.ua/v2.0/json/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: process.env.NOVA_POSHTA_API_KEY,
                modelName: "InternetDocument",
                calledMethod: "getDocumentPrice",
                methodProperties: {
                    CitySender: senderCityRef,
                    CityRecipient: cityRecipientRef,
                    Weight: totalWeight.toString(),
                    VolumeGeneral: totalVolume.toString(),
                    ServiceType: "WarehouseWarehouse",
                    Cost: totalCost.toString(),
                    CargoType: "Cargo",
                    SeatsAmount: "1"
                }
            })
        });

        const data = await npResponse.json();
        
        if (data.success && data.data.length > 0) {
            res.json({ shippingCost: data.data[0].Cost });
        } else {
            console.error("Помилка НП:", data.errors);
            res.status(400).json({ error: 'Помилка прорахунку НП', details: data.errors });
        }
    } catch (error) {
        console.error("Помилка сервера при прорахунку:", error);
        res.status(500).json({ message: "Server error" });
    }
});

const PORT = process.env.PORT || 5000; 

app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});
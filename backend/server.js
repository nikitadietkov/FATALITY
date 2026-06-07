import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import Order from './models/Order.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('database CONNECTED'))
    .catch((err) => console.log('was error to connect to database', err));
app.get('/', (req, res) => {
    res.send('FATALITY server was running')
})

const PORT = process.env.PORT || 5000;
import Product from './models/Product.js';
app.get('/api/products', async (req, res) => {
    try {
        let query = { status: 'available' };

        if (req.query.models) {
            query.model = { $in: req.query.models.split(',') };
        }
        if (req.query.conditions) {
            query.condition = { $in: req.query.conditions.split(',') };
        }
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
        }

        const products = await Product.find(query);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error to take a product" });
    }
});
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Товар не найдено" });
        }
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Помилка отримання данних про товар" });
    }
});
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, phone, address, items, totalAmount } = req.body;
        
        const newOrder = new Order({
            customerName,
            phone,
            address,
            items,
            totalAmount
        });
        await newOrder.save();

        const message = `
<b>🔥 Нове замовлення у FATALITY!</b>

<b>👤 Клієнт:</b> ${customerName}
<b>📞 Телефон:</b> ${phone}
<b>📍 Адреса:</b> ${address}
<b>💰 Сума до сплати:</b> $${totalAmount}

<b>🎮 Товари:</b>
${items.map(item => `➖ ${item.title} (${item.quantity} шт.) - $${item.price * item.quantity}`).join('\n')}
        `;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
            try {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (tgError) {
                console.error("Помилка відправки в Telegram:", tgError);
            }
        }

        res.status(201).json({ message: "Замовлення успішно створено!", orderId: newOrder._id });
    } catch (error) {
        console.error("Помилка створення замовлення:", error);
        res.status(500).json({ message: "Помилка сервера при оформленні замовлення" });
    }
});
app.listen(PORT, () => {
    console.log(`server started on ${PORT} port`);
})
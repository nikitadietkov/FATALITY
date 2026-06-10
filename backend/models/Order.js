import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'Pending' },
    trackingNumber: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);
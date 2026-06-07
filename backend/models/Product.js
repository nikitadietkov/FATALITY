import mongoose from 'mongoose';

const productSchematic = new mongoose.Schema({
    title: { type: String, required: true },
    model: { type: String, required: true },
    price: { type: Number, required: true },
    condition: { type: String, required: true },
    rating: { type: Number, default: 0 },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    status: { type: String, default: 'available' },
}, { timestamps: true });

export default mongoose.model('Product', productSchematic);
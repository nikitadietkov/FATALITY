import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    adminReply: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    model: { type: String, required: true },
    price: { type: Number, required: true },
    condition: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviews: [reviewSchema],
    description: { type: String, required: true },
    imageUrls: [{ type: String, required: true }],
    status: { type: String, default: 'available' },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
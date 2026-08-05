import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    adminReply: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const specSchema = new mongoose.Schema({
    label: { type: String, required: true },
    value: { type: String, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true, default: 'Консолі' }, 
    brand: { type: String, default: 'Sony' },
    warranty: { type: String, default: '14 днів' },
    model: { type: String, required: true },
    price: { type: Number, required: true },
    condition: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviews: [reviewSchema],
    description: { type: String, required: true },
    imageUrls: [{ type: String, required: true }],
    status: { type: String, default: 'available' },
    searchTags: { type: String, default: '' },
    specs: { type: [specSchema], default: [] },
    
    weight: { type: Number, default: 2 },
    width: { type: Number, default: 20 },
    length: { type: Number, default: 30 },
    height: { type: Number, default: 15 },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
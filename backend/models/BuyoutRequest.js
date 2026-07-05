import mongoose from 'mongoose';

const buyoutRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    consoleName: { type: String, required: true }, 
    expectedPrice: { type: String, default: '' }, // Очікувана сума
    equipment: { type: [String], default: [] }, 
    description: { type: String, default: '' }, 
    images: { type: [String], required: true }, 
    status: { type: String, default: 'New' }, 
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BuyoutRequest', buyoutRequestSchema);
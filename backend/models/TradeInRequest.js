import mongoose from 'mongoose';

const tradeInRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    consoleName: { type: String, required: true },
    equipment: { type: [String], default: [] },
    description: { type: String, default: '' },
    images: { type: [String], required: true },
    status: { type: String, default: 'New' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('TradeInRequest', tradeInRequestSchema);
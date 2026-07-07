import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    serviceRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' }],
    tradeInRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TradeInRequest' }],
    buyoutRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BuyoutRequest' }],
    notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Client', clientSchema);
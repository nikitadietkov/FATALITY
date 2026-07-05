import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    consoleModel: { type: String, required: true },
    problem: { type: String, default: '' },
    status: { type: String, default: 'New' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ServiceRequest', serviceRequestSchema);
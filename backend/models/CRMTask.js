import mongoose from 'mongoose';

const crmTaskSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    type: { type: String, enum: ['Call', 'Message', 'Meeting', 'Note'], default: 'Call' },
    status: { type: String, enum: ['Pending', 'Completed', 'Cancelled'], default: 'Pending' },
    scheduledDate: { type: Date, required: true },
    description: { type: String, required: true },
    result: { type: String, default: '' },
    relatedModel: { type: String, enum: ['Order', 'TradeInRequest', 'ServiceRequest', 'BuyoutRequest', 'None'], default: 'None' },
    relatedId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

export default mongoose.model('CRMTask', crmTaskSchema);
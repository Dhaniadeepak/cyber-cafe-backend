import mongoose from 'mongoose';

export const SERVICES = ['Aadhaar', 'PAN Card', 'Printout', 'Photocopy', 'PVC Card', 'Online Form', 'Insurance', 'PM Kisan', 'Bill Payment', 'CSC Service', 'Other'];
export const MODES = ['Cash', 'UPI', 'Bank', 'Card', 'Udhar', 'Other'];

const transactionSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, index: true }, // YYYY-MM-DD
    service: { type: String, enum: SERVICES, required: true },
    customer: { type: String, trim: true, default: '',required:true },
    received: { type: Number, min: 0, default: 0 },
    paid: { type: Number, min: 0, default: 0 },
    udhar: { type: Number, min: 0 },
    mode: { type: String, enum: MODES, default: 'Cash' },
    remark: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);

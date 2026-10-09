import mongoose from 'mongoose';

export const TODO_STATUSES = ['Pending', 'In Progress', 'Done'];

const todoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    workDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: TODO_STATUSES, default: 'Pending' },
  },
  { timestamps: true }
);

export default mongoose.model('Todo', todoSchema);

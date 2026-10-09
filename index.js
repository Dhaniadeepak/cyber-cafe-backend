import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import Transaction from './models/Transaction.js';
import Todo, { TODO_STATUSES } from './models/Todo.js';
import dns from 'node:dns'
dns.setServers([
  '8.8.8.8',
  '1.1.1.1',
]);


const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));


// ---- Auth (single user / password only) ----
app.post('/api/login', (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token });
  } catch (error) {
    return next(error);
  }
});

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};

// ---- Transactions ----
// GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&q=text
app.get('/api/transactions', auth, async (req, res, next) => {
  try {
    const { from, to, q } = req.query;
    const filter = {};

    if (from || to) {
      filter.day = {};
      if (from) filter.day.$gte = from;
      if (to) filter.day.$lte = to;
    }

    if (q?.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ customer: rx }, { remark: rx }, { service: rx }];
    }

    const list = await Transaction.find(filter).sort({ day: -1, createdAt: -1 }).lean();
    return res.json(list);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/transactions', auth, async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (!String(data.customer || '').trim()) delete data.udhar;
    const transaction = await Transaction.create(data);
    return res.status(201).json(transaction);
  } catch (error) {
    return next(error);
  }
});

app.put('/api/transactions/:id', auth, async (req, res, next) => {
  try {
    const existing = await Transaction.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Transaction not found' });

    const data = { ...req.body };
    const customer = String(data.customer ?? existing.customer ?? '').trim();
    if (!customer) {
      delete data.udhar;
      data.$unset = { ...(data.$unset || {}), udhar: 1 };
    }

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    return res.json(transaction);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/transactions/:id', auth, async (req, res, next) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// ---- Todo tasks ----
app.get('/api/todos', auth, async (req, res, next) => {
  try {
    const tasks = await Todo.find().sort({ workDate: 1, createdAt: -1 }).lean();
    return res.json(tasks);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/todos', auth, async (req, res, next) => {
  try {
    const { title, description, workDate } = req.body || {};
    const task = await Todo.create({ title, description, workDate });
    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
});

app.put('/api/todos/:id', auth, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!TODO_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status' });
    }

    const task = await Todo.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    return res.json(task);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/todos/:id', auth, async (req, res, next) => {
  try {
    const task = await Todo.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Centralized API error handling.
app.use((error, req, res, next) => {
  console.error(error);

  if (error instanceof mongoose.Error.ValidationError) {
    const message = Object.values(error.errors).map((item) => item.message).join(', ');
    return res.status(400).json({ message });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'Invalid transaction id' });
  }

  return res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });

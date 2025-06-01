const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  userId: { type: String, default: uuidv4, unique: true },
  name: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  code: { type: String, required: false, default: null },
  expiry: { type: Date, required: false, default: null },
  phone: { type: String, required: false, unique: true, sparse: true },
  codeAttemptCount: { type: Number, default: 0 },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

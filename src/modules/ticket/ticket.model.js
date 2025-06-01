const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketFeatureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: Boolean, default: false }
}, { _id: false });

const ticketInfoSchema = new mongoose.Schema({
  tierName: { type: String, required: true },
  price: { type: Number},
  features: [ticketFeatureSchema]
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, default: uuidv4, unique: true },
  eventId: { type: String, required: true },
  name: { type: String },
  eventName: { type: String },
  userId: { type: String, required: true },
  number: { type: String, required: true },
  email: { type: String, required: true },
  ticketInfo: ticketInfoSchema,
  paymentScreenshot: { type: String },
  qr: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  note: { type: String }
}, { timestamps: { createdAt: 'submittedAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Ticket', ticketSchema);

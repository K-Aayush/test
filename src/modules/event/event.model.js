const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketTierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  listOfFeatures: [{ type: String }]
}, { _id: false });

const eventSchema = new mongoose.Schema({
  eventId: { type: String, default: uuidv4, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  public: { type: Boolean, default: true },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date },
  poster: { type: String },
  promoImages: [{ data: Buffer, contentType: String }],
  ticketTiers: [ticketTierSchema]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);

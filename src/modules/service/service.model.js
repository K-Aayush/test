const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const serviceSchema = new mongoose.Schema({
    serviceId: { type: String, default: uuidv4, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false, default: null },
    icon: { type: String, required: false, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    agents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }], // Array of agent IDs
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    clerkId: { type: String, required: true },
    isWhatsappEnabled: { type: Boolean, default: false },
});

// Update the updatedAt field before saving
companySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
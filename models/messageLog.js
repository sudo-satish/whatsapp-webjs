const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
    message: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
});

const MessageLog = mongoose.model('MessageLog', messageLogSchema);

module.exports = MessageLog;
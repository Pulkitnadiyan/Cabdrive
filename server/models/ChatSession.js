const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema({
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
    messages: [chatMessageSchema],
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;
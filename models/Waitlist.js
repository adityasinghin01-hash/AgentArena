const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    position: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Waitlist', waitlistSchema);

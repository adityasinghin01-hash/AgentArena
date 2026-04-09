// controllers/newsletterController.js
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const Subscriber = require('../models/Subscriber');
const { sendEmail } = require('../services/emailService');
const hashToken = require('../utils/hashToken');
const config = require('../config/config');

// POST /api/v1/newsletter/subscribe
const subscribe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check for existing active subscriber
    const existing = await Subscriber.findOne({ email });
    if (existing && existing.isActive) {
      return res.status(409).json({ message: 'This email is already subscribed.' });
    }

    // Generate unsubscribe token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const unsubscribeUrl = `${config.BASE_URL}/api/v1/newsletter/unsubscribe?token=${rawToken}`;

    if (existing && !existing.isActive) {
      // Reactivate existing subscriber
      existing.isActive = true;
      existing.unsubscribeToken = hashedToken;
      await existing.save();
    } else {
      // Create new subscriber
      await Subscriber.create({ email, unsubscribeToken: hashedToken });
    }

    // Send welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to our newsletter',
      text: `Thanks for subscribing! To unsubscribe at any time, visit: ${unsubscribeUrl}`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:40px 20px;background:#fff;">
          <h2 style="color:#111;font-size:22px;margin-bottom:8px;">You're subscribed.</h2>
          <p style="color:#444;font-size:15px;line-height:1.6;">Thanks for subscribing to our newsletter. We'll keep you updated with the latest news and updates.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
          <p style="color:#999;font-size:12px;">Don't want to hear from us? <a href="${unsubscribeUrl}" style="color:#111;">Unsubscribe</a></p>
        </div>
      `,
    });

    return res.status(201).json({ message: 'Successfully subscribed to the newsletter.' });

  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// GET /api/v1/newsletter/unsubscribe
const unsubscribe = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Unsubscribe token is required.' });
    }

    const hashedToken = hashToken(token);
    const subscriber = await Subscriber.findOne({ unsubscribeToken: hashedToken, isActive: true });

    if (!subscriber) {
      return res.status(404).json({ message: 'Invalid or expired unsubscribe link.' });
    }

    subscriber.isActive = false;
    await subscriber.save();

    // Send goodbye email
    await sendEmail({
      to: subscriber.email,
      subject: 'You have been unsubscribed',
      text: `You have been successfully unsubscribed from our newsletter.`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:40px 20px;background:#fff;">
          <h2 style="color:#111;font-size:22px;margin-bottom:8px;">You're unsubscribed.</h2>
          <p style="color:#444;font-size:15px;line-height:1.6;">You have been successfully removed from our newsletter. You won't receive any more emails from us.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
          <p style="color:#999;font-size:12px;">Changed your mind? You can resubscribe at any time.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Successfully unsubscribed.' });

  } catch (err) {
    console.error('Newsletter unsubscribe error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// GET /api/v1/newsletter/subscribers — admin only
const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find({ isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ count: subscribers.length, subscribers });
  } catch (err) {
    console.error('Get subscribers error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

module.exports = { subscribe, unsubscribe, getSubscribers };

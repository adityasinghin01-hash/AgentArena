const { validationResult } = require('express-validator');
const Waitlist = require('../models/Waitlist');
const { sendEmail } = require('../services/emailService');
const config = require('../config/config');

// POST /api/waitlist/join
const joinWaitlist = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;

    const existing = await Waitlist.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'This email is already on the waitlist.' });
    }

    const count = await Waitlist.countDocuments();
    const position = count + 1;

    await Waitlist.create({ name, email, position });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      toName: name,
      subject: 'You are on the waitlist!',
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;padding:32px 20px;color:#111;">
          <p style="font-size:16px;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">You have been added to the Spinx waitlist. Your position is <strong>#${position}</strong>.</p>
          <p style="font-size:15px;line-height:1.6;">We will reach out as soon as your access is ready.</p>
          <p style="font-size:15px;margin-top:24px;">— Aditya Singh<br/>Founder, Spinx</p>
        </div>
      `,
    });

    // Notify owner
    await sendEmail({
      to: config.OWNER_EMAIL,
      toName: config.BREVO_SENDER_NAME,
      subject: 'New Waitlist Signup',
      html: `
        <h2>New Waitlist Entry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Position:</strong> #${position}</p>
      `,
    });

    return res.status(201).json({ message: 'You have been added to the waitlist.', position });
  } catch (err) {
    console.error('Waitlist join error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// GET /api/waitlist — admin only (Phase 5)
const getWaitlist = async (req, res) => {
  try {
    const entries = await Waitlist.find({}).sort({ position: 1 });
    return res.status(200).json({ count: entries.length, entries });
  } catch (err) {
    console.error('Waitlist fetch error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

// GET /api/waitlist/export — admin only (Phase 5)
const exportWaitlist = async (req, res) => {
  try {
    const entries = await Waitlist.find({}).sort({ position: 1 });
    const csv = [
      'Position,Name,Email,Joined At',
      ...entries.map(e => `${e.position},${e.name},${e.email},${e.createdAt.toISOString()}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Waitlist export error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
};

module.exports = { joinWaitlist, getWaitlist, exportWaitlist };

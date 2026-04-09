// controllers/contactController.js
const { validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { sendEmail } = require('../services/emailService');
const config = require('../config/config');

const submitContact = async (req, res) => {
  try {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    // Save to MongoDB
    await Contact.create({ name, email, subject, message });

    // Email to owner
    await sendEmail({
      to: config.OWNER_EMAIL,
      subject: `New Contact Form Submission: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:40px 20px;background:#fff;">
          <h2 style="color:#111;font-size:22px;margin-bottom:8px;">New Contact Form Submission</h2>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
          <table style="width:100%;font-size:15px;color:#444;line-height:1.8;">
            <tr><td style="width:80px;font-weight:600;color:#111;">Name</td><td>${name}</td></tr>
            <tr><td style="font-weight:600;color:#111;">Email</td><td>${email}</td></tr>
            <tr><td style="font-weight:600;color:#111;">Subject</td><td>${subject}</td></tr>
            <tr><td style="font-weight:600;color:#111;vertical-align:top;">Message</td><td>${message}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
          <p style="color:#999;font-size:12px;">Submitted via contact form.</p>
        </div>
      `,
    });

    // Confirmation email to user
    await sendEmail({
      to: email,
      subject: 'We received your message',
      text: `Hi ${name},\n\nThanks for reaching out. We have received your message and will get back to you soon.\n\nYour message:\n${message}`,
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:40px 20px;background:#fff;">
          <h2 style="color:#111;font-size:22px;margin-bottom:8px;">Message Received</h2>
          <p style="color:#444;font-size:15px;line-height:1.6;">Hi <strong>${name}</strong>,</p>
          <p style="color:#444;font-size:15px;line-height:1.6;">Thanks for reaching out. We have received your message and will get back to you shortly.</p>
          <div style="background:#f9f9f9;border-left:3px solid #111;padding:16px 20px;margin:24px 0;border-radius:2px;">
            <p style="color:#555;font-size:14px;margin:0;line-height:1.6;">${message}</p>
          </div>
          <hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
          <p style="color:#999;font-size:12px;">You are receiving this because you submitted a contact form.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Message sent successfully.' });

  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

module.exports = { submitContact };

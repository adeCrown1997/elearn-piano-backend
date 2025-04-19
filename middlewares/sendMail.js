const nodemailer = require('nodemailer');

const transport = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Piano Learn" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
    to,
    subject,
    html,
    text: html.replace(/<[^>]+>/g, ''), // Fallback for email clients that don't support HTML
  });
};

module.exports = transport;

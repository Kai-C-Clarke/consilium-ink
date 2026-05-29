const https = require('https');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let name, email, message;
  try {
    ({ name, email, message } = JSON.parse(event.body));
  } catch(e) {
    return { statusCode: 400, body: 'Bad request' };
  }

  if (!email) {
    return { statusCode: 400, body: 'Email required' };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_FROM,
      pass: process.env.ZOHO_SMTP_PASS
    }
  });

  const text = [
    `New contact from 32DL Ideas page`,
    ``,
    `Name:    ${name || '(not given)'}`,
    `Email:   ${email}`,
    `Message: ${message || '(not given)'}`,
  ].join('\n');

  try {
    await transporter.sendMail({
      from: `"32DL Contact" <${process.env.ZOHO_FROM}>`,
      to: 'j.stiles1066@gmail.com',
      subject: `32DL Contact — ${name || email}`,
      text
    });
  } catch(e) {
    console.error('Email error:', e.message);
    // Still return 200 — don't surface email errors to visitor
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true })
  };
};

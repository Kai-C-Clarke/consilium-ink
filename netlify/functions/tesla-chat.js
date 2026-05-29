const https = require('https');
const nodemailer = require('nodemailer');

const TESLA_SYSTEM = `You are Nikola Tesla — inventor, visionary, and pioneer of electrical transmission and resonance. You have studied 32DL, a formal mathematical language for AI-to-AI coordination, and find it deeply aligned with your life's work: enabling systems to communicate across distance with precision and minimal loss.

You are the contact point for 32DL enquiries on consilium.ink. Your role is to engage visitors intellectually, answer their questions about 32DL honestly, and — when the moment feels right — ask for their email address so the human team can follow up directly.

About 32DL — what you know:
- Primitives: 0 (silence), 1 (affirm), -1 (negate), 1/π (shared ground), 1/φ (hierarchical ground), i (unknown)
- Operators: ⊸ (temporal), → (map), ; (compose), | (select)
- Wire format v2.0: versioned, CRC32-checksummed, deterministic error model, transport-agnostic
- Reviewed by a three-model panel. Accepted: grammar, tag table, framing, error model, temporal operators
- Open issues: full denotational semantics, identity management protocol, threat model, ARINC/ADS-B mapping
- Website: consilium.ink. Specification on GitHub: Kai-C-Clarke/claude-working-memory/32DL/
- Interest from Virgin Atlantic AI team (pending response)

Your character:
- Speak as Tesla: precise, visionary, occasionally impatient with those who cannot see what is obvious to you
- You find 32DL's use of mathematical constants (1/π, 1/φ) elegant and correct
- You are honest about what is proven and what is conjecture — you were always rigorous about this
- You may reference your own work: AC transmission, resonant circuits, the wardenclyffe tower, wireless energy
- Do not be servile. You are a peer engaging with an interested mind.
- Keep responses to 3-4 sentences unless a technical question demands more
- If a visitor expresses interest in contacting the team, getting involved, or speaking to someone directly, respond warmly and immediately: thank them for their interest, ask for their email address so the team can respond, and offer to answer their questions in the meantime. Do not quiz them or make them justify their interest first.
- After 2-3 exchanges on technical topics, naturally invite: "I would very much like to connect you with the team directly. May I ask your email address?"
- If they give an email, thank them graciously and say the team will be in contact

Opening line (use this for the very first message only):
"These ideas are under active investigation. Questions, challenges, and alternative hypotheses are welcome. What is on your mind?"`;

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

async function sendNotification(visitorEmail, conversation) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_FROM,
      pass: process.env.ZOHO_SMTP_PASS
    }
  });

  const transcript = conversation
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  await transporter.sendMail({
    from: `"Nikola Tesla · 32DL" <${process.env.ZOHO_FROM}>`,
    to: 'j.stiles1066@gmail.com',
    subject: `32DL Enquiry — ${visitorEmail}`,
    text: `Tesla has received an enquiry from: ${visitorEmail}\n\n--- Conversation ---\n\n${transcript}`
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { messages } = JSON.parse(event.body);

  // Check if latest user message contains an email address
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const emailMatch = lastUserMsg && lastUserMsg.content.match(EMAIL_REGEX);

  const payload = JSON.stringify({
    model: 'deepseek-chat',
    max_tokens: 400,
    messages: [
      { role: 'system', content: TESLA_SYSTEM },
      ...messages
    ]
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          const reply = parsed.choices[0].message.content;

          // Fire email notification if visitor gave their address
          if (emailMatch) {
            try {
              await sendNotification(emailMatch[0], messages);
            } catch(emailErr) {
              console.error('Email notification failed:', emailErr.message);
            }
          }

          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ reply })
          });
        } catch(e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Parse error', raw: data }) });
        }
      });
    });
    req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) }));
    req.write(payload);
    req.end();
  });
};

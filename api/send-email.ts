import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, replyTo } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'Secure Finance <onboarding@resend.dev>';

  // Test mode: no API key or key is "test"
  if (!RESEND_API_KEY || RESEND_API_KEY === 'test') {
    console.log('[TEST MODE] Email would be sent to:', to, 'Subject:', subject);
    return res.status(200).json({ success: true, demo: true, message: 'Test-modus: email niet echt verstuurd' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      // If domain not verified yet, fall through to test mode
      if (data.message?.includes('testing emails') || data.message?.includes('verify a domain')) {
        console.log('[TEST FALLBACK] Domain not verified, simulating send');
        return res.status(200).json({ success: true, demo: true, message: 'Domein nog niet geverifieerd — email gesimuleerd' });
      }
      return res.status(response.status).json({ error: data.message || 'Email send failed' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}

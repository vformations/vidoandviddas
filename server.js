require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Payment relay endpoint ──────────────────────────────────────────
app.post('/api/pay', async (req, res) => {
  const { first_name, last_name, email, mobile, pan, expiry_date, cvv, zip } = req.body;

  // Basic server-side validation
  if (!first_name || !email || !pan || !expiry_date || !cvv || !mobile) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Build the relay payload — mirrors exactly what Virtual Pay expects
  const payload = new URLSearchParams({
    merchant_id:    'acceleratewizz',
    api_key:        process.env.VIRT_API_KEY        || '',
    private_key:    process.env.VIRT_PRIVATE_KEY    || '',
    customer_id:    process.env.VIRT_CUSTOMER_ID    || '',
    requestID:      'REQ-' + Date.now(),
    redirectUrl:    (process.env.APP_URL || 'http://localhost:' + PORT) + '/success',
    narration:      'Order payment',
    amount:         '107',
    currency:       'USD',
    country:        'CY',
    city:           'Limassol',
    payment_method: 'card',
    channel:        'card',
    first_name,
    last_name:      last_name || '-',
    email,
    mobile,
    pan,
    expiry_date,
    cvv,
    zip:            zip || '',
  });

  try {
    // POST to Virtual Pay server-to-server, follow redirect manually
    const response = await fetch(
      'https://evirtualpay.com/pg/billings/acceleratewizz/payment/index.php',
      {
        method:   'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept':       'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Origin':       'https://evirtualpay.com',
          'Referer':      'https://evirtualpay.com/',
        },
        body: payload.toString(),
      }
    );

    const status = response.status;

    // If Virtual Pay redirects us → that's the 3DS URL, send it to client
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers.get('location');
      if (location) {
        return res.json({ redirectUrl: location });
      }
    }

    // If 200, read the body — might contain a redirect URL or 3DS page HTML
    const body = await response.text();

    // Try to extract a redirect URL from the response body
    const urlMatch = body.match(/https?:\/\/[^\s"'<>]+3[dD][sS][^\s"'<>]*/);
    if (urlMatch) {
      return res.json({ redirectUrl: urlMatch[0] });
    }

    // Look for any Location-like meta refresh
    const metaMatch = body.match(/content=["']?\d+;\s*url=([^"'\s>]+)/i);
    if (metaMatch) {
      return res.json({ redirectUrl: metaMatch[1] });
    }

    // Return the raw response body so we can debug what Virtual Pay sent back
    return res.json({
      status,
      debug: body.slice(0, 2000), // truncated for safety
    });

  } catch (err) {
    console.error('Relay error:', err.message);
    return res.status(500).json({ error: 'Payment relay failed. Please try again.' });
  }
});

// ── Pages ──────────────────────────────────────────────────────────
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Payment server running on http://localhost:${PORT}`);
});

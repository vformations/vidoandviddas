# Payment Relay App

Branded payment form → Node.js relay server → Virtual Pay → 3DS redirect.

No iframe. No API SDK. Client fills our form, our server POSTs to Virtual Pay
server-to-server, Virtual Pay returns a 3DS URL, we redirect the browser to it.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure credentials
```bash
cp .env.example .env
```

Edit `.env` and fill in your Virtual Pay credentials:
```
VIRT_API_KEY=your_real_api_key
VIRT_PRIVATE_KEY=your_real_private_key
VIRT_CUSTOMER_ID=your_real_customer_id
APP_URL=https://yourdomain.com
```

### 3. Run locally
```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy to production
Works on any Node.js host: Railway, Render, Fly.io, VPS, etc.

Set the environment variables in your host's dashboard (never commit `.env`).

---

## Flow

```
Client fills form (index.html)
        ↓
POST /api/pay  (JSON: card details)
        ↓
server.js builds URLSearchParams payload
        ↓
Server-to-server POST → evirtualpay.com  (redirect: manual)
        ↓
Virtual Pay returns 301/302 with Location header (3DS URL)
        ↓
Our server returns { redirectUrl } to frontend
        ↓
Frontend: window.location.href = redirectUrl
        ↓
Client browser lands on 3DS bank challenge (full page)
        ↓
On success → redirected to /success
```

---

## Files

| File | Purpose |
|------|---------|
| `server.js` | Express server + `/api/pay` relay endpoint |
| `public/index.html` | Branded payment form |
| `public/success.html` | Post-payment success page |
| `.env.example` | Credential template |

---

## Security notes

- Card data (`pan`, `cvv`) is never logged
- Credentials live in `.env`, never in frontend code
- In production set `ALLOWED_ORIGIN` to your domain only
- Use HTTPS in production (required for payment pages)

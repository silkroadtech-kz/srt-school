# SRT Academy — Telegram lead worker

A Cloudflare Worker that receives lead form submissions from `academy.silkroadtech.kz` and forwards them to a Telegram chat via the Bot API.

## How it stays secure

- The bot token never reaches the browser — it lives as a Worker secret.
- CORS allowlist: only `academy.silkroadtech.kz` and `silkroadtech.github.io` (+ a few localhosts for dev).
- Server-side payload validation: required fields, max lengths, HTML-escaped before being sent to Telegram.
- Honeypot field (`website`) — bots that fill every input get a fake `200 OK` and never hit Telegram.
- Optional per-IP rate limiting (commented in `wrangler.toml`).
- Bot ↔ chat link is direct; no third-party services in the path.

## One-time setup

### 1. Create the Telegram bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, give it a name (e.g. `SRT Academy Leads`) and a username ending in `bot` (e.g. `srt_academy_leads_bot`).
3. BotFather replies with a token like `123456789:ABC-DEF...`. **Save it** — that's your `BOT_TOKEN`.

### 2. Create the target chat and get its ID

**Option A — Telegram group (recommended for a team inbox):**

1. Create a new Telegram group.
2. Add your bot as a member.
3. In the group, send a test message like `/start@your_bot`. The bot needs to have seen at least one message in the chat.
4. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` in a browser (replace `<BOT_TOKEN>`).
5. Find `"chat":{"id": -1001234567890, ...}` — that negative number is your `CHAT_ID`.

**Option B — Channel:**

1. Create a channel, add the bot as an admin (with "Post Messages" permission).
2. Post any message in the channel.
3. Use `getUpdates` as above (or [@userinfobot](https://t.me/userinfobot) forwarded a channel post) to find the channel ID (also negative, e.g. `-1001234567890`).

### 3. Install wrangler and log in

```sh
cd worker
npm install
npx wrangler login
```

### 4. Store the secrets

```sh
npx wrangler secret put BOT_TOKEN
# paste the token from BotFather

npx wrangler secret put CHAT_ID
# paste the chat/channel id (negative number)
```

### 5. Deploy

```sh
npm run deploy
```

Wrangler will print the public URL, e.g.

```
Published srt-academy-leads
  https://srt-academy-leads.<your-subdomain>.workers.dev
```

Copy that URL into `script.js` at the top:

```js
const LEAD_ENDPOINT = "https://srt-academy-leads.<your-subdomain>.workers.dev";
```

Commit and push — GitHub Pages picks it up automatically.

### 6. Test it

From `academy.silkroadtech.kz`, submit the form. You should see the message land in the Telegram chat within a second.

Tail live logs while testing:

```sh
npm run tail
```

## Adding rate limiting (optional, recommended after launch)

1. Uncomment the `[[unsafe.bindings]]` block in `wrangler.toml`.
2. Pick any unique `namespace_id` (a small positive integer — it's just a label).
3. Adjust `limit` / `period` if you want a different cap than 5 requests per 60 seconds per IP.
4. Redeploy: `npm run deploy`.

The Worker code already checks for `env.RATE_LIMITER` and uses it when present.

## Adding Cloudflare Turnstile (optional, if spam appears)

1. Create a Turnstile site key in the Cloudflare dashboard for `academy.silkroadtech.kz`.
2. Add the Turnstile widget script + a `<div class="cf-turnstile" data-sitekey="...">` to the form in `index.html`.
3. Include the token in the request body from `script.js`.
4. In the Worker, verify the token against `https://challenges.cloudflare.com/turnstile/v0/siteverify` (using a `TURNSTILE_SECRET` secret) before forwarding to Telegram.

Don't bother with this until you actually see spam — honeypot + CORS + rate limit handles 99% of bots.

## Local dev

```sh
npm run dev
```

Wrangler runs the Worker at `http://localhost:8787`. Point `LEAD_ENDPOINT` there temporarily while developing.

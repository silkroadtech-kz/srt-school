const ALLOWED_ORIGINS = new Set([
    "https://academy.silkroadtech.kz",
    "https://silkroadtech.github.io",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:5500",
]);

const MAX_LEN = {
    name: 80,
    contact: 120,
    project: 80,
    plan: 40,
};

const escapeHtml = (value) =>
    String(value).replace(
        /[&<>]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
    );

const corsHeaders = (origin) => {
    const allowed = ALLOWED_ORIGINS.has(origin);
    return {
        "Access-Control-Allow-Origin": allowed ? origin : "",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
};

const json = (body, status, headers) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
    });

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";
        const cors = corsHeaders(origin);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: cors });
        }
        if (request.method !== "POST") {
            return new Response("Method not allowed", {
                status: 405,
                headers: cors,
            });
        }
        if (!ALLOWED_ORIGINS.has(origin)) {
            return new Response("Forbidden", { status: 403, headers: cors });
        }

        let data;
        try {
            data = await request.json();
        } catch {
            return json({ error: "Bad JSON" }, 400, cors);
        }

        // Honeypot — real users leave this blank. Pretend success so bots don't retry.
        if (typeof data.website === "string" && data.website.trim() !== "") {
            return json({ ok: true }, 200, cors);
        }

        const clean = {};
        for (const field of ["name", "contact", "project", "plan"]) {
            const value = (data[field] ?? "").toString().trim();
            if (!value) {
                return json({ error: `Missing ${field}` }, 400, cors);
            }
            if (value.length > MAX_LEN[field]) {
                return json({ error: `${field} too long` }, 400, cors);
            }
            clean[field] = value;
        }

        if (env.RATE_LIMITER) {
            const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
            const { success } = await env.RATE_LIMITER.limit({ key: ip });
            if (!success) {
                return json({ error: "Too many requests" }, 429, cors);
            }
        }

        const ip = request.headers.get("CF-Connecting-IP") || "?";
        const country = request.cf?.country || "?";
        const ua = (request.headers.get("User-Agent") || "?").slice(0, 200);
        const referer = request.headers.get("Referer") || "?";

        const text =
            `🎓 <b>Новая заявка — SRT Academy</b>\n\n` +
            `<b>Имя:</b> ${escapeHtml(clean.name)}\n` +
            `<b>Контакт:</b> ${escapeHtml(clean.contact)}\n` +
            `<b>Проект:</b> ${escapeHtml(clean.project)}\n` +
            `<b>Тариф:</b> ${escapeHtml(clean.plan)}\n\n` +
            `<i>${escapeHtml(country)} · ${escapeHtml(ip)}</i>\n` +
            `<i>${escapeHtml(referer)}</i>\n` +
            `<i>${escapeHtml(ua)}</i>`;

        const tgRes = await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: env.CHAT_ID,
                    text,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }),
            },
        );

        if (!tgRes.ok) {
            const body = await tgRes.text();
            console.error("Telegram error", tgRes.status, body);
            return json({ error: "Upstream error" }, 502, cors);
        }

        return json({ ok: true }, 200, cors);
    },
};

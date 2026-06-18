// Replace with your deployed Worker URL (Step 5 in worker/README.md).
const LEAD_ENDPOINT = "https://srt-academy-leads.rxssul-aitkali.workers.dev";

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const staggerGroups = document.querySelectorAll(".stagger");

// Index each staggered child so CSS can cascade their entrance via --i.
staggerGroups.forEach((group) => {
    Array.from(group.children).forEach((child, i) =>
        child.style.setProperty("--i", i),
    );
});

// Both plain reveals and stagger containers just need `.is-visible` toggled.
const revealItems = document.querySelectorAll(".reveal, .stagger");
const form = document.querySelector("[data-lead-form]");
const formNote = document.querySelector("[data-form-note]");
const faq = document.querySelector("[data-faq]");

const setHeaderState = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
};

const closeNav = () => {
    nav?.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

navToggle?.addEventListener("click", () => {
    const isOpen = nav?.classList.toggle("is-open");
    document.body.classList.toggle("nav-open", Boolean(isOpen));
    navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

nav?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
        closeNav();
    }
});

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.16, rootMargin: "0px 0px -40px 0px" },
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    // Pause the hero logo bob while the hero is scrolled out of view so the
    // looping animation doesn't burn the GPU off-screen.
    const heroDecor = document.querySelector(".hero-decor");
    if (heroDecor) {
        const decorObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) =>
                heroDecor.classList.toggle("is-paused", !entry.isIntersecting),
            );
        });
        decorObserver.observe(heroDecor);
    }
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}

document.querySelectorAll("[data-countdown]").forEach((node) => {
    const target = Date.parse(node.dataset.countdown);
    if (Number.isNaN(target)) return;

    const units = {
        days: node.querySelector('[data-unit="days"]'),
        hours: node.querySelector('[data-unit="hours"]'),
        minutes: node.querySelector('[data-unit="minutes"]'),
        seconds: node.querySelector('[data-unit="seconds"]'),
    };
    const srNode = node.querySelector("[data-countdown-sr]");
    const pad = (n) => String(n).padStart(2, "0");

    const render = () => {
        const diff = target - Date.now();
        if (diff <= 0) {
            units.days.textContent = "00";
            units.hours.textContent = "00";
            units.minutes.textContent = "00";
            units.seconds.textContent = "00";
            node.classList.add("is-ended");
            if (srNode) srNode.textContent = "Ранний поток закрыт.";
            return false;
        }
        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        units.days.textContent = pad(days);
        units.hours.textContent = pad(hours);
        units.minutes.textContent = pad(minutes);
        units.seconds.textContent = pad(seconds);
        if (srNode) {
            srNode.textContent = `До конца раннего потока: ${days} дн ${hours} ч ${minutes} мин.`;
        }
        return true;
    };

    if (render()) {
        const tick = setInterval(() => {
            if (!render()) clearInterval(tick);
        }, 1000);
    }
});

if (faq) {
    const faqItems = Array.from(faq.querySelectorAll("details"));
    const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileFaqAnimation = window.matchMedia("(max-width: 820px)");

    // Keep the rich height animation on mobile, where it feels smooth. On wider
    // screens the same height animation reflows a larger, blur-heavy page and can
    // stutter, so desktop/laptop FAQ toggles use an instant layout change.
    const shouldAnimateFaq = () =>
        mobileFaqAnimation.matches && !reduceMotion.matches;

    let activeAnimations = 0;
    const beginAnimation = () => {
        activeAnimations += 1;
        document.body.classList.add("faq-animating");
    };
    const endAnimation = () => {
        activeAnimations = Math.max(0, activeAnimations - 1);
        if (activeAnimations === 0)
            document.body.classList.remove("faq-animating");
    };

    const closeFaq = (details) => {
        if (!details.open || details.dataset.animating === "closing") return;
        const answer = details.querySelector(".faq-answer");
        if (!answer) return;

        details.classList.remove("is-open");

        if (!shouldAnimateFaq()) {
            details.removeAttribute("open");
            delete details.dataset.animating;
            return;
        }

        details.dataset.animating = "closing";
        beginAnimation();

        const startHeight = answer.offsetHeight;
        const anim = answer.animate(
            [{ height: `${startHeight}px` }, { height: "0px" }],
            { duration: 320, easing: EASE },
        );
        anim.onfinish = () => {
            details.removeAttribute("open");
            answer.style.height = "";
            delete details.dataset.animating;
            endAnimation();
        };
    };

    const openFaq = (details) => {
        const answer = details.querySelector(".faq-answer");
        if (!answer) return;

        details.setAttribute("open", "");
        details.classList.add("is-open");

        if (!shouldAnimateFaq()) {
            delete details.dataset.animating;
            return;
        }

        details.dataset.animating = "opening";
        beginAnimation();

        const targetHeight = answer.offsetHeight;
        const anim = answer.animate(
            [{ height: "0px" }, { height: `${targetHeight}px` }],
            { duration: 380, easing: EASE },
        );
        anim.onfinish = () => {
            answer.style.height = "";
            delete details.dataset.animating;
            endAnimation();
        };
    };

    // Sync the item rendered open in the markup.
    faqItems.forEach((details) => {
        if (details.open) details.classList.add("is-open");
    });

    faqItems.forEach((details) => {
        const summary = details.querySelector("summary");
        summary?.addEventListener("click", (event) => {
            event.preventDefault();
            if (details.classList.contains("is-open")) {
                closeFaq(details);
            } else {
                faqItems.forEach(
                    (other) => other !== details && closeFaq(other),
                );
                openFaq(details);
            }
        });
    });
}

const phoneInput = form?.querySelector("[data-phone-mask]");

// Formats KZ mobile numbers as +7 (7XX) XXX-XX-XX from raw digits.
function formatKzPhone(value) {
    let digits = value.replace(/\D/g, "");
    // Normalize a leading 8 (local prefix) to the country code 7.
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    // Assume KZ country code if it's missing.
    if (digits && !digits.startsWith("7")) digits = "7" + digits;
    digits = digits.slice(0, 11);

    if (!digits) return "";

    const rest = digits.slice(1);
    let out = "+7";
    if (rest.length > 0) out += " (" + rest.slice(0, 3);
    if (rest.length >= 3) out += ")";
    if (rest.length > 3) out += " " + rest.slice(3, 6);
    if (rest.length > 6) out += "-" + rest.slice(6, 8);
    if (rest.length > 8) out += "-" + rest.slice(8, 10);
    return out;
}

if (phoneInput) {
    const applyMask = () => {
        phoneInput.value = formatKzPhone(phoneInput.value);
    };
    phoneInput.addEventListener("input", applyMask);
    phoneInput.addEventListener("focus", () => {
        if (!phoneInput.value) phoneInput.value = "+7 (";
    });
    phoneInput.addEventListener("blur", () => {
        // Clear the placeholder prefix if the user typed nothing.
        if (phoneInput.value.replace(/\D/g, "") === "7") phoneInput.value = "";
    });
}

form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn = form.querySelector("button[type='submit']");
    const fields = Array.from(
        form.querySelectorAll("input[required], select[required]"),
    );
    const invalidFields = fields.filter((field) => !field.value.trim());

    fields.forEach((field) =>
        field.classList.toggle("is-invalid", invalidFields.includes(field)),
    );

    if (invalidFields.length > 0) {
        formNote?.classList.remove("success");
        formNote?.classList.add("error");
        if (formNote) {
            formNote.textContent =
                "Заполните обязательные поля: имя и номер телефона.";
        }
        invalidFields[0].focus();
        return;
    }

    if (phoneInput && phoneInput.value.replace(/\D/g, "").length !== 11) {
        phoneInput.classList.add("is-invalid");
        formNote?.classList.remove("success");
        formNote?.classList.add("error");
        if (formNote) {
            formNote.textContent =
                "Введите номер телефона полностью: +7 (700) 000-00-00.";
        }
        phoneInput.focus();
        return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const originalBtnText = submitBtn?.textContent;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправляем…";
    }
    formNote?.classList.remove("error", "success");
    if (formNote) formNote.textContent = "Отправляем заявку…";

    try {
        const res = await fetch(LEAD_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        window.posthog?.capture("lead_submitted", {
            age: data.age,
        });

        formNote?.classList.add("success");
        if (formNote) {
            formNote.textContent = `Спасибо, ${data.name}! Заявка ушла в Telegram — свяжемся в ближайшее время.`;
        }
        form.reset();
    } catch (err) {
        console.error("Lead submit failed", err);
        formNote?.classList.add("error");
        if (formNote) {
            formNote.textContent =
                "Отправка временно недоступна. Напишите нам напрямую в Telegram @silkroadtech или попробуйте ещё раз.";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
});

form?.addEventListener("input", (event) => {
    const field = event.target;
    if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement
    ) {
        field.classList.remove("is-invalid");
    }
});

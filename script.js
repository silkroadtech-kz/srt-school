const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const revealItems = document.querySelectorAll(".reveal");
const timeline = document.querySelector("[data-timeline]");
const form = document.querySelector("[data-lead-form]");
const formNote = document.querySelector("[data-form-note]");
const planSelect = document.querySelector("[data-plan-select]");
const planLinks = document.querySelectorAll("[data-plan]");
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
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}

timeline?.addEventListener("click", (event) => {
    const card = event.target.closest(".week-card");
    if (!card) return;

    timeline
        .querySelectorAll(".week-card")
        .forEach((item) => item.classList.remove("is-active"));
    card.classList.add("is-active");
});

planLinks.forEach((link) => {
    link.addEventListener("click", () => {
        const selectedPlan = link.dataset.plan;
        if (!selectedPlan || !planSelect) return;

        planSelect.value = selectedPlan;
        formNote?.classList.remove("success", "error");
        if (formNote) {
            formNote.textContent = `Выбран тариф ${selectedPlan}. Заполните контакты — и можно передавать заявку в Telegram/CRM после подключения backend.`;
        }
    });
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

form?.addEventListener("submit", (event) => {
    event.preventDefault();

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
                "Заполните обязательные поля: имя, контакт, проект и тариф.";
        }
        invalidFields[0].focus();
        return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    formNote?.classList.remove("error");
    formNote?.classList.add("success");

    if (formNote) {
        formNote.textContent = `Спасибо, ${data.name}! Демо-заявка на ${data.plan} сохранена в браузере. Следующий шаг — подключить отправку в Telegram, CRM или Supabase.`;
    }

    localStorage.setItem(
        "vibeCodingLead",
        JSON.stringify({
            ...data,
            createdAt: new Date().toISOString(),
        }),
    );

    form.reset();
    if (planSelect) planSelect.value = "Standard";
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

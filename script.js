/* ==========================================================================
   GlowVeda — interactions (vanilla JS, no dependencies)
   Sections: 0 Helpers · 1 Navigation · 2 Scroll effects · 3 Reveal & counters
             4 Image fallbacks · 5 Product modal · 6 Routine quiz · 7 Newsletter
   MAJOR CHANGES vs. the original are tagged "NEW" or "CHANGED".
   ========================================================================== */
(() => {
  "use strict";

  /* 0 · HELPERS ---------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // NEW: localStorage can throw (private mode, blocked cookies) — never let that break the page.
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } },
  };

  // NEW: one reusable toast for lightweight feedback.
  const toastEl = $(".toast");
  let toastTimer;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 3800);
  }

  /* 1 · NAVIGATION ------------------------------------------------------- */
  const menuToggle = $(".menu-toggle");
  const mainNav = $("#main-nav");

  function setMenu(open) {
    mainNav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }

  menuToggle.addEventListener("click", () => setMenu(!mainNav.classList.contains("open")));
  $$("a", mainNav).forEach((link) => link.addEventListener("click", () => setMenu(false)));

  // NEW: close the menu with Escape, an outside tap, or when resizing up to desktop.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("open")) { setMenu(false); menuToggle.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (mainNav.classList.contains("open") && !mainNav.contains(e.target) && !menuToggle.contains(e.target)) setMenu(false);
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  // NEW: highlight the nav link for the section currently in view.
  const navLinks = $$(".main-nav a[href^='#']:not(.nav-cta-mobile)");
  const sectionMap = new Map(navLinks.map((a) => [$(a.getAttribute("href")), a]));
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.remove("active"));
      sectionMap.get(entry.target)?.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sectionMap.forEach((_, section) => section && navObserver.observe(section));

  /* 2 · SCROLL EFFECTS --------------------------------------------------- */
  // One passive scroll listener, throttled with requestAnimationFrame, drives:
  // sticky-header state, reading progress, back-to-top button and hero parallax.
  const header = $(".site-header");
  const progress = $(".scroll-progress");
  const toTop = $(".to-top");
  const heroImage = $("[data-parallax]");
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("is-scrolled", y > 24);
    progress.style.setProperty("--p", max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
    toTop.classList.toggle("is-visible", y > 700);
    if (heroImage && !reduceMotion && window.innerWidth > 720 && y < window.innerHeight) {
      heroImage.style.setProperty("--py", `${Math.min(y * 0.06, 36).toFixed(1)}px`);
    }
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  /* 3 · REVEAL & COUNTERS ------------------------------------------------ */
  // CHANGED: siblings reveal with a small stagger (--i) and each is observed only once.
  $$(".reveal").forEach((el) => {
    const siblings = $$(".reveal", el.parentElement).filter((s) => s.parentElement === el.parentElement);
    el.style.setProperty("--i", Math.max(siblings.indexOf(el), 0));
  });
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  // NEW: the "23%" stat counts up the first time it is seen.
  const counter = $("[data-count]");
  if (counter && !reduceMotion) {
    const target = Number(counter.dataset.count);
    const counterObserver = new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const duration = 1400;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        counter.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))); // ease-out cubic
        if (t < 1) requestAnimationFrame(tick);
      };
      counter.textContent = "0";
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    counterObserver.observe(counter);
  }

  /* 4 · IMAGE FALLBACKS (NEW) -------------------------------------------- */
  // If a photo is missing or fails to load, the container gets .is-fallback and CSS
  // shows an on-brand illustration instead of a broken-image icon.
  $$(".hero-image-wrap img, .manifesto-image img").forEach((img) => {
    const container = img.parentElement;
    const fail = () => container.classList.add("is-fallback");
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener("error", fail, { once: true });
  });

  /* 5 · PRODUCT MODAL (NEW) ---------------------------------------------- */
  // Content only restates what is already on the page; nothing about formulas or prices is invented.
  const PRODUCTS = [
    { key: "cleanser", tag: "01 / CLEANSE", title: "The gentle cleanser", tone: "sage",
      lead: "A simple first step for your daily routine. Begin with a gentle cleanse to wash away the day.",
      facts: [["Routine step", "01 · The fresh start"], ["Status", "In development"], ["Ingredients", "To be announced"], ["Pricing", "To be announced"]] },
    { key: "moisturiser", tag: "02 / HYDRATE", title: "The daily moisturiser", tone: "peach",
      lead: "Everyday moisture, without the fuss. Make room for a little everyday comfort and moisture.",
      facts: [["Routine step", "02 · The comfort step"], ["Status", "In development"], ["Ingredients", "To be announced"], ["Pricing", "To be announced"]] },
    { key: "lipcare", tag: "03 / CARE", title: "The everyday lip care", tone: "lilac",
      lead: "A pocket-sized moment of self-care. Make small self-care moments part of your day.",
      facts: [["Routine step", "03 · The you moment"], ["Status", "In development"], ["Ingredients", "To be announced"], ["Pricing", "To be announced"]] },
  ];

  const modal = $("#product-modal");
  const panel = $(".modal-panel", modal);
  const modalArt = $(".modal-art", modal);
  let currentIndex = 0;
  let lastFocused = null;

  function renderProduct(index) {
    currentIndex = (index + PRODUCTS.length) % PRODUCTS.length;
    const p = PRODUCTS[currentIndex];
    $(".modal-tag", modal).textContent = p.tag;
    $("#modal-title").textContent = p.title;
    $(".modal-lead", modal).textContent = p.lead;
    modalArt.style.background = `var(--${p.tone})`;
    modalArt.replaceChildren($(`[data-product="${p.key}"] .bottle, [data-product="${p.key}"] .jar, [data-product="${p.key}"] .lip-balm`).cloneNode(true));
    const facts = $(".modal-facts", modal);
    facts.replaceChildren(...p.facts.map(([label, value]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt"); dt.textContent = label;
      const dd = document.createElement("dd"); dd.textContent = value;
      row.append(dt, dd);
      return row;
    }));
    syncSaved(); // NEW: keep the modal's save button in step with the current product
  }

  function openModal(index, trigger) {
    lastFocused = trigger || document.activeElement;
    renderProduct(index);
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => { modal.classList.add("is-open"); panel.focus(); });
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    setTimeout(() => { modal.hidden = true; lastFocused?.focus?.(); }, reduceMotion ? 0 : 320);
  }

  $$(".product-open").forEach((btn) => {
    btn.addEventListener("click", () => openModal(PRODUCTS.findIndex((p) => p.key === btn.dataset.product), btn));
  });
  $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
  $$("[data-step]", modal).forEach((btn) => btn.addEventListener("click", () => renderProduct(currentIndex + Number(btn.dataset.step))));

  // Keyboard: Esc closes, arrows browse products, Tab is trapped inside the dialog.
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") renderProduct(currentIndex + 1);
    if (e.key === "ArrowLeft") renderProduct(currentIndex - 1);
    if (e.key === "Tab") {
      const focusable = $$("button, [href], input, [tabindex]:not([tabindex='-1'])", panel).filter((el) => !el.disabled);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // "Notify me" ticks that product's interest chip and jumps to the sign-up form.
  $(".modal-notify", modal).addEventListener("click", () => {
    const key = PRODUCTS[currentIndex].key;
    lastFocused = null; // we are moving focus ourselves
    closeModal();
    goNotify([key]);
  });

  /* 6 · ROUTINE QUIZ (NEW) ----------------------------------------------- */
  // A light-hearted picker that points to one of the three routine steps already on the page.
  // It is not a skin assessment, and the result copy says so.
  const QUESTIONS = [
    { q: "What would you most like to get right first?", a: [
      ["A fresh start after a long day", "cleanse"],
      ["Everyday comfort that lasts", "moisturise"],
      ["A small feel-good ritual", "care"] ] },
    { q: "Where are you on your skincare journey?", a: [
      ["Just starting out", "cleanse"],
      ["I have the basics and want more comfort", "moisturise"],
      ["I like small, simple treats", "care"] ] },
    { q: "When do you think about your skin most?", a: [
      ["After a day out and about", "cleanse"],
      ["When it feels like it needs a little comfort", "moisturise"],
      ["When I want to pause for a moment", "care"] ] },
  ];
  const RESULTS = {
    cleanse: { step: 0, product: "cleanser", name: "Cleanse", line: "The fresh start", text: "Begin with a gentle cleanse to wash away the day. It's a simple first step that keeps things easy." },
    moisturise: { step: 1, product: "moisturiser", name: "Moisturise", line: "The comfort step", text: "Make room for a little everyday comfort and moisture, without the fuss." },
    care: { step: 2, product: "lipcare", name: "Care", line: "The you moment", text: "Make small self-care moments part of your day. A pocket-sized ritual is a lovely place to begin." },
  };

  const quiz = $("#quiz");
  const quizBody = $(".quiz-body", quiz);
  const routineSteps = $$(".routine-step");
  let picks = [];

  function setQuizProgress(fraction) { quiz.style.setProperty("--q", fraction); }

  function renderQuestion() {
    const i = picks.length;
    const { q, a } = QUESTIONS[i];
    setQuizProgress(i / QUESTIONS.length);
    const wrap = document.createElement("div");
    wrap.className = "quiz-step";
    wrap.innerHTML = `<span class="quiz-count">QUESTION ${i + 1} OF ${QUESTIONS.length}</span><p class="quiz-q"></p><div class="quiz-options"></div>`;
    $(".quiz-q", wrap).textContent = q;
    const options = $(".quiz-options", wrap);
    a.forEach(([label, value]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "quiz-option"; b.textContent = label;
      b.addEventListener("click", () => { picks.push(value); picks.length === QUESTIONS.length ? renderResult() : renderQuestion(); });
      options.append(b);
    });
    if (i > 0) {
      const back = document.createElement("button");
      back.type = "button"; back.className = "quiz-back"; back.textContent = "← Back";
      back.addEventListener("click", () => { picks.pop(); renderQuestion(); });
      wrap.append(back);
    }
    quizBody.replaceChildren(wrap);
    routineSteps.forEach((s) => s.classList.remove("is-picked"));
    if (i > 0) $(".quiz-option", wrap).focus({ preventScroll: true });
  }

  function renderResult() {
    // Most common answer wins; ties go to whichever answer was picked first.
    const tally = picks.reduce((t, k) => ((t[k] = (t[k] || 0) + 1), t), {});
    const top = Math.max(...Object.values(tally));
    const winner = picks.find((k) => tally[k] === top);
    const r = RESULTS[winner];
    setQuizProgress(1);

    const wrap = document.createElement("div");
    wrap.className = "quiz-step quiz-result";
    wrap.innerHTML = `<span class="quiz-count"></span><h4>Start with <em></em></h4><p class="r-text"></p>
      <p class="r-note">A friendly pointer, not a skin assessment. Choose products based on your own skin needs.</p>
      <div class="quiz-actions"></div>`;
    $(".quiz-count", wrap).textContent = `YOUR SIMPLE START · ${r.line.toUpperCase()}`;
    $("em", wrap).textContent = `${r.name.toLowerCase()}.`;
    $(".r-text", wrap).textContent = r.text;
    $(".r-note", wrap).style.fontSize = "12px";

    const actions = $(".quiz-actions", wrap);
    const see = document.createElement("button");
    see.type = "button"; see.className = "button button-dark"; see.innerHTML = "See the range <span>↗</span>";
    see.addEventListener("click", () => openModal(PRODUCTS.findIndex((p) => p.key === r.product), see));
    const join = document.createElement("a");
    join.className = "text-link"; join.href = "#newsletter"; join.innerHTML = "Join the early-access list <span>↓</span>";
    const again = document.createElement("button");
    again.type = "button"; again.className = "text-link"; again.textContent = "Retake";
    again.addEventListener("click", () => { picks = []; renderQuestion(); });
    const share = document.createElement("button");
    share.type = "button"; share.className = "text-link"; share.textContent = "Share my result";
    share.addEventListener("click", () => shareText(`My GlowVeda simple start: ${r.name.toLowerCase()}.`));
    actions.append(see, join, share, again);

    quizBody.replaceChildren(wrap);
    routineSteps.forEach((s, i) => s.classList.toggle("is-picked", i === r.step));
    celebrate($(".quiz-result h4", wrap) || quizBody, ["✳", "♡"], 10); // NEW: tiny celebration
  }

  renderQuestion();

  /* 7 · NEWSLETTER ------------------------------------------------------- */
  // CHANGED: the original only checked "not empty". Now: email validation, inline errors,
  // a loading state, duplicate detection and a toast. Submissions are saved in this browser
  // only (demo) — swap the setTimeout block for a real API call / email platform when ready.
  const signupForm = $("#signup-form");
  const emailInput = $("#email");
  const formMessage = $("#form-message");
  const submitBtn = $("button[type='submit']", signupForm);
  const DEFAULT_MESSAGE = formMessage.textContent;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setMessage(text, state) {
    formMessage.textContent = text;
    formMessage.classList.toggle("is-error", state === "error");
    formMessage.classList.toggle("is-success", state === "success");
  }

  emailInput.addEventListener("input", () => {
    signupForm.classList.remove("is-invalid");
    emailInput.removeAttribute("aria-invalid");
    if (formMessage.classList.contains("is-error")) setMessage(DEFAULT_MESSAGE);
  });

  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      signupForm.classList.remove("is-invalid");
      void signupForm.offsetWidth; // restart the shake animation
      signupForm.classList.add("is-invalid");
      emailInput.setAttribute("aria-invalid", "true");
      setMessage(email ? "That email doesn't look quite right — could you check it?" : "Please add your email address.", "error");
      emailInput.focus();
      return;
    }

    const list = store.get("glowveda:subscribers", []);
    if (list.some((entry) => entry.email === email)) {
      setMessage("You're already on the list — thank you!", "success");
      showToast("You're already on the list ✳");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    // Simulated request. Replace with fetch("/your-endpoint", { method: "POST", body: ... }).
    setTimeout(() => {
      list.push({ email, interests: selectedInterests(), at: new Date().toISOString() });
      store.set("glowveda:subscribers", list);
      signupForm.reset();
      setInterests([]);
      celebrate(submitBtn, ["✳", "♡", "·"], 18); // NEW: confetti on success
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      setMessage("Thanks for your interest — the GlowVeda story is just getting started.", "success");
      showToast("You're on the list ✳ We'll be in touch.");
    }, reduceMotion ? 0 : 700);
  });

  /* 8 · INTEREST CHIPS (NEW) --------------------------------------------- */
  function selectedInterests() { return $$("input[name='interest']:checked").map((i) => i.value); }
  function setInterests(keys) { $$("input[name='interest']").forEach((i) => { i.checked = keys.includes(i.value); }); }

  // Used by the product modal and the saved drawer: pre-tick interests, scroll to the form, focus the email field.
  function goNotify(keys) {
    setInterests(keys);
    setTimeout(() => {
      $("#newsletter").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      setMessage("Add your email and we'll keep you posted on what you picked.");
      setTimeout(() => emailInput.focus({ preventScroll: true }), 500);
    }, 340);
  }

  /* 9 · FUN EFFECTS (NEW) ------------------------------------------------- */
  // Tiny particles built with the Web Animations API (no canvas, no libraries).
  // Celebrations always run unless the visitor prefers reduced motion; the cursor trail
  // and click sparkles can also be switched off with the footer toggle.
  const FX_COLORS = ["#bd7153", "#d6b18d", "#526b50", "#e8a98a", "#8fa58b"];
  let fxCount = 0;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let sparkles = !reduceMotion && finePointer && store.get("glowveda:sparkles", true);

  function spawn(x, y, char, { dx = 0, dy = -30, rot = 0, size = 14, dur = 800, gravity = 0 } = {}) {
    if (reduceMotion || fxCount > 70) return;
    const el = document.createElement("span");
    el.className = "fx";
    el.textContent = char;
    el.setAttribute("aria-hidden", "true");
    el.style.fontSize = `${size}px`;
    el.style.color = FX_COLORS[(Math.random() * FX_COLORS.length) | 0];
    document.body.append(el);
    fxCount++;
    el.animate([
      { transform: `translate(${x}px, ${y}px) scale(.3)`, opacity: 1 },
      { transform: `translate(${x + dx * 0.6}px, ${y + dy}px) rotate(${rot * 0.6}deg) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x + dx}px, ${y + dy + gravity}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
    ], { duration: dur, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => { el.remove(); fxCount--; };
  }

  function burst(x, y, chars, count = 8, spread = 70, gravity = 40) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = spread * (0.5 + Math.random() * 0.7);
      spawn(x, y, chars[i % chars.length], {
        dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 20, gravity,
        rot: (Math.random() - 0.5) * 240, size: 10 + Math.random() * 10, dur: 700 + Math.random() * 400,
      });
    }
  }
  function celebrate(el, chars = ["✳", "♡"], count = 14) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, chars, count, 90, 60);
  }

  // Cursor sparkle trail (mouse only, throttled).
  let lastX = 0, lastY = 0, lastT = 0;
  window.addEventListener("pointermove", (e) => {
    if (!sparkles || e.pointerType !== "mouse") return;
    const now = performance.now();
    if (now - lastT < 55 || Math.hypot(e.clientX - lastX, e.clientY - lastY) < 18) return;
    lastT = now; lastX = e.clientX; lastY = e.clientY;
    spawn(e.clientX, e.clientY, Math.random() < 0.5 ? "✳" : "·", {
      dx: (Math.random() - 0.5) * 26, dy: 10 + Math.random() * 16, size: 9 + Math.random() * 8, dur: 700, rot: (Math.random() - 0.5) * 90,
    });
  }, { passive: true });

  // Click sparkles on buttons and playful clicks on the hero picture.
  document.addEventListener("click", (e) => {
    if (!sparkles) return;
    if (e.target.closest(".button, .header-cta, .quiz-option, .saved-btn, .chip span")) burst(e.clientX, e.clientY, ["✳", "·"], 5, 40, 20);
  });
  heroImage?.addEventListener("click", (e) => burst(e.clientX, e.clientY, ["✳", "♡", "·"], 9, 80, 50));

  // Footer toggle for the sparkles.
  const sparkleToggle = $(".sparkle-toggle");
  if (reduceMotion || !finePointer) {
    sparkleToggle.hidden = true; // nothing to toggle on touch screens / reduced motion
  } else {
    const paint = () => {
      sparkleToggle.setAttribute("aria-pressed", String(sparkles));
      sparkleToggle.textContent = `✳ Sparkles: ${sparkles ? "on" : "off"}`;
    };
    paint();
    sparkleToggle.addEventListener("click", () => { sparkles = !sparkles; store.set("glowveda:sparkles", sparkles); paint(); });
  }

  /* 10 · SHARE (NEW) ------------------------------------------------------ */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      try { // fallback for older browsers / insecure contexts
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
        document.body.append(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove(); return ok;
      } catch { return false; }
    }
  }
  async function shareText(text) {
    if (navigator.share) {
      try { await navigator.share({ title: "GlowVeda", text, url: location.href }); return; }
      catch (err) { if (err.name === "AbortError") return; }
    }
    showToast((await copyText(`${text} ${location.href}`)) ? "Link copied ✳" : "Couldn't copy — you can share the page address instead.");
  }
  $(".share-btn").addEventListener("click", () => shareText("Gentle, approachable skincare is on its way — meet GlowVeda."));

  /* 11 · SAVED FOR LATER (NEW) -------------------------------------------- */
  // Hearts on the product cards + a modal button. Saved items live in localStorage
  // and show in a drawer opened from the header.
  let saved = store.get("glowveda:saved", []).filter((k) => PRODUCTS.some((p) => p.key === k));
  const savedBtn = $(".saved-btn");
  const savedCount = $(".saved-count");
  const drawer = $("#saved-drawer");
  const drawerPanel = $(".drawer-panel", drawer);
  const savedList = $(".saved-list", drawer);
  const modalSave = $(".modal-save", modal);
  let drawerOpener = null;

  function syncSaved() {
    // Hearts on cards
    $$("[data-heart]").forEach((h) => {
      const on = saved.includes(h.dataset.heart);
      h.classList.toggle("is-on", on);
      h.setAttribute("aria-pressed", String(on));
      $("span", h).textContent = on ? "♥" : "♡";
    });
    // Modal button (reflects the product currently shown)
    const current = PRODUCTS[currentIndex]?.key;
    const modalOn = saved.includes(current);
    modalSave.classList.toggle("is-on", modalOn);
    modalSave.setAttribute("aria-pressed", String(modalOn));
    $(".mh", modalSave).textContent = modalOn ? "♥" : "♡";
    $(".ms", modalSave).textContent = modalOn ? "Saved" : "Save for later";
    // Header badge
    savedCount.hidden = saved.length === 0;
    savedCount.textContent = String(saved.length);
    // Drawer list
    savedList.replaceChildren(...saved.map((key) => {
      const p = PRODUCTS.find((x) => x.key === key);
      const li = document.createElement("li");
      li.className = "saved-item";
      li.innerHTML = `<span class="dot ${p.tone}" aria-hidden="true"></span><button type="button" class="open"><b></b><small></small></button><button type="button" class="remove">✕</button>`;
      $("b", li).textContent = p.title;
      $("small", li).textContent = `${p.tag} · IN DEVELOPMENT`;
      $(".remove", li).setAttribute("aria-label", `Remove ${p.title} from saved`);
      $(".open", li).addEventListener("click", () => { closeDrawer(false); openModal(PRODUCTS.indexOf(p), savedBtn); });
      $(".remove", li).addEventListener("click", () => toggleSaved(key));
      return li;
    }));
    drawer.classList.toggle("is-empty", saved.length === 0);
    store.set("glowveda:saved", saved);
  }

  function toggleSaved(key, originEl) {
    const adding = !saved.includes(key);
    saved = adding ? [...saved, key] : saved.filter((k) => k !== key);
    syncSaved();
    if (adding) {
      if (originEl) celebrate(originEl, ["♥", "♡"], 7);
      savedBtn.classList.remove("pop"); savedCount.classList.remove("pop");
      void savedBtn.offsetWidth;
      savedBtn.classList.add("pop"); savedCount.classList.add("pop");
      showToast("Saved for later ♡");
    }
  }

  $$("[data-heart]").forEach((h) => h.addEventListener("click", () => toggleSaved(h.dataset.heart, h)));
  modalSave.addEventListener("click", () => toggleSaved(PRODUCTS[currentIndex].key, modalSave));

  function openDrawer() {
    drawerOpener = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => { drawer.classList.add("is-open"); drawerPanel.focus(); });
  }
  function closeDrawer(restoreFocus = true) {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    // Keep scroll locked if a modal is about to open on top.
    if (restoreFocus) document.body.classList.remove("no-scroll");
    setTimeout(() => { drawer.hidden = true; if (restoreFocus) drawerOpener?.focus?.(); }, reduceMotion ? 0 : 450);
  }
  savedBtn.addEventListener("click", openDrawer);
  $$("[data-drawer-close]", drawer).forEach((el) => el.addEventListener("click", () => closeDrawer()));
  $(".drawer-clear", drawer).addEventListener("click", () => { saved = []; syncSaved(); });
  $(".drawer-notify", drawer).addEventListener("click", () => { const keys = [...saved]; closeDrawer(false); document.body.classList.remove("no-scroll"); goNotify(keys); });
  drawer.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
    if (e.key === "Tab") { // trap focus in the drawer
      const f = $$("button:not([disabled])", drawerPanel);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  syncSaved();

  /* 12 · DAILY RITUAL TRACKER (NEW) --------------------------------------- */
  // Three ticks per day, a 7-day dot row and a streak (days where all three were ticked).
  // Stored locally as { "YYYY-MM-DD": [bool, bool, bool] }. A habit tracker only, not advice.
  const RITUAL_KEY = "glowveda:ritual";
  const ritualBoxes = $$("#ritual input[data-r]");
  const pal = $(".pal");
  const statusEl = $("#ritual-status");
  const streakBox = $(".streak");
  const streakNum = $("#streak-count");
  const weekEl = $("#week");
  let ritual = store.get(RITUAL_KEY, {});

  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const countFor = (key) => (ritual[key] || []).filter(Boolean).length;
  const STATUS = [
    "Tick each step as you go. Saved on this device only.",
    "A lovely start ✳",
    "Almost there!",
    "All done today — nicely done ✳",
  ];

  function currentStreak() {
    const d = new Date();
    if (countFor(dayKey(d)) < 3) d.setDate(d.getDate() - 1); // today may still be in progress
    let n = 0;
    while (countFor(dayKey(d)) === 3) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function renderRitual() {
    const today = ritual[dayKey()] || [false, false, false];
    ritualBoxes.forEach((box, i) => { box.checked = !!today[i]; });
    const done = today.filter(Boolean).length;
    pal.dataset.level = String(done);
    statusEl.textContent = STATUS[done];

    const streak = currentStreak();
    if (streakNum.textContent !== String(streak)) {
      streakNum.textContent = String(streak);
      streakBox.classList.remove("bump"); void streakBox.offsetWidth; streakBox.classList.add("bump");
    }

    weekEl.replaceChildren(...Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const n = countFor(dayKey(d));
      const cell = document.createElement("div");
      cell.className = `day${n === 3 ? " done" : n > 0 ? " part" : ""}${i === 6 ? " today" : ""}`;
      cell.title = `${d.toLocaleDateString(undefined, { weekday: "long" })}: ${n} of 3`;
      cell.innerHTML = "<i></i><span></span>";
      $("span", cell).textContent = d.toLocaleDateString(undefined, { weekday: "narrow" });
      return cell;
    }));
    weekEl.setAttribute("aria-label", `Your last 7 days. Today: ${done} of 3 steps. Streak: ${streak} ${streak === 1 ? "day" : "days"}.`);
  }

  function saveRitual() {
    // Keep only the last 60 days so storage never grows.
    const keys = Object.keys(ritual).sort().slice(-60);
    ritual = Object.fromEntries(keys.map((k) => [k, ritual[k]]));
    store.set(RITUAL_KEY, ritual);
  }

  ritualBoxes.forEach((box) => box.addEventListener("change", () => {
    const key = dayKey();
    const before = countFor(key);
    const today = ritual[key] ? [...ritual[key]] : [false, false, false];
    today[Number(box.dataset.r)] = box.checked;
    ritual[key] = today;
    saveRitual();
    renderRitual();
    pal.classList.remove("hop"); void pal.offsetWidth; pal.classList.add("hop");
    if (box.checked) celebrate(box.nextElementSibling, ["✳", "·"], 6);
    if (before < 3 && countFor(key) === 3) { celebrate(pal, ["✳", "♡", "·"], 22); showToast("Ritual complete — look at that glow ✳"); }
  }));
  pal.addEventListener("animationend", (e) => { if (e.animationName === "hop") pal.classList.remove("hop"); });
  $(".ritual-reset").addEventListener("click", () => { delete ritual[dayKey()]; saveRitual(); renderRitual(); showToast("Today's ritual reset"); });
  renderRitual();

  /* Footer year (kept from the original) */
  $("#year").textContent = new Date().getFullYear();
})();


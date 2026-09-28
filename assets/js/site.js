/* ==========================================================================
   site.js — theme, language, nav, reveal.
   No dependencies. Every storage access is guarded: a blocked or private
   browser must still render and behave correctly.
   ========================================================================== */
(function () {
  'use strict';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* ---------------- theme ---------------- */
  var root = document.documentElement;

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f6f7fa' : '#0a0f1c');
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
      el.hidden = el.getAttribute('data-theme-icon') !== t;
    });
  }

  var saved = store.get('theme');
  var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));

  var themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      store.set('theme', next);
    });
  }

  /* ---------------- language ----------------
     English lives in the DOM. Vietnamese lives next to it in data-vi /
     data-vi-html, so the two never drift apart in separate files.        */
  function applyLang(lang) {
    var vi = lang === 'vi';
    root.setAttribute('lang', vi ? 'vi' : 'en');

    document.querySelectorAll('[data-vi], [data-vi-html]').forEach(function (el) {
      var html = el.hasAttribute('data-vi-html');
      var key = html ? 'data-vi-html' : 'data-vi';
      if (!el.hasAttribute('data-en-cache')) {
        el.setAttribute('data-en-cache', html ? el.innerHTML : el.textContent);
      }
      var next = vi ? el.getAttribute(key) : el.getAttribute('data-en-cache');
      if (html) { el.innerHTML = next; } else { el.textContent = next; }
    });

    document.querySelectorAll('[data-lang-on]').forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-lang-on') === lang);
      el.classList.toggle('off', el.getAttribute('data-lang-on') !== lang);
    });
  }

  var savedLang = store.get('lang');
  var lang = savedLang === 'vi' || savedLang === 'en'
    ? savedLang
    : ((navigator.language || '').toLowerCase().indexOf('vi') === 0 ? 'vi' : 'en');
  applyLang(lang);

  var langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      lang = lang === 'vi' ? 'en' : 'vi';
      applyLang(lang);
      store.set('lang', lang);
    });
  }

  /* ---------------- mobile nav ---------------- */
  var links = document.getElementById('nav-links');
  var burger = document.getElementById('burger');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- scroll spy ---------------- */
  var navA = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var sections = navA
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navA.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------------- reveal on scroll ---------------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        // Deep-linking past a section (e.g. #contact) means it never
        // intersects; anything already scrolled above is revealed outright.
        if (!en.isIntersecting && en.boundingClientRect.top > 0) return;
        en.target.classList.add('in');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rv.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 55 + 'ms';
      io.observe(el);
    });

    // A fast scroll can take an element from below the fold to above it
    // between two frames. The intersection state never changes, so no
    // callback fires and the element would stay invisible for good.
    var sweep = function () {
      var left = document.querySelectorAll('.rv:not(.in)');
      if (!left.length) {
        window.removeEventListener('scroll', sweep);
        return;
      }
      left.forEach(function (el) {
        if (el.getBoundingClientRect().bottom < 0) el.classList.add('in');
      });
    };
    window.addEventListener('scroll', sweep, { passive: true });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- year ---------------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

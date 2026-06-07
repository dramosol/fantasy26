'use strict';
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');
const router = express.Router();
const db = require(path.join(process.cwd(), 'src', 'db', 'index'));
const { getNews } = require(path.join(process.cwd(), 'src', 'services', 'rssService'));
const SL = String.fromCharCode(47);

// Email gate middleware
function requireSubscriber(req, res, next) {
  const exempt = [SL + 'entrar', SL + 'suscribir', SL + 'baja', SL + 'admin'];
  const isExempt = exempt.some(function(p) { return req.path === p || req.path.startsWith(p + SL); });
  if (isExempt || req.cookies.subscriber_email) return next();
  res.redirect(SL + 'entrar');
}

router.use(requireSubscriber);

// Email gate
router.get(SL + 'entrar', function(req, res) {
  if (req.cookies.subscriber_email) return res.redirect(SL);
  res.render('gate', { title: 'Bienvenido - Fantasy FIFA 2026', error: null });
});

router.post(SL + 'suscribir', function(req, res) {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.render('gate', { title: 'Bienvenido - Fantasy FIFA 2026', error: 'Email invalido' });
  }
  const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email);
  if (!existing) {
    const tok = crypto.randomBytes(20).toString('hex');
    db.prepare('INSERT INTO subscribers (email, unsubscribe_token) VALUES (?, ?)').run(email, tok);
  }
  res.cookie('subscriber_email', email, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
  res.redirect(SL);
});

// Unsubscribe
router.get(SL + 'baja' + SL + ':code', function(req, res) {
  const code = req.params.code;
  const sub = db.prepare('SELECT * FROM subscribers WHERE unsubscribe_token = ?').get(code);
  if (!sub) return res.render('unsub', { title: 'Baja', done: false, error: 'Enlace invalido' });
  db.prepare('UPDATE subscribers SET unsubscribed_at = ? WHERE id = ?').run(new Date().toISOString(), sub.id);
  res.clearCookie('subscriber_email');
  res.render('unsub', { title: 'Baja confirmada', done: true, error: null });
});

// Home - standings + news + reminders
router.get(SL, async function(req, res) {
  const standing = db.prepare('SELECT * FROM current_standings WHERE id = 1').get();
  const payload = standing ? JSON.parse(standing.payload) : null;
  const reminders = db.prepare('SELECT * FROM reminders WHERE active = 1 ORDER BY sort_order').all();
  const news = await getNews(12).catch(function() { return []; });
  res.render('index', {
    title: 'Fantasy FIFA 2026 - Tabla General',
    payload,
    updatedAt: standing ? standing.updated_at : null,
    reminders,
    news
  });
});

// History
router.get(SL + 'historia', function(req, res) {
  const snaps = db.prepare('SELECT gameweek, captured_at, saved_at FROM gameweek_snapshots ORDER BY gameweek DESC').all();
  res.render('history', { title: 'Historico de Jornadas', snaps });
});

router.get(SL + 'historia' + SL + ':gw', function(req, res) {
  const gw = parseInt(req.params.gw, 10);
  const snap = db.prepare('SELECT * FROM gameweek_snapshots WHERE gameweek = ?').get(gw);
  if (!snap) return res.status(404).render('404', { title: '404' });
  res.render('snapshot', { title: 'Jornada ' + gw, gw, payload: JSON.parse(snap.payload), savedAt: snap.saved_at });
});

// Rules page
router.get(SL + 'reglas', function(req, res) {
  const sections = db.prepare('SELECT * FROM rules_sections ORDER BY sort_order').all().map(function(s) {
    return Object.assign({}, s, { html: sanitizeHtml(marked.parse(s.body_md)) });
  });
  const reminders = db.prepare('SELECT * FROM reminders WHERE active = 1 ORDER BY sort_order').all();
  res.render('rules', { title: 'Reglas - Fantasy FIFA 2026', sections, reminders });
});

module.exports = router;

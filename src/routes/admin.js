'use strict';
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require(path.join(process.cwd(), 'src', 'db', 'index'));
const requireAdmin = require(path.join(process.cwd(), 'src', 'middleware', 'requireAdmin'));
const { validateStandings } = require(path.join(process.cwd(), 'src', 'services', 'validateStandings'));
const { sendGameweekEmail } = require(path.join(process.cwd(), 'src', 'services', 'emailService'));
const { refreshSource } = require(path.join(process.cwd(), 'src', 'services', 'rssService'));
const SL = String.fromCharCode(47);

// Login
router.get(SL + 'login', function(req, res) {
  if (req.session.isAdmin) return res.redirect(SL + 'admin');
  res.render('admin/login', { title: 'Admin Login', error: null });
});

router.post(SL + 'login', async function(req, res) {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  if (!admin || admin.username !== username) {
    return res.render('admin/login', { title: 'Admin Login', error: 'Credenciales incorrectas' });
  }
  const ok = await bcrypt.compare(password, admin.pass_hash);
  if (!ok) {
    return res.render('admin/login', { title: 'Admin Login', error: 'Credenciales incorrectas' });
  }
  req.session.isAdmin = true;
  res.redirect(SL + 'admin');
});

router.get(SL + 'logout', function(req, res) {
  req.session.destroy();
  res.redirect(SL + 'admin' + SL + 'login');
});

// Dashboard
router.get(SL, requireAdmin, function(req, res) {
  const standing = db.prepare('SELECT * FROM current_standings WHERE id = 1').get();
  const snapshots = db.prepare('SELECT gameweek, captured_at, saved_at FROM gameweek_snapshots ORDER BY gameweek DESC').all();
  const subCount = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE unsubscribed_at IS NULL').get().n;
  res.render('admin/dashboard', {
    title: 'Admin - Dashboard',
    hasStandings: !!standing,
    snaps: snapshots,
    subCount
  });
});

// Paste standings
router.get(SL + 'paste', requireAdmin, function(req, res) {
  const subCount = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE unsubscribed_at IS NULL').get().n;
  res.render('admin/paste', { title: 'Admin - Cargar Tabla', subCount, error: null, preview: null, prompt: null });
});

router.post(SL + 'paste', requireAdmin, async function(req, res) {
  const { raw_json, mode, gameweek } = req.body;
  let data;
  try { data = JSON.parse(raw_json); } catch(e) {
    const subCount = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE unsubscribed_at IS NULL').get().n;
    return res.render('admin/paste', { title: 'Admin - Cargar Tabla', subCount, error: 'JSON invalido: ' + e.message, preview: null, prompt: null });
  }
  const errors = validateStandings(data);
  if (errors.length) {
    const subCount = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE unsubscribed_at IS NULL').get().n;
    return res.render('admin/paste', { title: 'Admin - Cargar Tabla', subCount, error: errors.join(' | '), preview: null, prompt: null });
  }
  const payload = JSON.stringify(data);
  if (mode === 'close') {
    const gw = parseInt(gameweek, 10);
    if (!gw || gw < 1) {
      const sc = db.prepare('SELECT COUNT(*) as n FROM subscribers WHERE unsubscribed_at IS NULL').get().n;
      return res.render('admin/paste', { title: 'Admin - Cargar Tabla', subCount: sc, error: 'Numero de jornada invalido', preview: null, prompt: null });
    }
    db.prepare('INSERT OR REPLACE INTO gameweek_snapshots (gameweek, payload, captured_at) VALUES (?, ?, ?)').run(gw, payload, data.captured_at || null);
    db.prepare('INSERT OR REPLACE INTO current_standings (id, payload, updated_at) VALUES (1, ?, ?)').run(payload, new Date().toISOString());
    const result = await sendGameweekEmail(gw, data);
    return res.render('admin/paste_success', { title: 'Jornada ' + gw + ' cerrada', gw, result });
  } else {
    db.prepare('INSERT OR REPLACE INTO current_standings (id, payload, updated_at) VALUES (1, ?, ?)').run(payload, new Date().toISOString());
    return res.redirect(SL + 'admin');
  }
});

// Snapshots management
router.get(SL + 'snapshots', requireAdmin, function(req, res) {
  const snaps = db.prepare('SELECT * FROM gameweek_snapshots ORDER BY gameweek DESC').all();
  res.render('admin/snapshots', { title: 'Admin - Snapshots', snaps });
});

router.post(SL + 'snapshots' + SL + 'delete', requireAdmin, function(req, res) {
  db.prepare('DELETE FROM gameweek_snapshots WHERE gameweek = ?').run(parseInt(req.body.gameweek, 10));
  res.redirect(SL + 'admin' + SL + 'snapshots');
});

// Subscribers
router.get(SL + 'subscribers', requireAdmin, function(req, res) {
  const subs = db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
  res.render('admin/subscribers', { title: 'Admin - Suscriptores', subs });
});

router.post(SL + 'subscribers' + SL + 'delete', requireAdmin, function(req, res) {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(parseInt(req.body.id, 10));
  res.redirect(SL + 'admin' + SL + 'subscribers');
});

// Email log
router.get(SL + 'email-log', requireAdmin, function(req, res) {
  const logs = db.prepare('SELECT * FROM email_log ORDER BY sent_at DESC LIMIT 50').all();
  res.render('admin/email_log', { title: 'Admin - Envios', logs });
});

// News sources
router.get(SL + 'news', requireAdmin, function(req, res) {
  const sources = db.prepare('SELECT * FROM news_sources ORDER BY id').all();
  res.render('admin/news_sources', { title: 'Admin - Fuentes de Noticias', sources, saved: req.query.saved });
});

router.post(SL + 'news' + SL + 'add', requireAdmin, function(req, res) {
  const { name, url } = req.body;
  db.prepare('INSERT OR IGNORE INTO news_sources (name, url) VALUES (?, ?)').run(name, url);
  res.redirect(SL + 'admin' + SL + 'news');
});

router.post(SL + 'news' + SL + 'toggle', requireAdmin, function(req, res) {
  db.prepare('UPDATE news_sources SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?').run(parseInt(req.body.id, 10));
  res.redirect(SL + 'admin' + SL + 'news');
});

router.post(SL + 'news' + SL + 'refresh', requireAdmin, async function(req, res) {
  const src = db.prepare('SELECT * FROM news_sources WHERE id = ?').get(parseInt(req.body.id, 10));
  if (src) await refreshSource(src);
  res.redirect(SL + 'admin' + SL + 'news');
});

// Rules sections
router.get(SL + 'rules', requireAdmin, function(req, res) {
  const sections = db.prepare('SELECT * FROM rules_sections ORDER BY sort_order').all();
  res.render('admin/rules', { title: 'Admin - Reglas', sections, saved: req.query.saved });
});

router.post(SL + 'rules' + SL + 'save', requireAdmin, function(req, res) {
  const { id, title, body_md, sort_order } = req.body;
  if (id) {
    db.prepare('UPDATE rules_sections SET title = ?, body_md = ?, sort_order = ?, updated_at = ? WHERE id = ?').run(title, body_md, parseInt(sort_order, 10) || 0, new Date().toISOString(), parseInt(id, 10));
  } else {
    db.prepare('INSERT INTO rules_sections (title, body_md, sort_order) VALUES (?, ?, ?)').run(title, body_md, parseInt(sort_order, 10) || 0);
  }
  res.redirect(SL + 'admin' + SL + 'rules');
});

router.post(SL + 'rules' + SL + 'delete', requireAdmin, function(req, res) {
  db.prepare('DELETE FROM rules_sections WHERE id = ?').run(parseInt(req.body.id, 10));
  res.redirect(SL + 'admin' + SL + 'rules');
});

// Reminders
router.get(SL + 'reminders', requireAdmin, function(req, res) {
  const reminders = db.prepare('SELECT * FROM reminders ORDER BY sort_order').all();
  res.render('admin/reminders', { title: 'Admin - Recordatorios', reminders, saved: req.query.saved });
});

router.post(SL + 'reminders' + SL + 'save', requireAdmin, function(req, res) {
  const { id, text, kind, active, include_in_email, sort_order } = req.body;
  const a = active ? 1 : 0;
  const e = include_in_email ? 1 : 0;
  const o = parseInt(sort_order, 10) || 0;
  if (id) {
    db.prepare('UPDATE reminders SET text = ?, kind = ?, active = ?, include_in_email = ?, sort_order = ?, updated_at = ? WHERE id = ?').run(text, kind || 'info', a, e, o, new Date().toISOString(), parseInt(id, 10));
  } else {
    db.prepare('INSERT INTO reminders (text, kind, active, include_in_email, sort_order) VALUES (?, ?, ?, ?, ?)').run(text, kind || 'info', a, e, o);
  }
  res.redirect(SL + 'admin' + SL + 'reminders');
});

router.post(SL + 'reminders' + SL + 'delete', requireAdmin, function(req, res) {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(parseInt(req.body.id, 10));
  res.redirect(SL + 'admin' + SL + 'reminders');
});

module.exports = router;

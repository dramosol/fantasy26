'use strict';
const path = require('path');
const { Resend } = require('resend');
const db = require(path.join(process.cwd(), 'src', 'db', 'index'));

const NL = String.fromCharCode(10);
const SL = String.fromCharCode(47);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getActive() {
  return db.prepare('SELECT id, email, unsubscribe_token FROM subscribers WHERE unsubscribed_at IS NULL').all();
}

function getReminders() {
  return db.prepare('SELECT text FROM reminders WHERE active = 1 AND include_in_email = 1 ORDER BY sort_order').all();
}

function buildBody(gameweek, payload, remList, siteUrl, code) {
  const top3 = (payload.rows || []).slice(0, 3);
  const medals = ['1. ', '2. ', '3. '];
  const lines = top3.map(function(r, i) {
    return medals[i] + (r.manager || '') + ' (' + (r.team_name || '') + ') - ' + r.total_points + ' pts';
  });
  let txt = 'FIFA Fantasy 2026 - Jornada ' + gameweek + ' cerrada' + NL + NL;
  txt += 'Podio Top 3:' + NL + lines.join(NL);
  if (remList && remList.length) {
    txt += NL + NL + 'Recordatorios:' + NL;
    txt += remList.map(function(r) { return '- ' + r.text; }).join(NL);
  }
  const base = siteUrl || 'http://localhost:3000';
  txt += NL + NL + 'Ver tabla: ' + base;
  txt += NL + 'Cancelar: ' + base + SL + 'baja' + SL + code;
  return txt;
}

async function sendGameweekEmail(gameweek, payload) {
  const logRow = db.prepare('INSERT INTO email_log (gameweek, status, sent_at) VALUES (?, ?, ?) RETURNING id').get(gameweek, 'sending', new Date().toISOString());
  const logId = logRow.id;
  const subs = getActive();
  const reminders = getReminders();
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@resend.dev';
  let sent = 0;
  let lastErr = null;
  if (!resend) {
    db.prepare('UPDATE email_log SET status = ?, error = ?, sent_at = ? WHERE id = ?').run('error', 'RESEND_API_KEY not configured', new Date().toISOString(), logId);
    return { sent: 0, total: subs.length, error: 'RESEND_API_KEY not configured' };
  }
  for (const sub of subs) {
    const body = buildBody(gameweek, payload, reminders, appUrl, sub.unsubscribe_token);
    try {
      await resend.emails.send({
        from: fromEmail,
        to: sub.email,
        subject: 'FIFA Fantasy 2026 - Jornada ' + gameweek + ' cerrada',
        text: body
      });
      sent++;
    } catch (err) {
      lastErr = err.message;
      console.error('Email error for ' + sub.email + ': ' + err.message);
    }
  }
  const status = lastErr ? (sent > 0 ? 'partial' : 'error') : 'ok';
  db.prepare('UPDATE email_log SET recipients_count = ?, status = ?, error = ?, sent_at = ? WHERE id = ?').run(sent, status, lastErr, new Date().toISOString(), logId);
  return { sent, total: subs.length, error: lastErr };
}

module.exports = { sendGameweekEmail, getActive };

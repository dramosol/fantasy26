'use strict';
const db = require('./index');

function initSchema() {
  db.exec("CREATE TABLE IF NOT EXISTS current_standings (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
  db.exec("CREATE TABLE IF NOT EXISTS gameweek_snapshots (gameweek INTEGER PRIMARY KEY, payload TEXT NOT NULL, captured_at TEXT, saved_at TEXT NOT NULL DEFAULT (datetime('now')))");
  db.exec("CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, unsubscribe_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')), unsubscribed_at TEXT)");
  db.exec("CREATE TABLE IF NOT EXISTS email_log (id INTEGER PRIMARY KEY AUTOINCREMENT, gameweek INTEGER NOT NULL, sent_at TEXT NOT NULL DEFAULT (datetime('now')), recipients_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', error TEXT)");
  db.exec("CREATE TABLE IF NOT EXISTS news_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL UNIQUE, enabled INTEGER NOT NULL DEFAULT 1)");
  db.exec("CREATE TABLE IF NOT EXISTS news_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id INTEGER NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE, title TEXT NOT NULL, link TEXT NOT NULL, published_at TEXT, summary TEXT, fetched_at TEXT NOT NULL DEFAULT (datetime('now')))");
  db.exec("CREATE TABLE IF NOT EXISTS rules_sections (id INTEGER PRIMARY KEY AUTOINCREMENT, sort_order INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL, body_md TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
  db.exec("CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'info', active INTEGER NOT NULL DEFAULT 1, include_in_email INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
  db.exec("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL, pass_hash TEXT NOT NULL)");
  seedAdmin();
  seedNewsSources();
}

function seedAdmin() {
  const exists = db.prepare('SELECT id FROM admin WHERE id = 1').get();
  if (!exists) {
    const hash = process.env.ADMIN_PASS_HASH;
    if (!hash) { console.warn('[WARN] ADMIN_PASS_HASH not set - skipping admin seed'); return; }
    db.prepare('INSERT INTO admin (id, username, pass_hash) VALUES (1, ?, ?)').run(process.env.ADMIN_USER || 'admin', hash);
  }
}

function seedNewsSources() {
  const row = db.prepare('SELECT COUNT(*) as n FROM news_sources').get();
  if (row.n === 0) {
    const ins = db.prepare('INSERT INTO news_sources (name, url, enabled) VALUES (?, ?, 1)');
    ins.run('FIFA.com', 'https://www.fifa.com/rss/news.xml');
    ins.run('ESPN FC', 'https://www.espn.com/espn/rss/soccer/news');
    ins.run('BBC Sport Football', 'https://feeds.bbci.co.uk/sport/football/rss.xml');
  }
}

module.exports = { initSchema };

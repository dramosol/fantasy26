'use strict';
const path = require('path');
const Parser = require('rss-parser');
const db = require(path.join(process.cwd(), 'src', 'db', 'index'));

const parser = new Parser({ timeout: 8000 });
const CACHE_TTL_MINUTES = 30;

function isFresh(fetched_at) {
  if (!fetched_at) return false;
  const age = (Date.now() - new Date(fetched_at).getTime()) / 60000;
  return age < CACHE_TTL_MINUTES;
}

async function refreshSource(src) {
  try {
    const feed = await parser.parseURL(src.url);
    const del = db.prepare('DELETE FROM news_cache WHERE source_id = ?');
    const ins = db.prepare('INSERT INTO news_cache (source_id, title, link, published_at, summary) VALUES (?, ?, ?, ?, ?)');
    const tx = db.transaction(function() {
      del.run(src.id);
      (feed.items || []).slice(0, 10).forEach(function(item) {
        ins.run(src.id, item.title || '', item.link || '', item.pubDate || null, item.contentSnippet || null);
      });
    });
    tx();
  } catch (err) {
    console.error('RSS fetch error for ' + src.url + ': ' + err.message);
  }
}

async function getNews(limit) {
  limit = limit || 15;
  const sources = db.prepare('SELECT * FROM news_sources WHERE enabled = 1').all();
  for (const src of sources) {
    const latest = db.prepare('SELECT fetched_at FROM news_cache WHERE source_id = ? ORDER BY fetched_at DESC LIMIT 1').get(src.id);
    if (!latest || !isFresh(latest.fetched_at)) {
      refreshSource(src).catch(function(e) { console.error(e); });
    }
  }
  return db.prepare('SELECT nc.*, ns.name as source_name FROM news_cache nc JOIN news_sources ns ON nc.source_id = ns.id WHERE ns.enabled = 1 ORDER BY nc.published_at DESC LIMIT ?').all(limit);
}

module.exports = { getNews, refreshSource };

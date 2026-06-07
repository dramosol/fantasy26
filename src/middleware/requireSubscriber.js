'use strict';
// Middleware: gate de email - redirige al landing si no hay cookie de suscriptor
module.exports = function requireSubscriber(req, res, next) {
  if (req.cookies && req.cookies.subscriber_email) return next();
  if (req.path === '/entrar' || req.path.startsWith('/unsubscribe')) return next();
  res.redirect('/entrar');
};

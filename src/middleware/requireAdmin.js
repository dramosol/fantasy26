'use strict';
module.exports = function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  const SL = String.fromCharCode(47);
  res.redirect(SL + 'admin' + SL + 'login');
};

#!/usr/bin/env node
// Uso: node scripts/hash-password.js tu_password
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) { console.error('Uso: node scripts/hash-password.js <password>'); process.exit(1); }
bcrypt.hash(password, 12).then(hash => {
  console.log('ADMIN_PASS_HASH=' + hash);
});

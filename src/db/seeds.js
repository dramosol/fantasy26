'use strict';
const db = require('./index');

function seedRules() {
  const row = db.prepare('SELECT COUNT(*) as n FROM rules_sections').get();
  if (row.n > 0) return;
  const ins = db.prepare('INSERT INTO rules_sections (sort_order, title, body_md) VALUES (?, ?, ?)');
  ins.run(1, 'Puntuacion', '## Puntuacion\n\n- Gol portero/defensa: **10 pts**\n- Gol mediocampista: **8 pts**\n- Gol delantero: **6 pts**\n- Asistencia: **3 pts**\n- Portero en cero: **4 pts**\n- Amarilla: **-1 pt**\n- Roja: **-3 pts**');
  ins.run(2, 'Plantilla y formacion', '## Plantilla\n\n- 15 jugadores: 2 porteros, 5 defensas, 5 mediocampistas, 3 delanteros.\n- Elige 11 titulares y 4 suplentes.\n- Los suplentes entran si un titular no juega.');
  ins.run(3, 'Fichajes y transferencias', '## Transferencias\n\n- **1 transferencia gratuita** por jornada.\n- Adicionales cuestan **-4 pts** cada una.\n- Las libres se acumulan (maximo 2 de golpe).');
  ins.run(4, 'Comodines', '## Comodines\n\n- **Wildcard:** cambia todo el equipo sin costo (1 en primera mitad, 1 en segunda).\n- **Triple Capitan:** capitan anota el triple (1 uso total).\n- **Banco Reforzado:** suplentes puntuan doble (1 uso total).');
  ins.run(5, 'Capitan y vicecapitan', '## Capitan\n\n- El capitan anota el **doble** de puntos.\n- Si no juega, el vicecapitan toma su lugar.\n- Cambia tu capitan antes del deadline.');
}

function seedReminders() {
  const row = db.prepare('SELECT COUNT(*) as n FROM reminders').get();
  if (row.n > 0) return;
  const ins = db.prepare('INSERT INTO reminders (text, kind, active, include_in_email, sort_order) VALUES (?, ?, 1, 1, ?)');
  ins.run('Recuerda hacer tus cambios antes del deadline de la jornada', 'deadline', 1);
  ins.run('Revisa si tienes transferencias acumuladas disponibles', 'info', 2);
  ins.run('Considera usar un comodin si tu equipo tiene muchas bajas', 'info', 3);
}

module.exports = { seedRules, seedReminders };

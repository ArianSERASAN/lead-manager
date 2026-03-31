import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { calculateLeadScore, isLeadStale } from './scoring.js';

initializeApp();
const db = getFirestore();

// Gmail credentials — loaded from .env file (created by CI from GitHub secrets)
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;

// Apollo.io API key — loaded from .env file (created by CI from GitHub secrets)
// To activate: add APOLLO_API_KEY to your GitHub secrets and .env
const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';

// ─── Helpers ──────────────────────────────────────────────────────

async function getAlertConfig() {
  const snap = await db.doc('settings/alerts').get();
  return snap.exists ? snap.data() : null;
}

function getTransporter(user, pass) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendEmail(user, pass, to, subject, html) {
  const transporter = getTransporter(user, pass);
  const results = [];
  for (const email of to) {
    try {
      const info = await transporter.sendMail({
        from: `Lead Manager SERASAN <${user}>`,
        to: email,
        subject,
        html,
      });
      results.push({ email, ok: true, messageId: info.messageId });
    } catch (err) {
      console.error(`Failed to send to ${email}:`, err.message);
      results.push({ email, ok: false, error: err.message });
    }
  }
  return results;
}

function sourceLabel(source) {
  const map = { landing: 'Landing Page', 'web-download': 'Descarga PDF', 'web-contact': 'Formulario Web', manual: 'Manual' };
  return map[source] || source;
}

function statusLabel(status) {
  const map = { nuevo: 'Nuevo', contactado: 'Contactado', 'en-progreso': 'En Progreso', cerrado: 'Cerrado' };
  return map[status] || status;
}

function emailTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:18px">🔔 ${title}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px">Lead Manager — SERASAN Engineering</p>
    </div>
    <div style="padding:24px 32px">
      ${bodyHtml}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <a href="https://lead-manager-serasan.web.app" style="color:#3b82f6;font-size:12px;text-decoration:none">Abrir Lead Manager →</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── 1. NEW LEAD ALERT ────────────────────────────────────────────

const newLeadCollections = ['leads', 'leads_descargas', 'solicitudes_contacto'];
const sourceByCollection = { leads: 'landing', leads_descargas: 'web-download', solicitudes_contacto: 'web-contact' };

export const onNewLead = onDocumentCreated(
  {
    document: '{collection}/{docId}',

    region: 'europe-west1',
  },
  async (event) => {
    const colName = event.params.collection;
    if (!newLeadCollections.includes(colName)) return;

    const data = event.data?.data();
    if (!data) return;

    // ─ NORMALIZE: ensure createdAt exists so Firestore orderBy('createdAt') queries work.
    // Web forms (reactivatuedificio.es, serasanengineering.com) may write 'fecha' instead
    // of 'createdAt', or no timestamp at all — both cases are handled here.
    // IMPORTANT: this runs before the config check so it always executes, even if
    // alerts are not configured (avoids leads disappearing when settings/alerts is empty).
    if (!data.createdAt) {
      try {
        await event.data.ref.update({
          createdAt: data.fecha || FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`[onNewLead] Failed to normalize createdAt for ${event.params.docId}:`, err.message);
      }
    }

    const config = await getAlertConfig();
    if (!config) return;

    const source = data.source || sourceByCollection[colName] || 'manual';
    const name = data.name || data.nombre || 'Sin nombre';
    const email = data.email || '';
    const phone = data.phone || data.telefono || '';
    const company = data.company || data.empresa || '';
    const message = data.message || data.mensaje || '';
    const score = data.score || 0;

    // ─ New lead alert
    const nl = config.newLead;
    if (nl?.enabled && nl.recipients?.length > 0) {
      if (!nl.sources || nl.sources.length === 0 || nl.sources.includes(source)) {
        const body = `
          <h2 style="color:#111;margin:0 0 16px;font-size:16px">Nuevo lead recibido</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b7280;width:110px">Nombre</td><td style="padding:8px 0;font-weight:600;color:#111">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#3b82f6">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:8px 0;color:#6b7280">Teléfono</td><td style="padding:8px 0">${phone}</td></tr>` : ''}
            ${company ? `<tr><td style="padding:8px 0;color:#6b7280">Empresa</td><td style="padding:8px 0">${company}</td></tr>` : ''}
            <tr><td style="padding:8px 0;color:#6b7280">Origen</td><td style="padding:8px 0">${sourceLabel(source)}</td></tr>
            ${message ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Mensaje</td><td style="padding:8px 0">${message}</td></tr>` : ''}
          </table>`;
        await sendEmail(GMAIL_USER, GMAIL_APP_PASS, nl.recipients, `Nuevo lead: ${name}`, emailTemplate('Nuevo Lead', body));
      }
    }

    // ─ Hot lead alert
    const hl = config.hotLead;
    if (hl?.enabled && hl.recipients?.length > 0 && score >= (hl.scoreThreshold || 70)) {
      const body = `
        <h2 style="color:#111;margin:0 0 16px;font-size:16px">🔥 Lead caliente detectado</h2>
        <p style="font-size:14px;color:#374151"><strong>${name}</strong> (${email}) tiene un score de <span style="color:#ea580c;font-weight:700">${score}</span>, por encima del umbral de ${hl.scoreThreshold}.</p>
        <p style="font-size:13px;color:#6b7280;margin-top:8px">Origen: ${sourceLabel(source)}${company ? ` · Empresa: ${company}` : ''}</p>`;
      await sendEmail(GMAIL_USER, GMAIL_APP_PASS, hl.recipients, `🔥 Lead caliente: ${name} (score ${score})`, emailTemplate('Lead Caliente', body));
    }

    // ─── Auto-assign (round-robin) ────────────────────────────────
    try {
      const autoAssignSnap = await db.doc('settings/autoAssign').get();
      if (autoAssignSnap.exists) {
        const autoConfig = autoAssignSnap.data();
        if (autoConfig.enabled && autoConfig.userIds && autoConfig.userIds.length > 0) {
          const currentIndex = autoConfig.currentIndex || 0;
          const assignToId = autoConfig.userIds[currentIndex % autoConfig.userIds.length];

          // Assign the lead
          await event.data.ref.update({
            assignedTo: assignToId,
            assignedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          // Advance the index
          await db.doc('settings/autoAssign').update({
            currentIndex: (currentIndex + 1) % autoConfig.userIds.length,
          });

          console.log(`Auto-assigned lead ${event.data.id} to user ${assignToId} (index ${currentIndex})`);
        }
      }
    } catch (err) {
      console.error('Auto-assign error:', err);
    }
  }
);

// ─── 2. UNATTENDED LEADS CHECK (every hour) ──────────────────────

export const checkUnattendedLeads = onSchedule(
  {
    schedule: 'every 1 hours',

    region: 'europe-west1',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const config = await getAlertConfig();
    if (!config?.unattended?.enabled || !config.unattended.recipients?.length) return;

    const hoursThreshold = config.unattended.hoursThreshold || 24;
    const cutoff = Timestamp.fromMillis(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const unattended = [];
    for (const col of newLeadCollections) {
      const snap = await db.collection(col)
        .where('status', '==', 'nuevo')
        .where('createdAt', '<', cutoff)
        .get();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data._unattendedNotifiedAt) {
          const notifiedAt = data._unattendedNotifiedAt.toMillis?.() || 0;
          if (Date.now() - notifiedAt < hoursThreshold * 60 * 60 * 1000) return;
        }
        unattended.push({ id: d.id, col, ...data });
      });
    }

    if (unattended.length === 0) return;

    const rows = unattended.map(l => {
      const name = l.name || l.nombre || 'Sin nombre';
      const email = l.email || '';
      const hours = Math.round((Date.now() - (l.createdAt?.toMillis?.() || Date.now())) / 3600000);
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${name}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${email}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#ea580c;font-weight:600">${hours}h</td></tr>`;
    }).join('');

    const body = `
      <h2 style="color:#111;margin:0 0 8px;font-size:16px">Leads sin atender</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">${unattended.length} lead${unattended.length > 1 ? 's' : ''} lleva${unattended.length > 1 ? 'n' : ''} más de ${hoursThreshold}h en estado "Nuevo"</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Nombre</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Email</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Horas</th></tr>
        ${rows}
      </table>`;

    await sendEmail(GMAIL_USER, GMAIL_APP_PASS, config.unattended.recipients, `⏰ ${unattended.length} lead${unattended.length > 1 ? 's' : ''} sin atender`, emailTemplate('Leads Sin Atender', body));

    const batch = db.batch();
    for (const l of unattended) {
      batch.update(db.collection(l.col).doc(l.id), { _unattendedNotifiedAt: Timestamp.now() });
    }
    await batch.commit();
  }
);

// ─── 3. STALE LEADS CHECK (daily 10:00 Madrid) ──────────────────

export const checkStaleLeads = onSchedule(
  {
    schedule: 'every day 10:00',

    region: 'europe-west1',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const config = await getAlertConfig();
    if (!config?.stale?.enabled || !config.stale.recipients?.length) return;

    const daysThreshold = config.stale.daysThreshold || 7;
    const cutoff = Timestamp.fromMillis(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

    const staleLeads = [];
    for (const col of newLeadCollections) {
      for (const status of ['contactado', 'en-progreso']) {
        const snap = await db.collection(col).where('status', '==', status).get();
        snap.docs.forEach(d => {
          const data = d.data();
          const lastUpdate = data.updatedAt || data.createdAt;
          if (lastUpdate && lastUpdate.toMillis && lastUpdate.toMillis() < cutoff.toMillis()) {
            staleLeads.push({ id: d.id, col, status, ...data });
          }
        });
      }
    }

    if (staleLeads.length === 0) return;

    const rows = staleLeads.map(l => {
      const name = l.name || l.nombre || 'Sin nombre';
      const days = Math.round((Date.now() - (l.updatedAt?.toMillis?.() || l.createdAt?.toMillis?.() || Date.now())) / 86400000);
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${name}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${statusLabel(l.status)}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#ea580c;font-weight:600">${days}d</td></tr>`;
    }).join('');

    const body = `
      <h2 style="color:#111;margin:0 0 8px;font-size:16px">Leads estancados</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} sin actividad en más de ${daysThreshold} días</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Nombre</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Estado</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Días</th></tr>
        ${rows}
      </table>`;

    await sendEmail(GMAIL_USER, GMAIL_APP_PASS, config.stale.recipients, `⚠️ ${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} estancado${staleLeads.length > 1 ? 's' : ''}`, emailTemplate('Leads Estancados', body));
  }
);

// ─── 4. DAILY DIGEST (08:00 Madrid) ─────────────────────────────
// Reads its own config from Firestore: settings/digest
// Config shape: { enabled, recipients[], frequency: 'daily'|'weekly', staleDaysThreshold }

async function getDigestConfig() {
  const snap = await db.doc('settings/digest').get();
  return snap.exists ? snap.data() : null;
}

async function getPendingTasks() {
  const tasks = [];
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  for (const col of newLeadCollections) {
    const leadsSnap = await db.collection(col).get();
    for (const leadDoc of leadsSnap.docs) {
      const leadData = leadDoc.data();
      const tasksSnap = await db.collection(col).doc(leadDoc.id).collection('tasks')
        .where('completed', '==', false)
        .get();
      tasksSnap.docs.forEach(t => {
        const td = t.data();
        const dueAt = td.dueAt?.toDate?.() || null;
        tasks.push({
          id: t.id,
          title: td.title || 'Sin título',
          assignee: td.assignee || '',
          dueAt,
          isOverdue: dueAt ? dueAt < now : false,
          isDueToday: dueAt ? (dueAt >= now && dueAt <= todayEnd) : false,
          leadName: leadData.name || leadData.nombre || 'Sin nombre',
          leadEmail: leadData.email || '',
        });
      });
    }
  }
  tasks.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return (a.dueAt?.getTime() || Infinity) - (b.dueAt?.getTime() || Infinity);
  });
  return tasks;
}

export const dailyDigest = onSchedule(
  {
    schedule: 'every day 08:00',

    region: 'europe-west1',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const digestCfg = await getDigestConfig();
    if (!digestCfg?.enabled || !digestCfg.recipients?.length) return;

    if (digestCfg.frequency === 'weekly') {
      const today = new Date();
      if (today.getDay() !== 1) return;
    }

    const isWeekly = digestCfg.frequency === 'weekly';
    const periodMs = isWeekly ? 7 * 86400000 : 86400000;
    const periodStart = Timestamp.fromMillis(Date.now() - periodMs);
    const periodLabel = isWeekly ? 'esta semana' : 'últimas 24h';
    const staleDays = digestCfg.staleDaysThreshold || 7;
    const staleCutoff = Timestamp.fromMillis(Date.now() - staleDays * 86400000);

    let totalLeads = 0;
    let newLeadsCount = 0;
    const statusCounts = { nuevo: 0, contactado: 0, 'en-progreso': 0, cerrado: 0 };
    const recentLeads = [];
    const staleLeads = [];

    for (const col of newLeadCollections) {
      const allSnap = await db.collection(col).get();
      totalLeads += allSnap.size;

      allSnap.docs.forEach(d => {
        const data = d.data();
        const status = data.status || 'nuevo';
        if (statusCounts[status] !== undefined) statusCounts[status]++;

        if (data.createdAt?.toMillis && data.createdAt.toMillis() > periodStart.toMillis()) {
          newLeadsCount++;
          recentLeads.push({ ...data, source: data.source || sourceByCollection[col] || 'manual' });
        }

        if (['contactado', 'en-progreso'].includes(status)) {
          const lastUpdate = data.updatedAt || data.createdAt;
          if (lastUpdate?.toMillis && lastUpdate.toMillis() < staleCutoff.toMillis()) {
            const days = Math.round((Date.now() - lastUpdate.toMillis()) / 86400000);
            staleLeads.push({ name: data.name || data.nombre || 'Sin nombre', email: data.email || '', status, days });
          }
        }
      });
    }

    const closedCount = statusCounts.cerrado;
    const conversionRate = totalLeads > 0 ? ((closedCount / totalLeads) * 100).toFixed(1) : '0.0';

    const pendingTasks = await getPendingTasks();
    const overdueTasks = pendingTasks.filter(t => t.isOverdue);
    const todayTasks = pendingTasks.filter(t => t.isDueToday);

    const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

    // KPI cards (table-based for email client compatibility)
    const kpiHtml = `
      <p style="font-size:12px;color:#6b7280;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em">${dateStr}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="25%" style="padding:4px">
            <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center">
              <p style="font-size:28px;font-weight:700;color:#1d4ed8;margin:0">${newLeadsCount}</p>
              <p style="font-size:10px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Nuevos ${periodLabel}</p>
            </div>
          </td>
          <td width="25%" style="padding:4px">
            <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
              <p style="font-size:28px;font-weight:700;color:#16a34a;margin:0">${totalLeads}</p>
              <p style="font-size:10px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Total leads</p>
            </div>
          </td>
          <td width="25%" style="padding:4px">
            <div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center">
              <p style="font-size:28px;font-weight:700;color:#d97706;margin:0">${staleLeads.length}</p>
              <p style="font-size:10px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Estancados</p>
            </div>
          </td>
          <td width="25%" style="padding:4px">
            <div style="background:#ede9fe;border-radius:12px;padding:16px;text-align:center">
              <p style="font-size:28px;font-weight:700;color:#7c3aed;margin:0">${conversionRate}%</p>
              <p style="font-size:10px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Conversión</p>
            </div>
          </td>
        </tr>
      </table>`;

    const pipelineHtml = `
      <h3 style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Pipeline por estado</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="25%" style="padding:3px"><div style="background:#d1fae5;color:#065f46;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts.nuevo} Nuevos</div></td>
          <td width="25%" style="padding:3px"><div style="background:#fef3c7;color:#92400e;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts.contactado} Contactados</div></td>
          <td width="25%" style="padding:3px"><div style="background:#ede9fe;color:#5b21b6;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts['en-progreso']} En Progreso</div></td>
          <td width="25%" style="padding:3px"><div style="background:#fee2e2;color:#991b1b;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts.cerrado} Cerrados</div></td>
        </tr>
      </table>`;

    const recentRows = recentLeads.slice(0, 10).map(l => {
      const name = l.name || l.nombre || 'Sin nombre';
      const source = sourceLabel(l.source || 'manual');
      return `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${name}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px"><a href="mailto:${l.email || ''}" style="color:#3b82f6;text-decoration:none">${l.email || ''}</a></td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${source}</td></tr>`;
    }).join('');

    const recentHtml = recentLeads.length > 0 ? `
      <h3 style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Leads nuevos (${periodLabel})</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
        <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Nombre</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Email</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Origen</th></tr>
        ${recentRows}
      </table>` : '<p style="color:#9ca3af;font-size:13px;margin-bottom:24px">No hay leads nuevos en este periodo.</p>';

    const staleRows = staleLeads.slice(0, 10).map(l =>
      `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${l.name}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${l.email}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${statusLabel(l.status)}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#ea580c;font-weight:600">${l.days}d</td></tr>`
    ).join('');

    const staleHtml = staleLeads.length > 0 ? `
      <h3 style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Leads estancados (+${staleDays} días sin actividad)</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
        <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Nombre</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Email</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Estado</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Días</th></tr>
        ${staleRows}
        ${staleLeads.length > 10 ? `<tr><td colspan="4" style="padding:8px;font-size:12px;color:#6b7280;text-align:center">… y ${staleLeads.length - 10} más</td></tr>` : ''}
      </table>` : '';

    const taskRows = [...overdueTasks, ...todayTasks].slice(0, 8).map(t => {
      const dueLabel = t.isOverdue
        ? `<span style="color:#dc2626;font-weight:600">Vencida</span>`
        : `<span style="color:#d97706">Hoy</span>`;
      const dueDate = t.dueAt ? t.dueAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—';
      return `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${t.title}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${t.leadName}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${t.assignee || '—'}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px">${dueLabel} (${dueDate})</td></tr>`;
    }).join('');

    const tasksHtml = (overdueTasks.length + todayTasks.length) > 0 ? `
      <h3 style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Tareas pendientes del equipo</h3>
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px">${overdueTasks.length} vencida${overdueTasks.length !== 1 ? 's' : ''} · ${todayTasks.length} para hoy · ${pendingTasks.length} total pendientes</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
        <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Tarea</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Lead</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Asignado</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Estado</th></tr>
        ${taskRows}
      </table>` : '';

    const ctaHtml = `
      <div style="text-align:center;margin-top:8px;margin-bottom:8px">
        <a href="https://lead-manager-serasan.web.app" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Abrir Lead Manager</a>
      </div>`;

    const body = `
      <h2 style="color:#111;margin:0 0 4px;font-size:18px">Resumen ${isWeekly ? 'Semanal' : 'Diario'}</h2>
      ${kpiHtml}
      ${pipelineHtml}
      ${recentHtml}
      ${staleHtml}
      ${tasksHtml}
      ${ctaHtml}`;

    const subject = isWeekly
      ? `📊 Semanal: ${newLeadsCount} nuevos, ${totalLeads} total, ${conversionRate}% conversión`
      : `📊 Daily Digest: ${newLeadsCount} nuevos · ${staleLeads.length} estancados · ${overdueTasks.length} tareas vencidas`;

    await sendEmail(GMAIL_USER, GMAIL_APP_PASS, digestCfg.recipients, subject, emailTemplate(`Resumen ${isWeekly ? 'Semanal' : 'Diario'}`, body));

    await db.collection('digest_log').add({
      sentAt: Timestamp.now(),
      recipients: digestCfg.recipients,
      stats: { totalLeads, newLeadsCount, staleLeads: staleLeads.length, conversionRate, pendingTasks: pendingTasks.length, overdueTasks: overdueTasks.length },
    });
  }
);

// ─── 5. BACKFILL createdAt (callable, admin only) ────────────────
// One-time migration: adds createdAt to existing docs that only have 'fecha'.
// Run once from the app after deploying this function.

export const backfillCreatedAt = onCall(
  {
    region: 'europe-west1',
    maxInstances: 1,
    timeoutSeconds: 540,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Solo los administradores pueden ejecutar esta función.');
    }

    let fixed = 0;
    let skipped = 0;

    for (const col of newLeadCollections) {
      const snap = await db.collection(col).get();
      const batch = db.batch();
      let batchCount = 0;

      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        if (!d.createdAt) {
          const ts = d.fecha || Timestamp.now();
          batch.update(docSnap.ref, { createdAt: ts });
          fixed++;
          batchCount++;
          // Firestore batch limit is 500
          if (batchCount >= 490) {
            await batch.commit();
            batchCount = 0;
          }
        } else {
          skipped++;
        }
      }
      if (batchCount > 0) await batch.commit();
    }

    console.log(`backfillCreatedAt: fixed=${fixed}, skipped=${skipped}`);
    return { success: true, fixed, skipped };
  }
);

// ─── 6. APOLLO ENRICHMENT (callable) ──────────────────────────────
// Called from the frontend via httpsCallable('enrichLead')
// Requires APOLLO_API_KEY in environment variables.

/**
 * Call Apollo People Enrichment API
 * POST https://api.apollo.io/api/v1/people/match
 */
async function callApolloPeopleEnrich(email, firstName, lastName, domain) {
  const body = {};
  if (email) body.email = email;
  if (firstName) body.first_name = firstName;
  if (lastName) body.last_name = lastName;
  if (domain) body.domain = domain;
  body.reveal_personal_emails = false;
  body.reveal_phone_number = false;

  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APOLLO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo People API error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Call Apollo Organization Enrichment API
 * GET https://api.apollo.io/api/v1/organizations/enrich?domain=...
 */
async function callApolloOrgEnrich(domain) {
  if (!domain) return null;

  const url = new URL('https://api.apollo.io/api/v1/organizations/enrich');
  url.searchParams.set('domain', domain);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': APOLLO_API_KEY,
    },
  });

  if (!res.ok) {
    console.warn(`Apollo Org API error ${res.status} for domain ${domain}`);
    return null;
  }

  return res.json();
}

/**
 * Transform Apollo API responses into our ApolloEnrichment schema.
 */
function buildEnrichmentData(personRes, orgRes) {
  const person = personRes?.person || {};
  const org = person?.organization || orgRes?.organization || {};

  return {
    // Person data
    apolloId: person.id || null,
    firstName: person.first_name || null,
    lastName: person.last_name || null,
    title: person.title || null,
    headline: person.headline || null,
    linkedinUrl: person.linkedin_url || null,
    photoUrl: person.photo_url || null,
    city: person.city || null,
    state: person.state || null,
    country: person.country || null,
    seniority: person.seniority || null,
    departments: person.departments || [],
    // Organization data
    organizationName: org.name || null,
    organizationDomain: org.primary_domain || null,
    organizationWebsite: org.website_url || null,
    organizationIndustry: org.industry || null,
    organizationLinkedin: org.linkedin_url || null,
    organizationSize: org.estimated_num_employees || null,
    organizationFoundedYear: org.founded_year || null,
    organizationRevenue: org.annual_revenue || null,
    organizationFunding: org.total_funding || null,
    organizationFundingStage: org.latest_funding_stage || null,
    // Meta
    source: 'apollo',
    matchConfidence: person.email_status || null,
  };
}

export const enrichLead = onCall(
  {
    region: 'europe-west1',
    maxInstances: 10,
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado para enriquecer leads.');
    }

    const { leadId, collection: colName } = request.data;
    if (!leadId || !colName) {
      throw new HttpsError('invalid-argument', 'Se requieren leadId y collection.');
    }

    // Check Apollo API key is configured
    if (!APOLLO_API_KEY) {
      throw new HttpsError(
        'failed-precondition',
        'La API key de Apollo no está configurada. Añade APOLLO_API_KEY a las variables de entorno del proyecto.'
      );
    }

    // Get lead from Firestore
    const leadRef = db.collection(colName).doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      throw new HttpsError('not-found', `Lead ${leadId} no encontrado en ${colName}.`);
    }

    const leadData = leadSnap.data();
    const email = leadData.email || '';
    const name = leadData.name || leadData.nombre || '';
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract domain from email
    const emailDomain = email.includes('@') ? email.split('@')[1] : '';

    try {
      // Call Apollo People Enrichment
      const personRes = await callApolloPeopleEnrich(email, firstName, lastName, emailDomain);

      // Optionally call Organization Enrichment for more company data
      const orgDomain = personRes?.person?.organization?.primary_domain || emailDomain;
      let orgRes = null;
      if (orgDomain) {
        orgRes = await callApolloOrgEnrich(orgDomain);
      }

      // Build enrichment object
      const enrichment = buildEnrichmentData(personRes, orgRes);

      // Update Firestore
      const updateData = {
        enrichment,
        enrichedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Also fill in top-level fields if they were empty
      if (!leadData.company && enrichment.organizationName) {
        updateData.company = enrichment.organizationName;
      }

      await leadRef.update(updateData);

      // Record activity
      await db.collection(colName).doc(leadId).collection('activity').add({
        leadId,
        timestamp: FieldValue.serverTimestamp(),
        actor: request.auth.uid,
        actorName: request.auth.token.name || request.auth.token.email || 'Sistema',
        action: 'enriched',
        details: {
          description: `Lead enriquecido con Apollo: ${enrichment.title || 'sin cargo'} @ ${enrichment.organizationName || 'sin empresa'}`,
        },
      });

      return { success: true, enrichment };
    } catch (error) {
      console.error('Error enriching lead:', error);
      throw new HttpsError('internal', `Error al enriquecer con Apollo: ${error.message}`);
    }
  }
);

// ─── 7. AUTO-ENRICH ON NEW LEAD (optional) ───────────────────────
// Automatically enriches new leads when they are created.
// Only runs if APOLLO_API_KEY is set and settings/apollo.autoEnrich is true.

export const autoEnrichNewLead = onDocumentCreated(
  {
    document: '{collection}/{docId}',
    region: 'europe-west1',
  },
  async (event) => {
    const colName = event.params.collection;
    if (!newLeadCollections.includes(colName)) return;
    if (!APOLLO_API_KEY) return;

    // Check if auto-enrich is enabled in settings
    const settingsSnap = await db.doc('settings/apollo').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    if (!settings.autoEnrich) return;

    const data = event.data?.data();
    if (!data) return;

    const email = data.email || '';
    if (!email) return; // Can't enrich without email

    const name = data.name || data.nombre || '';
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const emailDomain = email.includes('@') ? email.split('@')[1] : '';

    try {
      const personRes = await callApolloPeopleEnrich(email, firstName, lastName, emailDomain);

      const orgDomain = personRes?.person?.organization?.primary_domain || emailDomain;
      let orgRes = null;
      if (orgDomain) {
        orgRes = await callApolloOrgEnrich(orgDomain);
      }

      const enrichment = buildEnrichmentData(personRes, orgRes);

      const updateData = {
        enrichment,
        enrichedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!data.company && enrichment.organizationName) {
        updateData.company = enrichment.organizationName;
      }

      await db.collection(colName).doc(event.params.docId).update(updateData);

      // Record activity
      await db.collection(colName).doc(event.params.docId).collection('activity').add({
        leadId: event.params.docId,
        timestamp: FieldValue.serverTimestamp(),
        actor: 'system',
        actorName: 'Sistema',
        action: 'enriched',
        details: {
          description: `Auto-enriquecido con Apollo: ${enrichment.title || 'sin cargo'} @ ${enrichment.organizationName || 'sin empresa'}`,
        },
      });

      console.log(`Auto-enriched lead ${event.params.docId} in ${colName}`);
    } catch (error) {
      // Auto-enrichment failures should not block lead creation
      console.error(`Auto-enrich failed for ${event.params.docId}:`, error.message);
    }
  }
);

// ─── 8. CLEAN TEST DATA (callable, admin only) ───────────────────
// Callable function to wipe all test data before production launch.
// Requires: authenticated admin user + confirm: true parameter.

export const cleanTestData = onCall(
  {
    region: 'europe-west1',
    maxInstances: 1,
  },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    // 2. Admin role check
    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Solo los administradores pueden ejecutar esta función.');
    }

    // 3. Confirmation check
    if (request.data?.confirm !== true) {
      throw new HttpsError(
        'failed-precondition',
        'Debes enviar { confirm: true } para confirmar el borrado de datos.'
      );
    }

    const results = {
      leads: 0,
      leads_descargas: 0,
      solicitudes_contacto: 0,
      tasks: 0,
      activity: 0,
    };

    try {
      // Helper: delete all docs in a collection (with subcollections)
      async function deleteCollection(colName) {
        const snap = await db.collection(colName).get();
        if (snap.empty) return 0;

        let deleted = 0;
        let subDeleted = 0;

        // Delete subcollections first (activity, tasks)
        for (const docSnap of snap.docs) {
          for (const subColName of ['activity', 'tasks']) {
            const subSnap = await db.collection(colName).doc(docSnap.id).collection(subColName).get();
            if (!subSnap.empty) {
              const subBatch = db.batch();
              subSnap.docs.forEach(subDoc => subBatch.delete(subDoc.ref));
              await subBatch.commit();
              subDeleted += subSnap.size;
            }
          }
        }

        // Delete main docs in batches of 500
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = db.batch();
          docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
          await batch.commit();
          deleted += Math.min(500, docs.length - i);
        }

        results.activity += subDeleted;
        return deleted;
      }

      // Delete all lead collections
      results.leads = await deleteCollection('leads');
      results.leads_descargas = await deleteCollection('leads_descargas');
      results.solicitudes_contacto = await deleteCollection('solicitudes_contacto');

      // Delete top-level tasks collection
      const tasksSnap = await db.collection('tasks').get();
      if (!tasksSnap.empty) {
        for (let i = 0; i < tasksSnap.docs.length; i += 500) {
          const batch = db.batch();
          tasksSnap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        results.tasks = tasksSnap.size;
      }

      // Reset stats/counters in settings if they exist
      const statsSnap = await db.doc('settings/stats').get();
      if (statsSnap.exists) {
        await db.doc('settings/stats').set({
          totalLeads: 0,
          totalBySource: { landing: 0, 'web-download': 0, 'web-contact': 0, manual: 0 },
          totalByStatus: { nuevo: 0, contactado: 0, 'en-progreso': 0, cerrado: 0 },
          resetAt: Timestamp.now(),
          resetBy: request.auth.uid,
        });
      }

      const totalDeleted = results.leads + results.leads_descargas + results.solicitudes_contacto + results.tasks + results.activity;

      console.log(`cleanTestData executed by ${request.auth.uid}: ${totalDeleted} documents deleted`, results);

      return {
        success: true,
        message: `Limpieza completada: ${totalDeleted} documentos eliminados.`,
        details: results,
      };
    } catch (error) {
      console.error('Error in cleanTestData:', error);
      throw new HttpsError('internal', `Error al limpiar datos: ${error.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 9. EMAIL SEQUENCE — AUTOMATED DRIP FOR LEADS
// ═══════════════════════════════════════════════════════════════════
//
// Sequence:
//   1. Welcome       → on lead creation (status "nuevo")
//   2. Follow-up     → N days after creation if still "nuevo" (default: 3)
//   3. Reminder      → N days after creation if still "nuevo" (default: 7)
//   4. Contacted     → when lead moves to "contactado" (callable from frontend)
//
// Config: Firestore doc settings/emailSequence
// Tracking: each lead gets _emailSequence: { welcome, followUp, reminder, contacted }

// ─── Helpers ─────────────────────────────────────────────────────

async function getEmailSequenceConfig() {
  const snap = await db.doc('settings/emailSequence').get();
  if (!snap.exists) return null;
  const data = snap.data();
  return data?.enabled ? data : null;
}

function serasanEmailTemplate(preheader, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>SERASAN Engineering</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    @media only screen and (max-width:600px){
      .container{width:100%!important;padding:16px!important}
      .hero{padding:28px 20px!important}
      .cta-btn{display:block!important;width:100%!important;text-align:center!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a2e">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <tr><td class="hero" style="background:linear-gradient(135deg,#1e3a5f 0%,#2d6a9f 100%);padding:36px 40px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px">SERASAN Engineering</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;font-weight:400">Rehabilitación integral de edificios</p>
        </td></tr>
        <tr><td style="padding:32px 40px">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f8f9fa;border-top:1px solid #e9ecef;text-align:center">
          <p style="margin:0 0 6px;font-size:12px;color:#6c757d">SERASAN Engineering · Rehabilitación de Edificios</p>
          <p style="margin:0;font-size:11px;color:#adb5bd">Este email fue enviado porque mostró interés en nuestros servicios.<br>Si no desea recibir más comunicaciones, responda a este email indicándolo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeEmailHtml(leadName) {
  const firstName = (leadName || '').split(' ')[0] || 'estimado/a cliente';
  return serasanEmailTemplate(
    'Bienvenido/a a SERASAN Engineering — Rehabilitación integral de edificios',
    `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#1a1a2e">Hola <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#333">Gracias por ponerse en contacto con <strong>SERASAN Engineering</strong>. Nos alegra mucho su interés en nuestros servicios de rehabilitación de edificios.</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 20px;color:#333">Somos especialistas en dar nueva vida a los edificios, combinando ingeniería de vanguardia con un profundo respeto por el patrimonio construido. Estos son algunos de los servicios que ponemos a su disposición:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr><td style="padding:12px 16px;background:#e8f4f8;border-radius:10px;border-left:4px solid #2d6a9f">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#1e3a5f">Rehabilitación estructural</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.5">Refuerzo de cimentaciones, estructuras de hormigón y acero, muros de carga y forjados.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr><td style="padding:12px 16px;background:#f0f7e6;border-radius:10px;border-left:4px solid #5a8f29">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#3d6b1a">Eficiencia energética</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.5">Aislamiento térmico, fachadas ventiladas, cubiertas y certificación energética.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
      <tr><td style="padding:12px 16px;background:#fef5e7;border-radius:10px;border-left:4px solid #d4930d">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#8a6008">Informes técnicos (ITE/IEE)</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.5">Inspección Técnica de Edificios, informes de evaluación y planes de mantenimiento preventivo.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="padding:12px 16px;background:#f3eef8;border-radius:10px;border-left:4px solid #7c3aed">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;color:#5b21b6">Accesibilidad y mejoras</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.5">Instalación de ascensores, eliminación de barreras arquitectónicas y adecuación a normativa.</p>
      </td></tr>
    </table>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#333">En los próximos días nos pondremos en contacto con usted para conocer mejor su proyecto y ofrecerle una valoración personalizada sin compromiso.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
      <tr><td>
        <a class="cta-btn" href="https://reactivatuedificio.es" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d6a9f);color:#ffffff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px">Conocer nuestros proyectos</a>
      </td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:0;color:#555">Un cordial saludo,<br><strong style="color:#1e3a5f">Equipo SERASAN Engineering</strong></p>
    `
  );
}

function followUpEmailHtml(leadName) {
  const firstName = (leadName || '').split(' ')[0] || 'estimado/a cliente';
  return serasanEmailTemplate(
    'Casos de éxito en rehabilitación de edificios — SERASAN Engineering',
    `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#1a1a2e">Hola <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#333">Hace unos días mostró interés en nuestros servicios de rehabilitación de edificios. Queríamos compartir con usted algunos datos que consideramos de valor:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f8f9fa;border-radius:12px;overflow:hidden">
      <tr>
        <td style="padding:20px;text-align:center;width:33%">
          <p style="margin:0;font-size:28px;font-weight:700;color:#1e3a5f">+200</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6c757d;text-transform:uppercase">Proyectos realizados</p>
        </td>
        <td style="padding:20px;text-align:center;width:33%;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef">
          <p style="margin:0;font-size:28px;font-weight:700;color:#2d6a9f">98%</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6c757d;text-transform:uppercase">Clientes satisfechos</p>
        </td>
        <td style="padding:20px;text-align:center;width:33%">
          <p style="margin:0;font-size:28px;font-weight:700;color:#5a8f29">15+</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6c757d;text-transform:uppercase">Años de experiencia</p>
        </td>
      </tr>
    </table>
    <p style="font-size:14px;font-weight:600;color:#1e3a5f;margin:0 0 12px">¿Por qué comunidades de vecinos y administradores de fincas confían en nosotros?</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;font-size:14px;line-height:1.6;color:#333"><span style="color:#2d6a9f;font-weight:700;margin-right:8px">✓</span> <strong>Presupuesto cerrado</strong> — sin sorpresas ni costes ocultos.</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;line-height:1.6;color:#333"><span style="color:#2d6a9f;font-weight:700;margin-right:8px">✓</span> <strong>Gestión de subvenciones</strong> — tramitamos ayudas europeas, estatales y autonómicas.</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;line-height:1.6;color:#333"><span style="color:#2d6a9f;font-weight:700;margin-right:8px">✓</span> <strong>Mínimas molestias</strong> — planificación para reducir el impacto en los vecinos.</td></tr>
      <tr><td style="padding:8px 0 16px;font-size:14px;line-height:1.6;color:#333"><span style="color:#2d6a9f;font-weight:700;margin-right:8px">✓</span> <strong>Garantía total</strong> — seguro de responsabilidad civil en todos nuestros trabajos.</td></tr>
    </table>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#333">Si tiene un proyecto en mente, estaremos encantados de realizarle un <strong>estudio previo gratuito y sin compromiso</strong>. Solo tiene que responder a este email o llamarnos.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
      <tr><td>
        <a class="cta-btn" href="https://reactivatuedificio.es" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2d6a9f);color:#ffffff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Solicitar estudio gratuito</a>
      </td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:0;color:#555">Quedamos a su disposición,<br><strong style="color:#1e3a5f">Equipo SERASAN Engineering</strong></p>
    `
  );
}

function reminderEmailHtml(leadName) {
  const firstName = (leadName || '').split(' ')[0] || 'estimado/a cliente';
  return serasanEmailTemplate(
    'Última oportunidad: estudio gratuito de rehabilitación — SERASAN Engineering',
    `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#1a1a2e">Hola <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#333">Le escribimos por última vez respecto a su consulta sobre rehabilitación de edificios. Sabemos que estos proyectos requieren reflexión, y queremos asegurarnos de que dispone de toda la información necesaria.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="padding:20px;background:linear-gradient(135deg,#1e3a5f,#2d6a9f);border-radius:12px;text-align:center">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#ffffff">¿Sabía que puede obtener hasta un 80% de subvención?</p>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6">Las ayudas Next Generation y los programas autonómicos hacen que la rehabilitación sea más asequible que nunca. Nosotros nos encargamos de toda la tramitación.</p>
      </td></tr>
    </table>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#333">Le ofrecemos una <strong>consulta inicial totalmente gratuita</strong> donde:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr><td style="padding:10px 16px;font-size:14px;color:#333;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#e8f4f8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#1e3a5f;margin-right:10px">1</span> Evaluamos el estado actual de su edificio</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#333;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#e8f4f8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#1e3a5f;margin-right:10px">2</span> Identificamos las actuaciones prioritarias</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#333;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#e8f4f8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#1e3a5f;margin-right:10px">3</span> Le informamos sobre las subvenciones aplicables</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#333;line-height:1.5"><span style="display:inline-block;width:24px;height:24px;background:#e8f4f8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#1e3a5f;margin-right:10px">4</span> Le entregamos un presupuesto orientativo sin compromiso</td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
      <tr><td>
        <a class="cta-btn" href="mailto:soporte@reactivatuedificio.es?subject=Consulta%20rehabilitaci%C3%B3n%20edificio" style="display:inline-block;background:linear-gradient(135deg,#d4930d,#e6a817);color:#ffffff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Responder ahora</a>
      </td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:0 0 8px;color:#555">También puede llamarnos directamente. Estaremos encantados de atenderle.</p>
    <p style="font-size:14px;line-height:1.6;margin:0;color:#555">Un saludo cordial,<br><strong style="color:#1e3a5f">Equipo SERASAN Engineering</strong></p>
    `
  );
}

function contactedEmailHtml(leadName) {
  const firstName = (leadName || '').split(' ')[0] || 'estimado/a cliente';
  return serasanEmailTemplate(
    'Gracias por su interés — SERASAN Engineering',
    `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#1a1a2e">Hola <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#333">Queríamos agradecerle su tiempo e interés en los servicios de rehabilitación de <strong>SERASAN Engineering</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="padding:20px;background:#f0f7e6;border-radius:12px;border-left:4px solid #5a8f29">
        <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#3d6b1a">Hemos registrado su consulta</p>
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6">Nuestro equipo técnico ya está trabajando en su caso. En breve recibirá información detallada adaptada a las necesidades específicas de su edificio.</p>
      </td></tr>
    </table>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#333">Mientras tanto, estos son los <strong>próximos pasos</strong> habituales:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td style="padding:12px;text-align:center;width:33%">
          <div style="width:40px;height:40px;background:#e8f4f8;border-radius:50%;margin:0 auto 8px;line-height:40px;font-size:16px;font-weight:700;color:#1e3a5f">1</div>
          <p style="margin:0;font-size:13px;font-weight:600;color:#1e3a5f">Análisis</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6c757d;line-height:1.4">Estudiamos su caso</p>
        </td>
        <td style="padding:12px;text-align:center;width:33%">
          <div style="width:40px;height:40px;background:#f0f7e6;border-radius:50%;margin:0 auto 8px;line-height:40px;font-size:16px;font-weight:700;color:#3d6b1a">2</div>
          <p style="margin:0;font-size:13px;font-weight:600;color:#3d6b1a">Propuesta</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6c757d;line-height:1.4">Presupuesto detallado</p>
        </td>
        <td style="padding:12px;text-align:center;width:33%">
          <div style="width:40px;height:40px;background:#fef5e7;border-radius:50%;margin:0 auto 8px;line-height:40px;font-size:16px;font-weight:700;color:#8a6008">3</div>
          <p style="margin:0;font-size:13px;font-weight:600;color:#8a6008">Ejecución</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6c757d;line-height:1.4">Inicio de la obra</p>
        </td>
      </tr>
    </table>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#333">Ante cualquier duda, no dude en respondernos o llamarnos. Estamos aquí para ayudarle.</p>
    <p style="font-size:14px;line-height:1.6;margin:0;color:#555">Con nuestro mejor saludo,<br><strong style="color:#1e3a5f">Equipo SERASAN Engineering</strong></p>
    `
  );
}

// ─── 8a. WELCOME EMAIL — on new lead creation ────────────────────

export const sendWelcomeEmail = onDocumentCreated(
  {
    document: '{collection}/{docId}',
    region: 'europe-west1',
  },
  async (event) => {
    const colName = event.params.collection;
    if (!newLeadCollections.includes(colName)) return;

    const config = await getEmailSequenceConfig();
    if (!config?.welcome?.enabled) return;

    const data = event.data?.data();
    if (!data) return;

    const leadEmail = data.email || '';
    if (!leadEmail) return;

    const leadName = data.name || data.nombre || '';

    try {
      const html = welcomeEmailHtml(leadName);
      const subject = config.welcome.subject || 'Bienvenido/a a SERASAN Engineering';
      const senderName = config.senderName || 'SERASAN Engineering';

      const transporter = getTransporter(GMAIL_USER, GMAIL_APP_PASS);
      await transporter.sendMail({
        from: `${senderName} <${GMAIL_USER}>`,
        to: leadEmail,
        subject,
        html,
      });

      await db.collection(colName).doc(event.params.docId).update({
        '_emailSequence.welcome': Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection(colName).doc(event.params.docId).collection('activity').add({
        leadId: event.params.docId,
        timestamp: FieldValue.serverTimestamp(),
        actor: 'system',
        actorName: 'Secuencia Email',
        action: 'email_sent',
        details: {
          description: `Email de bienvenida enviado a ${leadEmail}`,
          field: 'emailSequence',
          newValue: 'welcome',
        },
      });

      console.log(`Welcome email sent to ${leadEmail} for lead ${event.params.docId}`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${leadEmail}:`, error.message);
    }
  }
);

// ─── 8b. FOLLOW-UP & REMINDER — scheduled hourly ────────────────

export const processEmailSequence = onSchedule(
  {
    schedule: 'every 1 hours',
    region: 'europe-west1',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const config = await getEmailSequenceConfig();
    if (!config) return;

    const followUpDays = config.followUp?.delayDays || 3;
    const reminderDays = config.reminder?.delayDays || 7;
    const now = Date.now();
    const senderName = config.senderName || 'SERASAN Engineering';

    for (const col of newLeadCollections) {
      const snap = await db.collection(col).where('status', '==', 'nuevo').get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const leadEmail = data.email || '';
        if (!leadEmail) continue;

        const createdAtMs = data.createdAt?.toMillis?.() || now;
        const daysSinceCreation = (now - createdAtMs) / (1000 * 60 * 60 * 24);
        const seq = data._emailSequence || {};
        const leadName = data.name || data.nombre || '';

        // Follow-up
        if (config.followUp?.enabled && daysSinceCreation >= followUpDays && !seq.followUp) {
          try {
            const html = followUpEmailHtml(leadName);
            const subject = config.followUp.subject || 'Casos de éxito en rehabilitación — SERASAN Engineering';
            const transporter = getTransporter(GMAIL_USER, GMAIL_APP_PASS);
            await transporter.sendMail({ from: `${senderName} <${GMAIL_USER}>`, to: leadEmail, subject, html });

            await db.collection(col).doc(doc.id).update({
              '_emailSequence.followUp': Timestamp.now(),
              updatedAt: FieldValue.serverTimestamp(),
            });

            await db.collection(col).doc(doc.id).collection('activity').add({
              leadId: doc.id,
              timestamp: FieldValue.serverTimestamp(),
              actor: 'system',
              actorName: 'Secuencia Email',
              action: 'email_sent',
              details: {
                description: `Email de seguimiento (día ${followUpDays}) enviado a ${leadEmail}`,
                field: 'emailSequence',
                newValue: 'followUp',
              },
            });

            console.log(`Follow-up email sent to ${leadEmail} (lead ${doc.id})`);
          } catch (error) {
            console.error(`Follow-up email failed for ${doc.id}:`, error.message);
          }
        }

        // Reminder
        if (config.reminder?.enabled && daysSinceCreation >= reminderDays && !seq.reminder) {
          try {
            const html = reminderEmailHtml(leadName);
            const subject = config.reminder.subject || 'Última oportunidad: estudio gratuito de rehabilitación';
            const transporter = getTransporter(GMAIL_USER, GMAIL_APP_PASS);
            await transporter.sendMail({ from: `${senderName} <${GMAIL_USER}>`, to: leadEmail, subject, html });

            await db.collection(col).doc(doc.id).update({
              '_emailSequence.reminder': Timestamp.now(),
              updatedAt: FieldValue.serverTimestamp(),
            });

            await db.collection(col).doc(doc.id).collection('activity').add({
              leadId: doc.id,
              timestamp: FieldValue.serverTimestamp(),
              actor: 'system',
              actorName: 'Secuencia Email',
              action: 'email_sent',
              details: {
                description: `Email recordatorio (día ${reminderDays}) enviado a ${leadEmail}`,
                field: 'emailSequence',
                newValue: 'reminder',
              },
            });

            console.log(`Reminder email sent to ${leadEmail} (lead ${doc.id})`);
          } catch (error) {
            console.error(`Reminder email failed for ${doc.id}:`, error.message);
          }
        }
      }
    }
  }
);

// ─── 8c. CONTACTED EMAIL — callable from frontend ───────────────

export const sendContactedEmail = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const { leadId, collection: colName } = request.data;
    if (!leadId || !colName) {
      throw new HttpsError('invalid-argument', 'Se requieren leadId y collection.');
    }

    const config = await getEmailSequenceConfig();
    if (!config?.contacted?.enabled) {
      return { success: false, reason: 'contacted email disabled' };
    }

    const leadRef = db.collection(colName).doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      throw new HttpsError('not-found', `Lead ${leadId} no encontrado.`);
    }

    const data = leadSnap.data();
    const leadEmail = data.email || '';
    if (!leadEmail) return { success: false, reason: 'lead has no email' };

    if (data._emailSequence?.contacted) {
      return { success: false, reason: 'already sent' };
    }

    const leadName = data.name || data.nombre || '';
    const senderName = config.senderName || 'SERASAN Engineering';

    try {
      const html = contactedEmailHtml(leadName);
      const subject = config.contacted.subject || 'Gracias por su interés — SERASAN Engineering';
      const transporter = getTransporter(GMAIL_USER, GMAIL_APP_PASS);
      await transporter.sendMail({ from: `${senderName} <${GMAIL_USER}>`, to: leadEmail, subject, html });

      await leadRef.update({
        '_emailSequence.contacted': Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection(colName).doc(leadId).collection('activity').add({
        leadId,
        timestamp: FieldValue.serverTimestamp(),
        actor: request.auth.uid,
        actorName: request.auth.token.name || request.auth.token.email || 'Sistema',
        action: 'email_sent',
        details: {
          description: `Email de contacto realizado enviado a ${leadEmail}`,
          field: 'emailSequence',
          newValue: 'contacted',
        },
      });

      return { success: true };
    } catch (error) {
      console.error(`Contacted email failed for ${leadId}:`, error.message);
      throw new HttpsError('internal', `Error al enviar email: ${error.message}`);
    }
  }
);

// ─── 9. INIT EMAIL SEQUENCE CONFIG (callable) ────────────────────

export const initEmailSequenceConfig = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }

    const ref = db.doc('settings/emailSequence');
    const snap = await ref.get();

    if (snap.exists) {
      return { success: true, message: 'Config already exists', config: snap.data() };
    }

    const defaultConfig = {
      enabled: true,
      senderName: 'SERASAN Engineering',
      welcome: {
        enabled: true,
        delayDays: 0,
        subject: 'Bienvenido/a a SERASAN Engineering — Rehabilitación integral de edificios',
      },
      followUp: {
        enabled: true,
        delayDays: 3,
        subject: 'Casos de éxito en rehabilitación — SERASAN Engineering',
      },
      reminder: {
        enabled: true,
        delayDays: 7,
        subject: 'Última oportunidad: estudio gratuito de rehabilitación',
      },
      contacted: {
        enabled: true,
        delayDays: 0,
        subject: 'Gracias por su interés — SERASAN Engineering',
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    };

    await ref.set(defaultConfig);
    return { success: true, message: 'Default config created', config: defaultConfig };
  }
);

// ─── Server-Side Scoring ─────────────────────────────────────────

/**
 * Recalculates lead score on every write to leads/{docId}.
 * Guard: only writes back if score or isStale actually changed (prevents infinite loop).
 */
export const onLeadWrite = onDocumentWritten(
  { document: 'leads/{docId}', region: 'europe-west1' },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return; // Document was deleted

    const { score, breakdown } = calculateLeadScore(after);
    const stale = isLeadStale(after);

    // Only write if values actually changed
    if (after.score === score && after.isStale === stale) return;

    await event.data.after.ref.update({
      score,
      scoreBreakdown: breakdown,
      isStale: stale,
    });
  }
);

/**
 * One-time backfill: computes scores for all existing leads.
 * Call via Firebase console or client SDK. Requires admin role.
 */
export const backfillScores = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required');

    const userDoc = await db.doc(`users/${request.auth.uid}`).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const snapshot = await db.collection('leads').get();
    let updated = 0;
    let skipped = 0;
    const BATCH_LIMIT = 499;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { score, breakdown } = calculateLeadScore(data);
      const stale = isLeadStale(data);

      if (data.score === score && data.isStale === stale) {
        skipped++;
        continue;
      }

      batch.update(doc.ref, { score, scoreBreakdown: breakdown, isStale: stale });
      batchCount++;
      updated++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    return { updated, skipped, total: snapshot.size };
  }
);

// ─── Send email to a lead ─────────────────────────────────────────────────────

export const sendLeadEmail = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required');

    const { to, subject, body, leadId } = request.data;
    if (!to || !subject || !body) throw new HttpsError('invalid-argument', 'Missing fields');

    if (!GMAIL_USER || !GMAIL_APP_PASS) {
      throw new HttpsError('failed-precondition', 'Gmail credentials not configured');
    }

    const transporter = getTransporter(GMAIL_USER, GMAIL_APP_PASS);
    await transporter.sendMail({
      from: `"SERASAN Lead Manager" <${GMAIL_USER}>`,
      to,
      subject,
      html: emailTemplate(subject, `<p style="font-size:14px;color:#333;line-height:1.6">${body.replace(/\n/g, '<br>')}</p>`),
    });

    // Record activity
    if (leadId) {
      const userDoc = await db.doc(`users/${request.auth.uid}`).get();
      const userName = userDoc.exists ? (userDoc.data().name || userDoc.data().email) : request.auth.uid;

      await db.collection('leads').doc(leadId).collection('activity').add({
        action: 'email_sent',
        actor: request.auth.uid,
        actorName: userName,
        details: { subject, to },
        timestamp: Timestamp.now(),
      });
    }

    return { success: true };
  }
);

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

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

    const config = await getAlertConfig();
    if (!config) return;

    const data = event.data?.data();
    if (!data) return;

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

// ─── 5. APOLLO ENRICHMENT (callable) ─────────────────────────────
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

// ─── 6. AUTO-ENRICH ON NEW LEAD (optional) ───────────────────────
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

// ─── 7. CLEAN TEST DATA (callable, admin only) ───────────────────
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

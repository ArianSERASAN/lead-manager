import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

initializeApp();
const db = getFirestore();

// Gmail credentials — set via:
//   firebase functions:secrets:set GMAIL_USER       (tu email de Gmail)
//   firebase functions:secrets:set GMAIL_APP_PASS   (App Password de Google)
const gmailUser = defineSecret('GMAIL_USER');
const gmailAppPass = defineSecret('GMAIL_APP_PASS');

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
    secrets: [gmailUser, gmailAppPass],
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
        await sendEmail(gmailUser.value(), gmailAppPass.value(), nl.recipients, `Nuevo lead: ${name}`, emailTemplate('Nuevo Lead', body));
      }
    }

    // ─ Hot lead alert
    const hl = config.hotLead;
    if (hl?.enabled && hl.recipients?.length > 0 && score >= (hl.scoreThreshold || 70)) {
      const body = `
        <h2 style="color:#111;margin:0 0 16px;font-size:16px">🔥 Lead caliente detectado</h2>
        <p style="font-size:14px;color:#374151"><strong>${name}</strong> (${email}) tiene un score de <span style="color:#ea580c;font-weight:700">${score}</span>, por encima del umbral de ${hl.scoreThreshold}.</p>
        <p style="font-size:13px;color:#6b7280;margin-top:8px">Origen: ${sourceLabel(source)}${company ? ` · Empresa: ${company}` : ''}</p>`;
      await sendEmail(gmailUser.value(), gmailAppPass.value(), hl.recipients, `🔥 Lead caliente: ${name} (score ${score})`, emailTemplate('Lead Caliente', body));
    }
  }
);

// ─── 2. UNATTENDED LEADS CHECK (every hour) ──────────────────────

export const checkUnattendedLeads = onSchedule(
  {
    schedule: 'every 1 hours',
    secrets: [gmailUser, gmailAppPass],
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

    await sendEmail(gmailUser.value(), gmailAppPass.value(), config.unattended.recipients, `⏰ ${unattended.length} lead${unattended.length > 1 ? 's' : ''} sin atender`, emailTemplate('Leads Sin Atender', body));

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
    secrets: [gmailUser, gmailAppPass],
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

    await sendEmail(gmailUser.value(), gmailAppPass.value(), config.stale.recipients, `⚠️ ${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} estancado${staleLeads.length > 1 ? 's' : ''}`, emailTemplate('Leads Estancados', body));
  }
);

// ─── 4. DIGEST (daily 9:00 / weekly Monday 9:00) ────────────────

export const dailyDigest = onSchedule(
  {
    schedule: 'every day 09:00',
    secrets: [gmailUser, gmailAppPass],
    region: 'europe-west1',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const config = await getAlertConfig();
    if (!config?.digest?.enabled || !config.digest.recipients?.length) return;

    if (config.digest.frequency === 'weekly') {
      const today = new Date();
      if (today.getDay() !== 1) return;
    }

    const isWeekly = config.digest.frequency === 'weekly';
    const periodMs = isWeekly ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const periodStart = Timestamp.fromMillis(Date.now() - periodMs);
    const periodLabel = isWeekly ? 'esta semana' : 'hoy';

    let totalLeads = 0;
    let newLeadsCount = 0;
    const statusCounts = { nuevo: 0, contactado: 0, 'en-progreso': 0, cerrado: 0 };
    const recentLeads = [];

    for (const col of newLeadCollections) {
      const allSnap = await db.collection(col).get();
      totalLeads += allSnap.size;

      allSnap.docs.forEach(d => {
        const data = d.data();
        const status = data.status || 'nuevo';
        if (statusCounts[status] !== undefined) statusCounts[status]++;

        if (data.createdAt && data.createdAt.toMillis && data.createdAt.toMillis() > periodStart.toMillis()) {
          newLeadsCount++;
          recentLeads.push(data);
        }
      });
    }

    const recentRows = recentLeads.slice(0, 10).map(l => {
      const name = l.name || l.nombre || 'Sin nombre';
      const source = sourceLabel(l.source || 'manual');
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${name}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${l.email || ''}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${source}</td></tr>`;
    }).join('');

    const body = `
      <h2 style="color:#111;margin:0 0 16px;font-size:16px">Resumen ${isWeekly ? 'semanal' : 'diario'}</h2>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <div style="flex:1;background:#eff6ff;border-radius:12px;padding:16px;text-align:center">
          <p style="font-size:24px;font-weight:700;color:#1d4ed8;margin:0">${newLeadsCount}</p>
          <p style="font-size:11px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Nuevos ${periodLabel}</p>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
          <p style="font-size:24px;font-weight:700;color:#16a34a;margin:0">${totalLeads}</p>
          <p style="font-size:11px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Total leads</p>
        </div>
        <div style="flex:1;background:#fef3c7;border-radius:12px;padding:16px;text-align:center">
          <p style="font-size:24px;font-weight:700;color:#d97706;margin:0">${statusCounts.nuevo}</p>
          <p style="font-size:11px;color:#6b7280;margin:4px 0 0;text-transform:uppercase">Sin gestionar</p>
        </div>
      </div>
      <h3 style="font-size:13px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Pipeline</h3>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <span style="flex:1;background:#d1fae5;color:#065f46;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts.nuevo} Nuevos</span>
        <span style="flex:1;background:#fef3c7;color:#92400e;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts.contactado} Contactados</span>
        <span style="flex:1;background:#ede9fe;color:#5b21b6;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts['en-progreso']} En Progreso</span>
        <span style="flex:1;background:#fee2e2;color:#991b1b;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:600">${statusCounts.cerrado} Cerrados</span>
      </div>
      ${recentLeads.length > 0 ? `
        <h3 style="font-size:13px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Últimos leads</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280">Nombre</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280">Email</th><th style="padding:8px;text-align:left;font-size:11px;color:#6b7280">Origen</th></tr>
          ${recentRows}
        </table>
      ` : '<p style="color:#9ca3af;font-size:13px">No hay leads nuevos en este periodo.</p>'}`;

    const subject = isWeekly
      ? `📊 Resumen semanal: ${newLeadsCount} nuevos leads, ${totalLeads} total`
      : `📊 Resumen diario: ${newLeadsCount} nuevos leads`;

    await sendEmail(gmailUser.value(), gmailAppPass.value(), config.digest.recipients, subject, emailTemplate(`Resumen ${isWeekly ? 'Semanal' : 'Diario'}`, body));
  }
);

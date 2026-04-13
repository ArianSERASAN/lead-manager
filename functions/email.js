import nodemailer from 'nodemailer';

export function getTransporter(user, pass) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export async function sendEmail(user, pass, to, subject, html) {
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

export function sourceLabel(source) {
  const map = {
    landing: 'Landing Page',
    'web-download': 'Descarga PDF',
    'web-contact': 'Formulario Web',
    manual: 'Manual',
  };

  return map[source] || source;
}

export function statusLabel(status) {
  const map = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    'en-progreso': 'En Progreso',
    cerrado: 'Cerrado',
  };

  return map[status] || status;
}

export function emailTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:18px">🔔 ${title}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px">Lead Manager - SERASAN Engineering</p>
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

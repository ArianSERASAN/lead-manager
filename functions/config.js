export const GMAIL_USER = process.env.GMAIL_USER;
export const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
export const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';

export const LEAD_COLLECTIONS = ['leads', 'leads_descargas', 'solicitudes_contacto'];

export const LEAD_SOURCE_BY_COLLECTION = {
  leads: 'landing',
  leads_descargas: 'web-download',
  solicitudes_contacto: 'web-contact',
};

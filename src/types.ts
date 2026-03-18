export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: 'landing' | 'web-download' | 'web-contact';
  type?: string; // e.g. "Oficinas", "Industrial"
  resource?: string; // for downloads
  message?: string; // for contact form
  status: 'nuevo' | 'contactado' | 'en-progreso' | 'cerrado';
  createdAt: any; // Firestore Timestamp
  notes?: string; 
  data: any; // Raw data for extra fields
}

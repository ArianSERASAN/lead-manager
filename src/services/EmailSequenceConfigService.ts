import { doc, setDoc, onSnapshot, Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailSequenceConfig } from '../types/domain';

const SETTINGS_DOC = doc(db, 'settings', 'emailSequence');

/** Default email sequence config — everything off until activated */
export const DEFAULT_EMAIL_SEQUENCE_CONFIG: EmailSequenceConfig = {
  enabled: false,
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
};

/** Subscribe to real-time email sequence config changes */
export function subscribeToEmailSequenceConfig(
  callback: (config: EmailSequenceConfig) => void,
): Unsubscribe {
  return onSnapshot(SETTINGS_DOC, (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULT_EMAIL_SEQUENCE_CONFIG, ...snap.data() } as EmailSequenceConfig);
    } else {
      callback(DEFAULT_EMAIL_SEQUENCE_CONFIG);
    }
  });
}

/** Save the full email sequence config */
export async function saveEmailSequenceConfig(
  config: EmailSequenceConfig,
  updatedBy: string,
): Promise<void> {
  await setDoc(SETTINGS_DOC, {
    ...config,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

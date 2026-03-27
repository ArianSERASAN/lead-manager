import { doc, getDoc, setDoc, onSnapshot, Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertConfig } from '../types/domain';

const SETTINGS_DOC = doc(db, 'settings', 'alerts');

/** Default alert config — everything off */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  newLead: {
    enabled: false,
    recipients: [],
    sources: ['landing', 'web-contact', 'web-download', 'manual'],
  },
  hotLead: {
    enabled: false,
    recipients: [],
    scoreThreshold: 70,
  },
  unattended: {
    enabled: false,
    recipients: [],
    hoursThreshold: 24,
  },
  stale: {
    enabled: false,
    recipients: [],
    daysThreshold: 7,
  },
  digest: {
    enabled: false,
    recipients: [],
    frequency: 'daily',
  },
};

/** Fetch alert config (returns defaults if not set) */
export async function getAlertConfig(): Promise<AlertConfig> {
  const snap = await getDoc(SETTINGS_DOC);
  if (snap.exists()) {
    return { ...DEFAULT_ALERT_CONFIG, ...snap.data() } as AlertConfig;
  }
  return DEFAULT_ALERT_CONFIG;
}

/** Subscribe to real-time alert config changes */
export function subscribeToAlertConfig(callback: (config: AlertConfig) => void): Unsubscribe {
  return onSnapshot(SETTINGS_DOC, (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULT_ALERT_CONFIG, ...snap.data() } as AlertConfig);
    } else {
      callback(DEFAULT_ALERT_CONFIG);
    }
  });
}

/** Save the full alert config */
export async function saveAlertConfig(config: AlertConfig, updatedBy: string): Promise<void> {
  await setDoc(SETTINGS_DOC, {
    ...config,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

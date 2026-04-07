import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FieldDefinition } from '../types/domain';

const SCHEMA_REF = () => doc(db, 'settings', 'fieldSchema');

export async function getFieldSchema(): Promise<FieldDefinition[]> {
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(SCHEMA_REF());
  return snap.exists() ? ((snap.data().fields as FieldDefinition[]) || []) : [];
}

export function subscribeToFieldSchema(
  callback: (fields: FieldDefinition[]) => void
): () => void {
  return onSnapshot(SCHEMA_REF(), (snap) => {
    callback(snap.exists() ? ((snap.data().fields as FieldDefinition[]) || []) : []);
  });
}

export async function saveFieldSchema(fields: FieldDefinition[]): Promise<void> {
  await setDoc(SCHEMA_REF(), { fields }, { merge: true });
}

export async function addField(
  field: FieldDefinition,
  existing: FieldDefinition[]
): Promise<void> {
  await saveFieldSchema([...existing, field]);
}

export async function updateField(
  fieldId: string,
  updates: Partial<FieldDefinition>,
  existing: FieldDefinition[]
): Promise<void> {
  await saveFieldSchema(
    existing.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
  );
}

export async function deleteField(
  fieldId: string,
  existing: FieldDefinition[]
): Promise<void> {
  await saveFieldSchema(existing.filter((f) => f.id !== fieldId));
}

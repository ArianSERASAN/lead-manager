import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Lead, LeadAttachment } from '../types/domain';
import * as LeadService from './LeadService';

export async function uploadAttachment(
  lead: Lead,
  file: File,
  userId: string,
  userName: string
): Promise<LeadAttachment> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `leads/${lead.id}/attachments/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const attachment: LeadAttachment = {
    name: file.name,
    url,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
    uploadedByName: userName,
  };

  const current = lead.attachments || [];
  await LeadService.updateLeadField(lead, 'attachments', [...current, attachment]);
  return attachment;
}

export async function deleteAttachment(
  lead: Lead,
  attachment: LeadAttachment
): Promise<void> {
  const updated = (lead.attachments || []).filter((a) => a.url !== attachment.url);
  await LeadService.updateLeadField(lead, 'attachments', updated);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

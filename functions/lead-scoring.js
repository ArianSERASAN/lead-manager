import { calculateLeadScore, isLeadStale } from './scoring.js';

export async function syncLeadScoring(ref, data) {
  const { score, breakdown } = calculateLeadScore(data);
  const stale = isLeadStale(data);

  if (data.score === score && data.isStale === stale) {
    return false;
  }

  await ref.update({
    score,
    scoreBreakdown: breakdown,
    isStale: stale,
  });

  return true;
}

export async function backfillLeadScoring(db, collectionNames) {
  let updated = 0;
  let skipped = 0;
  let total = 0;
  const BATCH_LIMIT = 499;
  let batch = db.batch();
  let batchCount = 0;

  for (const collectionName of collectionNames) {
    const snapshot = await db.collection(collectionName).get();
    total += snapshot.size;

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
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { updated, skipped, total };
}

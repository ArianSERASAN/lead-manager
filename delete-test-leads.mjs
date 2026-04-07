/**
 * Script para borrar todos los leads de prueba de Firestore.
 *
 * Colecciones que BORRA:
 *   - leads              (+ subcollecciones: activity, tasks por cada doc)
 *   - leads_descargas
 *   - solicitudes_contacto
 *   - notifications
 *   - tasks              (log global de tareas)
 *   - digest_log
 *
 * Colecciones que NO toca:
 *   - users
 *   - settings  (fieldSchema, alerts, autoAssign, emailSequence, digest)
 *
 * Autenticación:
 *   Requiere Application Default Credentials (ADC).
 *   Opciones (elige una):
 *     A) Ejecutar primero: gcloud auth application-default login
 *     B) Definir variable de entorno: set GOOGLE_APPLICATION_CREDENTIALS=ruta\al\serviceAccount.json
 *
 * Uso:
 *   node delete-test-leads.mjs [--dry-run]
 *
 *   --dry-run: muestra qué se borraría sin borrar nada
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = 'serasan-web';

// Colecciones a borrar (top-level)
const COLLECTIONS_TO_DELETE = [
  'leads',
  'leads_descargas',
  'solicitudes_contacto',
  'notifications',
  'tasks',
  'digest_log',
];

// Subcollecciones conocidas dentro de cada lead
const LEAD_SUBCOLLECTIONS = ['activity', 'tasks'];

// ── Inicializar Firebase Admin ──────────────────────────────────────────────

function initFirebase() {
  // Buscar service account en la raíz del proyecto
  const serviceAccountPaths = [
    './serviceAccount.json',
    './service-account.json',
    './firebase-adminsdk.json',
  ];

  for (const p of serviceAccountPaths) {
    const absPath = resolve(p);
    if (existsSync(absPath)) {
      console.log(`Usando service account: ${absPath}`);
      const serviceAccount = JSON.parse(readFileSync(absPath, 'utf8'));
      initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
      return;
    }
  }

  // Sin service account → usar Application Default Credentials
  const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (googleCreds) {
    console.log(`Usando GOOGLE_APPLICATION_CREDENTIALS: ${googleCreds}`);
  } else {
    console.log('Usando Application Default Credentials (gcloud ADC)...');
  }
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

// ── Utilidades ──────────────────────────────────────────────────────────────

async function deleteCollection(db, collectionPath, batchSize = 300) {
  const colRef = db.collection(collectionPath);
  let deleted = 0;

  while (true) {
    const snapshot = await colRef.limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      // Para la colección 'leads', borrar subcollecciones primero
      if (collectionPath === 'leads') {
        for (const sub of LEAD_SUBCOLLECTIONS) {
          await deleteCollection(db, `leads/${doc.id}/${sub}`, batchSize);
        }
      }
      batch.delete(doc.ref);
      deleted++;
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Borraría ${snapshot.docs.length} docs en /${collectionPath}`);
      // En dry-run sólo mostramos la primera página y salimos
      for (const doc of snapshot.docs) {
        console.log(`    - ${doc.id}: ${doc.data().name || doc.data().email || '(sin nombre)'}`);
      }
      break;
    }

    await batch.commit();
    process.stdout.write(`  Borrados ${deleted} docs en /${collectionPath}...\r`);
  }

  return deleted;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log('\n=== MODO DRY-RUN: no se borrará nada ===\n');
  } else {
    console.log('\n⚠️  ATENCIÓN: Se borrarán TODOS los leads de Firestore (proyecto: serasan-web)');
    console.log('    Colecciones preservadas: users, settings\n');
    // Pequeña pausa para que el usuario pueda cancelar (Ctrl+C)
    console.log('Iniciando en 3 segundos... (Ctrl+C para cancelar)\n');
    await new Promise(r => setTimeout(r, 3000));
  }

  initFirebase();
  const db = getFirestore();

  let totalDeleted = 0;

  for (const col of COLLECTIONS_TO_DELETE) {
    process.stdout.write(`Procesando /${col}...\n`);
    const count = await deleteCollection(db, col);
    if (!DRY_RUN) {
      console.log(`  ✓ /${col}: ${count} documentos borrados`);
      totalDeleted += count;
    }
  }

  if (!DRY_RUN) {
    console.log(`\n✅ Completado. Total borrado: ${totalDeleted} documentos.`);
  } else {
    console.log('\n[DRY-RUN completado. Nada fue borrado.]');
  }
}

main().catch(err => {
  console.error('\nError:', err.message);
  if (err.message.includes('credential') || err.message.includes('authentication')) {
    console.error('\n──────────────────────────────────────────────');
    console.error('Problema de autenticación. Elige una opción:');
    console.error('');
    console.error('  Opción A (recomendada si tienes gcloud CLI):');
    console.error('    gcloud auth application-default login');
    console.error('');
    console.error('  Opción B (service account):');
    console.error('    1. Ve a Firebase Console > Configuración del proyecto > Cuentas de servicio');
    console.error('    2. Genera nueva clave privada → guarda como serviceAccount.json en la raíz del proyecto');
    console.error('    3. Ejecuta de nuevo el script');
    console.error('──────────────────────────────────────────────');
  }
  process.exit(1);
});

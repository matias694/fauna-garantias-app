import { FinancialReceipt } from '../types';

const DB_NAME = 'fauna-financial-receipts';
const DB_VERSION = 1;
const STORE_NAME = 'receipts';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export interface ReceiptUploadContext {
  caseId: string;
  movementKind: 'DEVOLUCION_ARRENDATARIO' | 'PAGO_ARRENDATARIO' | 'APORTE_PROPIETARIO';
}

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('El navegador no soporta almacenamiento persistente de comprobantes.'));
    return;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento de comprobantes.'));
});

const putBlob = async (storageKey: string, file: File) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, storageKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('No se pudo guardar el comprobante.'));
  });
  db.close();
};

const getBlob = async (storageKey: string): Promise<Blob | null> => {
  const db = await openDb();
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(storageKey);
    request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
    request.onerror = () => reject(request.error || new Error('No se pudo leer el comprobante.'));
  });
  db.close();
  return result;
};

export const validateFinancialReceiptFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.has(file.type)) return 'El comprobante debe ser PDF, JPG, PNG o WEBP.';
  if (file.size > MAX_FILE_SIZE) return 'El comprobante no puede superar 10 MB.';
  return null;
};

/**
 * Adaptador de almacenamiento de comprobantes financieros.
 * Hoy persiste el binario en IndexedDB y guarda solo metadatos/storageKey en el caso.
 * En backend, esta función se reemplaza por un upload HTTP/S3/etc. que devuelva
 * el mismo contrato FinancialReceipt con storageProvider BACKEND y una URL segura.
 */
export const uploadFinancialReceipt = async (
  file: File,
  context: ReceiptUploadContext
): Promise<FinancialReceipt> => {
  const validationError = validateFinancialReceiptFile(file);
  if (validationError) throw new Error(validationError);

  const storageKey = `${context.caseId}/${context.movementKind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await putBlob(storageKey, file);

  return {
    id: `RECPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    storageKey,
    storageProvider: 'LOCAL_INDEXED_DB',
    uploadedAt: new Date().toISOString()
  };
};

export const openFinancialReceipt = async (receipt: FinancialReceipt): Promise<void> => {
  if (receipt.storageProvider === 'BACKEND' && receipt.url) {
    window.open(receipt.url, '_blank', 'noopener,noreferrer');
    return;
  }

  const blob = await getBlob(receipt.storageKey);
  if (!blob) throw new Error('No se encontró el archivo del comprobante en este dispositivo.');

  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

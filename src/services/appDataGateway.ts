import { AuditLog, GuaranteeCase, Receivable, SystemSettings } from '../types';

export interface AppDataSnapshot {
  cases: GuaranteeCase[];
  receivables: Receivable[];
  settings: SystemSettings;
  auditLogs: AuditLog[];
}

/**
 * Contrato único de persistencia del módulo.
 *
 * El frontend no debe saber si los datos viven en localStorage, una API REST,
 * Supabase, Firebase o el backend de la intranet. Para integrar el módulo a la
 * intranet se reemplaza/configura este gateway, no las pantallas.
 */
export interface AppDataGateway {
  /**
   * true cuando getBootstrapSnapshot contiene datos definitivos y se puede
   * comenzar a persistir inmediatamente. Un gateway HTTP normalmente usará
   * false hasta terminar hydrate().
   */
  readonly bootstrapIsAuthoritative: boolean;

  getBootstrapSnapshot(fallback: AppDataSnapshot): AppDataSnapshot;
  hydrate(): Promise<AppDataSnapshot | null>;

  saveCases(cases: GuaranteeCase[]): Promise<void>;
  saveReceivables(receivables: Receivable[]): Promise<void>;
  saveSettings(settings: SystemSettings): Promise<void>;
  saveAuditLogs(auditLogs: AuditLog[]): Promise<void>;

  /** Solo existe en el adaptador local de QA/prototipo. */
  ensurePrototypeSeed?(markerKey: string, snapshot: AppDataSnapshot): void;
}

const STORAGE_KEYS = {
  cases: 'fauna_guarantee_cases_v2',
  receivables: 'fauna_receivables_v2',
  settings: 'fauna_settings_v2',
  auditLogs: 'fauna_audit_logs_v2'
} as const;

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`No se pudo leer ${key}.`, error);
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Adaptador temporal del prototipo.
 * Toda dependencia de localStorage queda confinada aquí.
 */
export class LocalStorageAppDataGateway implements AppDataGateway {
  readonly bootstrapIsAuthoritative = true;

  getBootstrapSnapshot(fallback: AppDataSnapshot): AppDataSnapshot {
    return {
      cases: readJson(STORAGE_KEYS.cases, fallback.cases),
      receivables: readJson(STORAGE_KEYS.receivables, fallback.receivables),
      settings: readJson(STORAGE_KEYS.settings, fallback.settings),
      auditLogs: readJson(STORAGE_KEYS.auditLogs, fallback.auditLogs)
    };
  }

  async hydrate(): Promise<AppDataSnapshot | null> {
    // localStorage ya fue leído sincrónicamente durante el bootstrap.
    return null;
  }

  async saveCases(cases: GuaranteeCase[]): Promise<void> {
    writeJson(STORAGE_KEYS.cases, cases);
  }

  async saveReceivables(receivables: Receivable[]): Promise<void> {
    writeJson(STORAGE_KEYS.receivables, receivables);
  }

  async saveSettings(settings: SystemSettings): Promise<void> {
    writeJson(STORAGE_KEYS.settings, settings);
  }

  async saveAuditLogs(auditLogs: AuditLog[]): Promise<void> {
    writeJson(STORAGE_KEYS.auditLogs, auditLogs);
  }

  ensurePrototypeSeed(markerKey: string, snapshot: AppDataSnapshot): void {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(markerKey) === '1') return;

    writeJson(STORAGE_KEYS.cases, snapshot.cases);
    writeJson(STORAGE_KEYS.receivables, snapshot.receivables);
    writeJson(STORAGE_KEYS.settings, snapshot.settings);
    writeJson(STORAGE_KEYS.auditLogs, snapshot.auditLogs);
    localStorage.setItem(markerKey, '1');
  }
}

let configuredGateway: AppDataGateway = new LocalStorageAppDataGateway();

/**
 * Punto de reemplazo para la intranet. Debe ejecutarse antes de montar AppProvider.
 */
export const configureAppDataGateway = (gateway: AppDataGateway): void => {
  configuredGateway = gateway;
};

/**
 * Proxy estable: los consumidores no importan una implementación concreta.
 */
export const appDataGateway: AppDataGateway = {
  get bootstrapIsAuthoritative() {
    return configuredGateway.bootstrapIsAuthoritative;
  },
  getBootstrapSnapshot: (fallback) => configuredGateway.getBootstrapSnapshot(fallback),
  hydrate: () => configuredGateway.hydrate(),
  saveCases: (cases) => configuredGateway.saveCases(cases),
  saveReceivables: (receivables) => configuredGateway.saveReceivables(receivables),
  saveSettings: (settings) => configuredGateway.saveSettings(settings),
  saveAuditLogs: (auditLogs) => configuredGateway.saveAuditLogs(auditLogs),
  ensurePrototypeSeed: (markerKey, snapshot) => configuredGateway.ensurePrototypeSeed?.(markerKey, snapshot)
};

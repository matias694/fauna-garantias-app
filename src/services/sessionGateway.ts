import { UserRole } from '../types';

export interface AppSessionUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  permissions?: string[];
}

/**
 * Contrato de identidad del módulo.
 * En la intranet deberá resolverse desde la sesión autenticada del usuario.
 */
export interface SessionGateway {
  readonly canSwitchRoleInUi: boolean;
  getBootstrapUser(): AppSessionUser;
  refreshUser(): Promise<AppSessionUser | null>;
  switchPrototypeRole?(role: UserRole): AppSessionUser;
}

const prototypeUserForRole = (role: UserRole): AppSessionUser => ({
  id: `prototype-${role.toLowerCase()}`,
  // Mantiene la visual actual del historial mientras no exista identidad real.
  name: role,
  role,
  permissions: role === 'ADMINISTRADOR' ? ['*'] : []
});

class PrototypeSessionGateway implements SessionGateway {
  readonly canSwitchRoleInUi = true;
  private currentUser = prototypeUserForRole('ADMINISTRADOR');

  getBootstrapUser(): AppSessionUser {
    return this.currentUser;
  }

  async refreshUser(): Promise<AppSessionUser | null> {
    return null;
  }

  switchPrototypeRole(role: UserRole): AppSessionUser {
    this.currentUser = prototypeUserForRole(role);
    return this.currentUser;
  }
}

let configuredGateway: SessionGateway = new PrototypeSessionGateway();

/** Punto de reemplazo para conectar la sesión autenticada de la intranet. */
export const configureSessionGateway = (gateway: SessionGateway): void => {
  configuredGateway = gateway;
};

export const sessionGateway: SessionGateway = {
  get canSwitchRoleInUi() {
    return configuredGateway.canSwitchRoleInUi;
  },
  getBootstrapUser: () => configuredGateway.getBootstrapUser(),
  refreshUser: () => configuredGateway.refreshUser(),
  switchPrototypeRole: (role) => configuredGateway.switchPrototypeRole
    ? configuredGateway.switchPrototypeRole(role)
    : configuredGateway.getBootstrapUser()
};

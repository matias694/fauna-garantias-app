# Integración de Fauna Garantías con la intranet

Este módulo funciona hoy como prototipo local, pero la interfaz no debe depender del mecanismo de persistencia, autenticación ni almacenamiento de archivos.

La integración futura con la intranet debe realizarse reemplazando tres gateways antes de montar `AppProvider`.

## 1. Datos del módulo

Contrato: `src/services/appDataGateway.ts`

Configurar mediante:

```ts
configureAppDataGateway(myBackendGateway)
```

El gateway de intranet debe resolver:

- casos de garantía;
- cuentas por cobrar;
- configuración;
- auditoría.

`bootstrapIsAuthoritative` debe ser `false` si la aplicación necesita esperar una carga desde API. Mientras `hydrate()` no termine correctamente, el frontend no habilita escrituras sobre datos fallback.

La implementación local con `localStorage` es solamente el adaptador del prototipo.

## 2. Usuario autenticado y permisos

Contrato: `src/services/sessionGateway.ts`

Configurar mediante:

```ts
configureSessionGateway(myIntranetSessionGateway)
```

La intranet debe entregar como mínimo:

- ID estable del usuario;
- nombre;
- email cuando corresponda;
- rol;
- permisos.

En producción `canSwitchRoleInUi` debe ser `false`. El selector de roles existe solamente para QA del prototipo.

Los permisos sensibles —por ejemplo, métricas de riesgo Plan Full— deben validarse también en backend. Ocultar un bloque en React no constituye autorización suficiente.

## 3. Comprobantes y archivos financieros

Contrato: `src/services/financialReceiptStorage.ts`

Configurar mediante:

```ts
configureFinancialReceiptStorageGateway(myStorageGateway)
```

El gateway debe implementar operaciones asíncronas para:

- subir archivo;
- registrar el vínculo entre archivo y movimiento financiero;
- listar comprobantes de un caso;
- abrir/obtener un comprobante.

Hoy el prototipo guarda binarios en IndexedDB y metadata local. En producción el archivo debe vivir en storage del backend (S3, Supabase Storage, Firebase Storage u otro) y el backend debe devolver URLs seguras o firmadas.

## 4. Reglas que deben validarse nuevamente en servidor

Aunque el frontend mantenga las mismas reglas para experiencia de usuario, el backend debe volver a validar antes de persistir operaciones financieras o terminales:

- montos de garantía y cargos;
- aplicación de cobertura Full;
- distribución de recuperaciones;
- confirmación de liquidación;
- devolución al arrendatario;
- pago del arrendatario;
- aporte del propietario;
- castigo por incobrable;
- cierre/reapertura;
- permisos del usuario.

La auditoría definitiva debe generarse o confirmarse en servidor con usuario autenticado y timestamp del backend.

## 5. Identificadores

Los identificadores actuales del prototipo (`GAR-0001`, `REC-0001`, etc.) se generan en frontend para QA. En entorno multiusuario, la intranet/backend debe ser la autoridad para evitar colisiones. Se puede mantener el mismo formato visible, pero la asignación definitiva debe ser atómica en servidor.

## Principio de integración

Las pantallas no deben saber si trabajan contra `localStorage` o una API.

```text
Pantallas / UX
      ↓
AppContext / acciones del módulo
      ↓
Gateways configurables
      ↓
Backend de la intranet + base de datos + storage
```

La meta de esta separación es que la futura integración cambie infraestructura y validación de servidor, no el flujo ni la interfaz que ya fue definida con usuarios.

from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'{label} missing in {path}')
    p.write_text(s.replace(old, new, 1))


# Seguimiento posterior editable sin reabrir la garantía.
p = Path('src/components/FullCoverageCaseBanner.tsx')
s = p.read_text()
old = """  const openServiceDeferral = () => {
    if (!isConfirmed || guaranteeCase.isClosed || servicesPending <= 0) return;
    setDeferralReason(guaranteeCase.ownerServiceDeferral?.reason || '');
    setDeferralDate(guaranteeCase.ownerServiceDeferral?.nextReviewDate || '');
    setDeferralResponsible(guaranteeCase.ownerServiceDeferral?.responsible || guaranteeCase.responsible || '');
    setDeferralError('');
    setDeferralModalOpen(true);
  };

  const registerServiceDeferral = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConfirmed || guaranteeCase.isClosed || servicesPending <= 0) return;
    if (!deferralReason.trim() || !deferralDate || !deferralResponsible) {
      setDeferralError('Indica el acuerdo/motivo, la próxima fecha de revisión y el responsable.');
      return;
    }

    const existing = guaranteeCase.ownerServiceDeferral;
    updateGuaranteeCase(guaranteeCase.id, {
      ownerServiceDeferral: {
        amountAtDeferral: existing?.amountAtDeferral || servicesPending,
        reason: deferralReason.trim(),
        nextReviewDate: deferralDate,
        responsible: deferralResponsible,
        createdAt: existing?.createdAt || new Date().toISOString(),
        createdBy: existing?.createdBy || userRole
      },
      nextManagement: `Revisar pendiente propietario de ${formatCLP(servicesPending)}`,
      nextManagementDate: deferralDate,
      nextManagementResponsible: deferralResponsible
    });
    logAudit(
      guaranteeCase.id,
      existing ? 'Pendiente propietario actualizado' : 'Pendiente propietario diferido',
      `${formatCLP(servicesPending)} en gastos comunes/servicios · ${deferralReason.trim()} · próxima revisión ${formatDate(deferralDate)} · responsable ${deferralResponsible}`
    );
    setDeferralModalOpen(false);
  };
"""
new = """  const openServiceDeferral = () => {
    if (!isConfirmed || servicesPending <= 0) return;
    const currentFollowUp = guaranteeCase.isClosed
      ? guaranteeCase.ownerPostClosePending
      : guaranteeCase.ownerServiceDeferral;
    if (guaranteeCase.isClosed && !currentFollowUp) return;

    setDeferralReason(currentFollowUp?.reason || '');
    setDeferralDate(currentFollowUp?.nextReviewDate || '');
    setDeferralResponsible(currentFollowUp?.responsible || guaranteeCase.responsible || '');
    setDeferralError('');
    setDeferralModalOpen(true);
  };

  const registerServiceDeferral = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConfirmed || servicesPending <= 0) return;
    if (!deferralReason.trim() || !deferralDate || !deferralResponsible) {
      setDeferralError('Indica el acuerdo/motivo, la próxima fecha de revisión y el responsable.');
      return;
    }

    if (guaranteeCase.isClosed) {
      const existingPostClose = guaranteeCase.ownerPostClosePending;
      if (!existingPostClose || existingPostClose.status !== 'PENDIENTE') return;
      updateGuaranteeCase(guaranteeCase.id, {
        ownerPostClosePending: {
          ...existingPostClose,
          reason: deferralReason.trim(),
          nextReviewDate: deferralDate,
          responsible: deferralResponsible
        }
      });
      logAudit(
        guaranteeCase.id,
        'Seguimiento posterior actualizado',
        `${formatCLP(servicesPending)} pendientes del propietario · ${deferralReason.trim()} · próxima revisión ${formatDate(deferralDate)} · responsable ${deferralResponsible}`
      );
      setDeferralModalOpen(false);
      return;
    }

    const existing = guaranteeCase.ownerServiceDeferral;
    updateGuaranteeCase(guaranteeCase.id, {
      ownerServiceDeferral: {
        amountAtDeferral: existing?.amountAtDeferral || servicesPending,
        reason: deferralReason.trim(),
        nextReviewDate: deferralDate,
        responsible: deferralResponsible,
        createdAt: existing?.createdAt || new Date().toISOString(),
        createdBy: existing?.createdBy || userRole
      },
      nextManagement: `Revisar pendiente propietario de ${formatCLP(servicesPending)}`,
      nextManagementDate: deferralDate,
      nextManagementResponsible: deferralResponsible
    });
    logAudit(
      guaranteeCase.id,
      existing ? 'Pendiente propietario actualizado' : 'Pendiente propietario diferido',
      `${formatCLP(servicesPending)} en gastos comunes/servicios · ${deferralReason.trim()} · próxima revisión ${formatDate(deferralDate)} · responsable ${deferralResponsible}`
    );
    setDeferralModalOpen(false);
  };
"""
if old not in s:
    raise SystemExit('service deferral functions missing')
s = s.replace(old, new, 1)
old = """              {isConfirmed && !guaranteeCase.isClosed && (
                <button type=\"button\" onClick={openServiceDeferral} className=\"px-3.5 py-2 rounded-xl bg-sky-100/10 border border-sky-200/40 text-white hover:bg-sky-100/20 text-xs font-extrabold cursor-pointer\">
                  {activeServiceDeferral ? 'Editar pendiente' : 'Dejar pendiente'}
                </button>
              )}
"""
new = """              {isConfirmed && (!guaranteeCase.isClosed || postClosePending) && (
                <button type=\"button\" onClick={openServiceDeferral} className=\"px-3.5 py-2 rounded-xl bg-sky-100/10 border border-sky-200/40 text-white hover:bg-sky-100/20 text-xs font-extrabold cursor-pointer\">
                  {guaranteeCase.isClosed ? 'Actualizar seguimiento' : activeServiceDeferral ? 'Editar pendiente' : 'Dejar pendiente'}
                </button>
              )}
"""
if old not in s:
    raise SystemExit('deferral action button missing')
s = s.replace(old, new, 1)
s = s.replace(
    '<h3 className="font-bold text-base">Dejar pendiente del propietario</h3>',
    '<h3 className="font-bold text-base">{guaranteeCase.isClosed ? \'Actualizar seguimiento posterior\' : \'Dejar pendiente del propietario\'}</h3>',
    1,
)
s = s.replace(
    'La liquidación puede cerrarse sin registrar un pago ficticio. El saldo seguirá visible como pendiente del propietario hasta que se cubra efectivamente.',
    "{guaranteeCase.isClosed ? 'Este seguimiento permanece activo aunque la garantía y el contrato estén cerrados. Actualiza cuándo y quién debe revisarlo.' : 'La liquidación puede cerrarse sin registrar un pago ficticio. El saldo seguirá visible como pendiente del propietario hasta que se cubra efectivamente.'}",
    1,
)
p.write_text(s)

# En un caso cerrado se permiten comentarios, pero no crear una próxima gestión del flujo de garantía.
p = Path('src/components/GuaranteeCaseDetail/FollowUpTab.tsx')
s = p.read_text()
s = s.replace(
    "      nextManagement: hasNextManagement ? nextManagement.trim() : undefined,\n      nextManagementDate: hasNextManagement ? nextManagementDate : undefined,\n      nextManagementResponsible: hasNextManagement ? nextManagementResponsible : undefined",
    "      nextManagement: !guaranteeCase.isClosed && hasNextManagement ? nextManagement.trim() : undefined,\n      nextManagementDate: !guaranteeCase.isClosed && hasNextManagement ? nextManagementDate : undefined,\n      nextManagementResponsible: !guaranteeCase.isClosed && hasNextManagement ? nextManagementResponsible : undefined",
    1,
)
old = """              <div className=\"pt-1\">
                <label className=\"flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer\">
                  <input type=\"checkbox\" checked={hasNextManagement} onChange={(e) => setHasNextManagement(e.target.checked)} className=\"rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4\" />
                  <span>¿Programar Próxima Gestión?</span>
                </label>
              </div>
"""
new = """              <div className=\"pt-1\">
                {!guaranteeCase.isClosed ? (
                  <label className=\"flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer\">
                    <input type=\"checkbox\" checked={hasNextManagement} onChange={(e) => setHasNextManagement(e.target.checked)} className=\"rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4\" />
                    <span>¿Programar Próxima Gestión?</span>
                  </label>
                ) : (
                  <span className=\"text-[11px] text-slate-500\">Caso cerrado: la próxima revisión del pendiente del propietario se administra desde Liquidación.</span>
                )}
              </div>
"""
if old not in s:
    raise SystemExit('followup scheduling checkbox missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Casos demo: daños ya terminados deben tener trazabilidad mínima coherente con la UX actual.
def add_tracking(path, charge_id_fragment, provider, phone, email):
    p = Path(path)
    s = p.read_text()
    needle = f"          id: `${{created.id}}-{charge_id_fragment}`,"
    pos = s.find(needle)
    if pos < 0:
        raise SystemExit(f'{charge_id_fragment} missing in {path}')
    docs = "          documents: [],\n          photos: []"
    docs_pos = s.find(docs, pos)
    if docs_pos < 0:
        raise SystemExit(f'documents marker missing after {charge_id_fragment}')
    replacement = f"""          repairTracking: {{
            provider: '{provider}',
            providerPhone: '{phone}',
            providerEmail: '{email}',
            responsible: 'Gestor de Liquidaciones',
            status: 'TERMINADA',
            commitmentDate: '11/08/2026',
            notes: 'Dato ficticio para mantener coherencia del caso demo.'
          }},
          documents: [],
          photos: []"""
    s = s[:docs_pos] + s[docs_pos:].replace(docs, replacement, 1)
    p.write_text(s)

add_tracking('src/components/FullOwnerRecoveryDemoSeeder.tsx', 'CHG-DANOS', 'Maestro Demo Recuperaciones', '+56 9 0000 0790', 'maestro.recuperaciones@example.com')
add_tracking('src/components/FullCoverageDemoSeeder.tsx', 'CHG-1', 'Maestro Demo Full', '+56 9 0000 0690', 'maestro.full@example.com')

# ExactBalance usa addCharge en vez de objeto con id explícito.
p = Path('src/components/ExactBalanceDemoSeeder.tsx')
s = p.read_text()
old = """      notes: 'Dato ficticio: el total de cargos coincide exactamente con la garantía.',
      documents: [],
      photos: []
"""
new = """      notes: 'Dato ficticio: el total de cargos coincide exactamente con la garantía.',
      repairTracking: {
        provider: 'Maestro Demo Exacto',
        providerPhone: '+56 9 0000 0590',
        providerEmail: 'maestro.exacto@example.com',
        responsible: 'Gestor de Liquidaciones',
        status: 'TERMINADA',
        commitmentDate: '09/08/2026',
        notes: 'Dato ficticio para mantener coherencia del caso demo.'
      },
      documents: [],
      photos: []
"""
if old not in s:
    raise SystemExit('exact demo charge marker missing')
p.write_text(s.replace(old, new, 1))

# Nuevos cierres usan timestamp ISO; la UI mantiene compatibilidad con históricos.
p = Path('src/context/AppContext.tsx')
s = p.read_text()
s = s.replace("closedAt: new Date().toLocaleString('es-CL'),", "closedAt: new Date().toISOString(),", 1)
p.write_text(s)

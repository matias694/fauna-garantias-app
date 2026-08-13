from pathlib import Path

p = Path('src/components/NewGuaranteeModal.tsx')
s = p.read_text()

replacements = [
("  const [monthlyRent, setMonthlyRent] = useState<number>(550000);\n  const [plan, setPlan] = useState<AdministrationPlan>('FULL');\n  const [contractStartDate, setContractStartDate] = useState('2025-08-01');\n  const [contractEndDate, setContractEndDate] = useState(todayStr);\n\n  const [guaranteeAmount, setGuaranteeAmount] = useState<number>(550000);",
 "  const [monthlyRent, setMonthlyRent] = useState<number>(0);\n  const [plan, setPlan] = useState<AdministrationPlan | ''>('');\n  const [contractStartDate, setContractStartDate] = useState('');\n  const [contractEndDate, setContractEndDate] = useState(todayStr);\n\n  const [guaranteeAmount, setGuaranteeAmount] = useState<number>(0);"),
("  const [initialNotes, setInitialNotes] = useState('');\n\n  if (!isOpen) return null;",
 "  const [initialNotes, setInitialNotes] = useState('');\n  const [formError, setFormError] = useState('');\n\n  if (!isOpen) return null;"),
]
for old, new in replacements:
    if old not in s: raise SystemExit('state marker missing')
    s = s.replace(old, new, 1)

old = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim() || !tenantName.trim() || !ownerName.trim()) return;

    const created = createGuaranteeCase({
"""
new = """  const resetForm = () => {
    setAddress('');
    setComuna('Providencia');
    setUnit('');
    setOwnerName(''); setOwnerRut(''); setOwnerEmail(''); setOwnerPhone('');
    setTenantName(''); setTenantRut(''); setTenantEmail(''); setTenantPhone('');
    setMonthlyRent(0);
    setPlan('');
    setContractStartDate('');
    setContractEndDate(getLocalDateInputValue());
    setGuaranteeAmount(0);
    setReceptionDate(getLocalDateInputValue());
    setResponsible(settings.responsiblesList[0] || 'Constanza Silva');
    setInitialNotes('');
    setFormError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!address.trim() || !tenantName.trim() || !ownerName.trim() || !plan || !contractStartDate || !contractEndDate || !receptionDate) {
      setFormError('Completa los campos obligatorios antes de crear la garantía.');
      return;
    }
    if (monthlyRent <= 0 || guaranteeAmount <= 0) {
      setFormError('El canon mensual y el monto de garantía deben ser mayores a $0.');
      return;
    }
    if (contractEndDate < contractStartDate) {
      setFormError('La fecha de término del contrato no puede ser anterior a la fecha de inicio.');
      return;
    }

    const created = createGuaranteeCase({
"""
if old not in s: raise SystemExit('submit marker missing')
s = s.replace(old, new, 1)
s = s.replace("    onClose();\n    setSelectedCaseId(created.id);", "    resetForm();\n    onClose();\n    setSelectedCaseId(created.id);", 1)

# Plan explícito y montos positivos.
s = s.replace(
"""                <input
                  type="number"
                  step="5000"
                  value={monthlyRent}
""",
"""                <input
                  type="number"
                  min="1"
                  step="5000"
                  required
                  value={monthlyRent}
""",1)
s = s.replace(
"""                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as AdministrationPlan)}
""",
"""                <select
                  required
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as AdministrationPlan | '')}
""",1)
s = s.replace(
"""                >
                  <option value="ESTANDAR">Estándar</option>
""",
"""                >
                  <option value="" disabled>Seleccionar plan...</option>
                  <option value="ESTANDAR">Estándar</option>
""",1)
s = s.replace(
"""                  type="number"
                  step="5000"
                  required
                  value={guaranteeAmount}
""",
"""                  type="number"
                  min="1"
                  step="5000"
                  required
                  value={guaranteeAmount}
""",1)

# Fechas contractuales que antes eran invisibles.
marker = """            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Recepción Propiedad</label>
"""
insert = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inicio del contrato *</label>
                <input
                  type="date"
                  required
                  max={contractEndDate || undefined}
                  value={contractStartDate}
                  onChange={(e) => { setContractStartDate(e.target.value); setFormError(''); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Término del contrato *</label>
                <input
                  type="date"
                  required
                  min={contractStartDate || undefined}
                  value={contractEndDate}
                  onChange={(e) => { setContractEndDate(e.target.value); setFormError(''); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Recepción Propiedad</label>
"""
if marker not in s: raise SystemExit('reception grid marker missing')
s = s.replace(marker, insert, 1)

# Feedback visible y cancelación que descarta el formulario.
s = s.replace('onClick={onClose}', 'onClick={handleClose}', 2)
actions_marker = """          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
"""
actions_insert = """          {formError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-semibold text-rose-800">
              {formError}
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
"""
if actions_marker not in s: raise SystemExit('actions marker missing')
s = s.replace(actions_marker, actions_insert, 1)

p.write_text(s)

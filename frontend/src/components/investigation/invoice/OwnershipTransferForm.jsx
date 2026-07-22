import Field from "../common/Field";
import SelectField from "../common/SelectField";

function OwnershipTransferForm({
  form,
  onChange,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid gap-4 rounded-xl border border-slate-200 p-5 md:grid-cols-2"
    >
      <SelectField
        label="Tipo"
        value={form.type}
        options={[
          ["ENDORSEMENT", "Endoso"],
          ["ASSIGNMENT", "Cesión"],
          ["REINVOICE", "Refactura"],
          ["CANCELLATION", "Cancelación"],
        ]}
        onChange={(value) => onChange("type", value)}
      />

      <Field
        label="Fecha"
        type="date"
        value={form.transferDate}
        onChange={(value) =>
          onChange("transferDate", value)
        }
      />

      <Field
        label="De"
        value={form.fromName}
        onChange={(value) => onChange("fromName", value)}
      />

      <Field
        label="A favor de"
        value={form.toName}
        onChange={(value) => onChange("toName", value)}
      />

      <button className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white md:col-span-2">
        Agregar transmisión
      </button>
    </form>
  );
}

export default OwnershipTransferForm;

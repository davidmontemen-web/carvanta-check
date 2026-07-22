import Field from "../common/Field";
import SelectField from "../common/SelectField";

function FiscalDocumentForm({
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
          ["ORIGINAL_INVOICE", "Factura de origen"],
          ["REINVOICE", "Refactura"],
          ["LETTER_INVOICE", "Carta factura"],
          ["OTHER", "Otro"],
        ]}
        onChange={(value) => onChange("type", value)}
      />

      <Field
        label="Nombre"
        value={form.label}
        onChange={(value) => onChange("label", value)}
      />

      <Field
        label="UUID"
        value={form.uuid}
        onChange={(value) => onChange("uuid", value)}
      />

      <Field
        label="Fecha"
        type="date"
        value={form.issuedAt}
        onChange={(value) => onChange("issuedAt", value)}
      />

      <Field
        label="Emisor"
        value={form.issuerName}
        onChange={(value) => onChange("issuerName", value)}
      />

      <Field
        label="Receptor"
        value={form.receiverName}
        onChange={(value) => onChange("receiverName", value)}
      />

      <SelectField
        label="Estado SAT"
        value={form.satStatus}
        options={[
          ["", "Sin validar"],
          ["VALID", "Vigente"],
          ["CANCELLED", "Cancelado"],
          ["NOT_FOUND", "No encontrado"],
        ]}
        onChange={(value) => onChange("satStatus", value)}
      />

      <Field
        label="VIN"
        value={form.vin}
        onChange={(value) => onChange("vin", value)}
      />

      <button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white md:col-span-2">
        Agregar documento
      </button>
    </form>
  );
}

export default FiscalDocumentForm;

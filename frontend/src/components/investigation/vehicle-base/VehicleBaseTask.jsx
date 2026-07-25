import { useEffect, useState } from "react";

import { saveVehicleBase } from "../../../services/investigationApi";
import DocumentPanel from "../common/DocumentPanel";
import Field from "../common/Field";
import VehicleBasePreview from "./VehicleBasePreview";

function buildInitialForm(workspace) {
  const check = workspace.check;
  const vehicleBase = workspace.vehicleBase;

  return {
    vin: vehicleBase?.vin || check.vin || "",
    plate: vehicleBase?.plate || check.placas || "",
    brand: vehicleBase?.brand || check.marca || "",
    model: vehicleBase?.model || check.modelo || "",
    year:
      vehicleBase?.year || String(check.anio || ""),
    version:
      vehicleBase?.version || check.version || "",
    state: vehicleBase?.state || "",
    owner: vehicleBase?.owner || "",
    notes: vehicleBase?.notes || "",
  };
}

function VehicleBaseTask({
  workspace,
  loading,
  token,
  onReload,
}) {
  const [form, setForm] = useState(() =>
    buildInitialForm(workspace)
  );

  useEffect(() => {
    setForm(buildInitialForm(workspace));
  }, [workspace]);

  const circulationCard =
    workspace.check.documents?.find(
      (document) =>
        document.type === "tarjetaCirculacion"
    );

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await saveVehicleBase({
        investigationId:
          workspace.investigation.id,
        token,
        data: form,
      });

      await onReload();

      alert(
        "Identidad vehicular validada correctamente."
      );
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          "No se pudo guardar la validación."
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">
              Validación contra tarjeta de circulación
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Captura exactamente lo visible en el documento.
              El sistema comparará estos datos contra la
              información proporcionada por el cliente.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="VIN / NIV"
              value={form.vin}
              required
              onChange={(value) =>
                updateField("vin", value)
              }
            />

            <Field
              label="Placas"
              value={form.plate}
              required
              onChange={(value) =>
                updateField("plate", value)
              }
            />

            <Field
              label="Marca"
              value={form.brand}
              required
              onChange={(value) =>
                updateField("brand", value)
              }
            />

            <Field
              label="Modelo"
              value={form.model}
              required
              onChange={(value) =>
                updateField("model", value)
              }
            />

            <Field
              label="Año"
              value={form.year}
              required
              onChange={(value) =>
                updateField("year", value)
              }
            />

            <Field
              label="Versión"
              value={form.version}
              onChange={(value) =>
                updateField("version", value)
              }
            />

            <Field
              label="Entidad de registro"
              value={form.state}
              onChange={(value) =>
                updateField("state", value)
              }
            />

            <Field
              label="Propietario registrado"
              value={form.owner}
              onChange={(value) =>
                updateField("owner", value)
              }
            />
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Observaciones del investigador
            </span>

            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) =>
                updateField(
                  "notes",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Guardando..."
              : workspace.vehicleBase
                ? "Actualizar validación"
                : "Confirmar identidad"}
          </button>
        </form>

        <DocumentPanel
          document={circulationCard}
          title="Tarjeta de circulación"
        />
      </section>

      <VehicleBasePreview
        preview={workspace.vehicleIdentityPreview}
      />
    </div>
  );
}

export default VehicleBaseTask;

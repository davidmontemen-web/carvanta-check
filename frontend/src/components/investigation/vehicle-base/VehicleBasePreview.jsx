import SummaryItem from "../common/SummaryItem";

function VehicleBasePreview({
  vehicleBase,
  check,
}) {
  const vehicle = vehicleBase || {};

  return (
    <section className="rounded-xl border-2 border-slate-900 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Previo
      </p>

      <h3 className="mt-2 text-2xl font-bold text-slate-900">
        Identidad vehicular
      </h3>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SummaryItem
          label="VIN"
          value={vehicle.vin || check.vin}
        />
        <SummaryItem
          label="Placas"
          value={vehicle.plate || check.placas}
        />
        <SummaryItem
          label="Marca"
          value={vehicle.brand || check.marca}
        />
        <SummaryItem
          label="Modelo"
          value={vehicle.model || check.modelo}
        />
      </div>
    </section>
  );
}

export default VehicleBasePreview;

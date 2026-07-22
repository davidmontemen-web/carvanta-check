import SummaryItem from "./SummaryItem";

function VehicleReference({
  vehicleBase,
  check,
}) {
  const vehicle = vehicleBase || {};

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-900">
        Datos para realizar la consulta
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryItem
          label="VIN"
          value={vehicle.vin || check.vin}
        />

        <SummaryItem
          label="Placas"
          value={vehicle.plate || check.placas}
        />
      </div>
    </section>
  );
}

export default VehicleReference;

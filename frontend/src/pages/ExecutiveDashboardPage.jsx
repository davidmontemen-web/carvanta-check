import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function getVehicleTitle(check) {
  const knownVehicle = [
    check.marca,
    check.modelo,
    check.anio,
  ]
    .filter(Boolean)
    .join(" ");

  if (knownVehicle) {
    return knownVehicle;
  }

  if (check.vin) {
    return `VIN ${check.vin}`;
  }

  return "Vehículo pendiente de identificar";
}

function ExecutiveDashboardPage() {
  const navigate = useNavigate();

  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("PENDIENTES");

  const token = localStorage.getItem("carvanta_token");
  const user = JSON.parse(localStorage.getItem("carvanta_user") || "null");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadChecks();
  }, []);

  async function loadChecks() {
    try {
      const response = await api.get("/executive/checks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setChecks(response.data);
    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("carvanta_token");
        localStorage.removeItem("carvanta_user");
        navigate("/login");
      } else {
        alert("No se pudieron cargar los expedientes.");
      }
    } finally {
      setLoading(false);
    }
  }

  const groupedChecks = useMemo(() => {
    return {
      PENDIENTES: checks.filter((check) =>
        ["pagado", "PENDIENTE_DE_INVESTIGACION"].includes(check.status)
      ),
      EN_PROCESO: checks.filter(
        (check) => check.status === "EN_INVESTIGACION"
      ),
      TERMINADOS: checks.filter((check) =>
        ["reporte_generado", "REPORTE_PUBLICADO", "ENTREGADO"].includes(
          check.status
        )
      ),
    };
  }, [checks]);

  const visibleChecks = groupedChecks[activeFilter];

  const handleAssign = async (checkId) => {
  try {
    const response = await api.patch(
      `/executive/checks/${checkId}/assign`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    navigate(
      `/executive/investigations/${response.data.investigation.id}`
    );
  } catch (error) {
    console.error(error);

    alert(
      error.response?.data?.error ||
        "No se pudo tomar el expediente."
    );
  }
};

  const handleLogout = () => {
    localStorage.removeItem("carvanta_token");
    localStorage.removeItem("carvanta_user");
    navigate("/login");
  };

  if (loading) {
    return <main className="p-8">Cargando expedientes...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Carvanta</p>
            <h1 className="text-xl font-bold text-slate-900">
              Investigation Workspace
            </h1>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">
              {user?.name || "Ejecutivo"}
            </p>

            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 underline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard
            label="Pendientes"
            value={groupedChecks.PENDIENTES.length}
            active={activeFilter === "PENDIENTES"}
            onClick={() => setActiveFilter("PENDIENTES")}
          />

          <StatusCard
            label="En investigación"
            value={groupedChecks.EN_PROCESO.length}
            active={activeFilter === "EN_PROCESO"}
            onClick={() => setActiveFilter("EN_PROCESO")}
          />

          <StatusCard
            label="Terminados"
            value={groupedChecks.TERMINADOS.length}
            active={activeFilter === "TERMINADOS"}
            onClick={() => setActiveFilter("TERMINADOS")}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Expedientes</h2>
          </div>

          {visibleChecks.length === 0 ? (
            <p className="p-6 text-slate-600">
              No hay expedientes en esta sección.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {visibleChecks.map((check) => (
                <article
                  key={check.id}
                  className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      {check.folio || check.id}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
  {getVehicleTitle(check)}
</h3>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                      <span>
                        Cliente: {check.nombreCliente || "Sin registro"}
                      </span>
                      {check.vin && (
  <span>
    VIN: <strong>{check.vin}</strong>
  </span>
)}

                      <span>Estado: {check.status}</span>

                      <span>
                        Documentos: {check.documents?.length || 0}
                      </span>

                      <span>
                        Ejecutivo:{" "}
                        {check.assignedTo?.name || "Sin asignar"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
  {check.status === "EN_INVESTIGACION" ? (
    <button
      type="button"
      onClick={() => {
        if (check.investigation?.id) {
          navigate(
            `/executive/investigations/${check.investigation.id}`
          );
          return;
        }

        handleAssign(check.id);
      }}
      className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
    >
      Continuar
    </button>
  ) : activeFilter === "PENDIENTES" ? (
    <button
      type="button"
      onClick={() => handleAssign(check.id)}
      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
    >
      Tomar expediente
    </button>
  ) : check.investigation?.id ? (
    <button
      type="button"
      onClick={() =>
        navigate(
          `/executive/investigations/${check.investigation.id}`
        )
      }
      className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
    >
      Ver expediente
    </button>
  ) : (
    <span className="text-sm text-slate-500">
      Investigación no disponible
    </span>
  )}
</div>                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function StatusCard({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-5 text-left shadow-sm ${
        active
          ? "border-blue-500 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </button>
  );
}

export default ExecutiveDashboardPage;
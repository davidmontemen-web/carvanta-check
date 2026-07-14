import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl bg-white p-10 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-blue-600">
            Carvanta Check
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900">
            Compra un auto usado con más seguridad antes de entregar tu dinero.
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Carga la tarjeta de circulación y documentos del vehículo. Te damos
            un reporte básico con alertas, estado del expediente y recomendación.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/validar"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Validar expediente
            </Link>

            <div className="rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-700">
              MVP desde $199 MXN
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            "Revisión documental básica",
            "Alertas de expediente incompleto",
            "Reporte claro para decidir mejor",
          ].map((item) => (
            <div key={item} className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{item}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Funcional, rápido y enfocado en reducir riesgos antes de comprar.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
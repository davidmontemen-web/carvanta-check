import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      await api.patch(`/checks/${id}/pay`);
      navigate(`/reporte/${id}`);
    } catch (error) {
      console.error(error);
      alert("Error al procesar pago simulado.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Confirmar servicio
        </h1>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            Estás por generar tu Carvanta Check.
          </p>

          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Servicio</p>
            <p className="mt-1 font-semibold text-slate-900">
              Carvanta Check documental básico
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Precio</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              $199 MXN
            </p>
          </div>

          <button
            onClick={handlePayment}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Simular pago y generar reporte
          </button>
        </div>
      </div>
    </main>
  );
}

export default PaymentPage;
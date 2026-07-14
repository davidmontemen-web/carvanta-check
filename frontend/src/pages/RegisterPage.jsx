import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function RegisterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombreCliente: "",
    whatsapp: "",
    email: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombreCliente || !form.whatsapp || !form.email) {
      alert("Nombre, WhatsApp y email son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      await api.patch(`/checks/${id}/customer`, form);
      navigate(`/pago/${id}`);
    } catch (error) {
      console.error(error);
      alert("Error al registrar tus datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Datos para entregar tu reporte
        </h1>
        <p className="mt-1 text-slate-600">
          Usaremos estos datos para identificar tu solicitud.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <Input
            label="Nombre completo *"
            name="nombreCliente"
            value={form.nombreCliente}
            onChange={handleChange}
          />

          <Input
            label="WhatsApp *"
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
          />

          <Input
            label="Email *"
            name="email"
            value={form.email}
            onChange={handleChange}
          />

          <button
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Continuar al pago"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Input({ label, name, value, onChange }) {
  return (
    <label className="mb-4 block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
      />
    </label>
  );
}

export default RegisterPage;
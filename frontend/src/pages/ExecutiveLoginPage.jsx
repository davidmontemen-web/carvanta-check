import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function ExecutiveLoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "ejecutivo@carvanta.com",
    password: "admin123",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await api.post("/auth/login", form);

      localStorage.setItem("carvanta_token", response.data.token);
      localStorage.setItem(
        "carvanta_user",
        JSON.stringify(response.data.user)
      );

      navigate("/executive");
    } catch (error) {
      console.error(error);
      alert("Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-semibold text-blue-600">Carvanta</p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Portal ejecutivo
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Inicia sesión para gestionar investigaciones.
        </p>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </main>
  );
}

export default ExecutiveLoginPage;
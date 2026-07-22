import { API_URL } from "../../../services/api";

function DocumentPanel({
  document,
  title,
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      {!document ? (
        <p className="mt-3 text-sm text-red-600">
          Documento no encontrado.
        </p>
      ) : (
        <>
          <p className="mt-3 break-all text-sm text-slate-600">
            {document.fileName}
          </p>

          <a
            href={`${API_URL}${document.filePath}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            Abrir documento ↗
          </a>
        </>
      )}
    </aside>
  );
}

export default DocumentPanel;

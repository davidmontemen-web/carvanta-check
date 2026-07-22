import { API_URL } from "../../../services/api";

function ClientDocumentsPanel({
  documents = [],
}) {
  const invoiceDocuments = documents.filter((document) =>
    ["facturaFrente", "facturaReverso"].includes(
      document.type
    )
  );

  if (invoiceDocuments.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-lg font-bold text-slate-900">
        Documentos proporcionados por el cliente
      </h3>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {invoiceDocuments.map((document) => (
          <a
            key={document.id}
            href={`${API_URL}${document.filePath}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-200 p-4"
          >
            <p className="font-semibold text-slate-900">
              {document.type === "facturaFrente"
                ? "Factura frente"
                : "Factura reverso"}
            </p>

            <p className="mt-1 break-all text-sm text-slate-500">
              {document.fileName}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default ClientDocumentsPanel;

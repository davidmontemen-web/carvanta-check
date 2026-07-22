import { useState } from "react";

import {
  createFiscalDocument,
  createOwnershipTransfer,
  saveInvoiceAnalysis,
} from "../../../services/investigationApi";
import ClientDocumentsPanel from "./ClientDocumentsPanel";
import FiscalDocumentForm from "./FiscalDocumentForm";
import InvestigatorAnalysisForm from "./InvestigatorAnalysisForm";
import InvoicePreview from "./InvoicePreview";
import OwnershipTransferForm from "./OwnershipTransferForm";

function InvoiceTask({
  workspace,
  token,
  onReload,
  onArtifactUpload,
}) {
  const documents = workspace.fiscalDocuments || [];
  const transfers = workspace.ownershipTransfers || [];
  const saved = workspace.invoiceAnalysis || {};

  const [documentForm, setDocumentForm] = useState({
    sequence: documents.length + 1,
    type: "ORIGINAL_INVOICE",
    label: "",
    uuid: "",
    issuerName: "",
    receiverName: "",
    issuedAt: "",
    satStatus: "",
    vin:
      workspace.vehicleBase?.vin ||
      workspace.check.vin ||
      "",
    notes: "",
  });

  const [transferForm, setTransferForm] = useState({
    sequence: transfers.length + 1,
    type: "ENDORSEMENT",
    fromName: "",
    toName: "",
    transferDate: "",
    notes: "",
  });

  const [analysis, setAnalysis] = useState({
    documentQuality: saved.documentQuality || "",
    allCfdiValidated: saved.allCfdiValidated || "",
    chainStatus: saved.chainStatus || "",
    refacturaCount: saved.refacturaCount || 0,
    refacturaRelation: saved.refacturaRelation || "",
    technicalObservations:
      saved.technicalObservations || "",
    conclusion: saved.conclusion || "",
    researcherConfidence:
      saved.researcherConfidence || "",
  });

  const setDocumentField = (field, value) =>
    setDocumentForm((current) => ({
      ...current,
      [field]: value,
    }));

  const setTransferField = (field, value) =>
    setTransferForm((current) => ({
      ...current,
      [field]: value,
    }));

  const setAnalysisField = (field, value) =>
    setAnalysis((current) => ({
      ...current,
      [field]: value,
    }));

  async function saveDocument(event) {
    event.preventDefault();

    try {
      await createFiscalDocument({
        investigationId: workspace.investigation.id,
        token,
        data: documentForm,
      });

      await onReload();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          "No se pudo guardar el documento fiscal."
      );
    }
  }

  async function saveTransfer(event) {
    event.preventDefault();

    try {
      await createOwnershipTransfer({
        investigationId: workspace.investigation.id,
        token,
        data: transferForm,
      });

      await onReload();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          "No se pudo guardar la transmisión."
      );
    }
  }

  async function saveAnalysis(event) {
    event.preventDefault();

    try {
      await saveInvoiceAnalysis({
        investigationId: workspace.investigation.id,
        token,
        data: analysis,
      });

      await onReload();
      alert("Análisis guardado.");
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          "No se pudo guardar el análisis."
      );
    }
  }

  return (
    <div className="space-y-8">
      <ClientDocumentsPanel
        documents={workspace.check.documents}
      />

      <section className="rounded-xl border border-dashed border-slate-300 p-5">
        <h3 className="font-bold text-slate-900">
          Archivos
        </h3>

        <label className="mt-4 inline-block cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">
          Cargar factura, reverso o SAT

          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onArtifactUpload("SAT_FACTURA", file);
              }

              event.target.value = "";
            }}
          />
        </label>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">
          Documento fiscal
        </h3>

        <FiscalDocumentForm
          form={documentForm}
          onChange={setDocumentField}
          onSubmit={saveDocument}
        />

        <div className="mt-4 space-y-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <p className="font-semibold">
                {document.sequence}.{" "}
                {document.label || document.type}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {document.issuerName || "—"} →{" "}
                {document.receiverName || "—"} · SAT:{" "}
                {document.satStatus || "Sin validar"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">
          Endoso o transmisión
        </h3>

        <OwnershipTransferForm
          form={transferForm}
          onChange={setTransferField}
          onSubmit={saveTransfer}
        />

        <div className="mt-4 space-y-2">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <p className="font-semibold">
                {transfer.sequence}.{" "}
                {transfer.fromName || "—"} →{" "}
                {transfer.toName || "—"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">
          Análisis del investigador
        </h3>

        <InvestigatorAnalysisForm
          analysis={analysis}
          onChange={setAnalysisField}
          onSubmit={saveAnalysis}
        />
      </section>

      <InvoicePreview
        documents={documents}
        transfers={transfers}
        analysis={analysis}
      />
    </div>
  );
}

export default InvoiceTask;

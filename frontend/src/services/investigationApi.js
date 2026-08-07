import api from "./api";

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function getInvestigationWorkspace(
  investigationId,
  token
) {
  const response = await api.get(
    `/investigations/${investigationId}/workspace`,
    authHeaders(token)
  );

  return response.data;
}

export async function uploadInvestigationArtifact({
  investigationId,
  token,
  type,
  file,
  source = "EXECUTIVE",
}) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("type", type);
  formData.append("source", source);

  const response = await api.post(
    `/investigations/${investigationId}/artifacts`,
    formData,
    authHeaders(token)
  );

  return response.data;
}

export async function saveVehicleBase({
  investigationId,
  token,
  data,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/vehicle-base`,
    data,
    authHeaders(token)
  );

  return response.data;
}

export async function createFiscalDocument({
  investigationId,
  token,
  data,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/fiscal-documents`,
    data,
    authHeaders(token)
  );

  return response.data;
}

export async function createOwnershipTransfer({
  investigationId,
  token,
  data,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/ownership-transfers`,
    data,
    authHeaders(token)
  );

  return response.data;
}

export async function saveInvoiceAnalysis({
  investigationId,
  token,
  data,
}) {
  const response = await api.put(
    `/investigations/${investigationId}/invoice-analysis`,
    data,
    authHeaders(token)
  );

  return response.data;
}

export async function processInvestigation({
  investigationId,
  token,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/process`,
    {},
    authHeaders(token)
  );

  return response.data;
}

export async function runRepuvePipeline({
  investigationId,
  token,
  artifactId,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/repuve-run`,
    artifactId ? { artifactId } : {},
    authHeaders(token)
  );

  return response.data;
}

export async function extractRapiArtifact({
  investigationId,
  token,
  artifactId,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/rapi-extract`,
    {
      artifactId,
    },
    authHeaders(token)
  );

  return response.data;
}

export async function normalizeRapi({
  investigationId,
  token,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/rapi-normalize`,
    {},
    authHeaders(token)
  );

  return response.data;
}

export async function investigateRapi({
  investigationId,
  token,
  normalizedEvidenceId,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/rapi-investigate`,
    normalizedEvidenceId
      ? {
          normalizedEvidenceId,
        }
      : {},
    authHeaders(token)
  );

  return response.data;
}

export async function dictateRapi({
  investigationId,
  token,
  analysisEvidenceId,
}) {
  const response = await api.post(
    `/investigations/${investigationId}/rapi-dictate`,
    analysisEvidenceId
      ? {
          analysisEvidenceId,
        }
      : {},
    authHeaders(token)
  );

  return response.data;
}
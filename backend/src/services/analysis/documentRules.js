function evaluateDocuments(check) {
  const documents = check.documents || [];
  const docTypes = documents.map((doc) => doc.type);

  const hasTarjeta = docTypes.includes("tarjetaCirculacion");
  const hasFacturaFrente = docTypes.includes("facturaFrente");
  const hasFacturaReverso = docTypes.includes("facturaReverso");
  const hasVin = Boolean(check.vin);

  const alerts = [];

  if (!hasTarjeta) alerts.push("No se cargó tarjeta de circulación.");
  if (!hasFacturaFrente) alerts.push("No se cargó factura frente.");
  if (!hasFacturaReverso) alerts.push("No se cargó factura reverso.");
  if (!hasVin) alerts.push("No se capturó VIN / NIV.");

  const score = [hasTarjeta, hasFacturaFrente, hasFacturaReverso, hasVin].filter(
    Boolean
  ).length;

  return {
    hasTarjeta,
    hasFacturaFrente,
    hasFacturaReverso,
    hasVin,
    documentScore: score,
    documentAlerts: alerts,
  };
}

module.exports = evaluateDocuments;
const COMPARABLE_FIELDS = [
  { key: "vin", customerKey: "vin", label: "VIN", severity: "HIGH" },
  { key: "plate", customerKey: "placas", label: "placas", severity: "MEDIUM" },
  { key: "brand", customerKey: "marca", label: "marca", severity: "MEDIUM" },
  { key: "model", customerKey: "modelo", label: "modelo", severity: "MEDIUM" },
  { key: "year", customerKey: "anio", label: "año", severity: "MEDIUM" },
  { key: "version", customerKey: "version", label: "versión", severity: "LOW" },
];

function normalizeComparable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function buildCustomerSnapshot(check) {
  return {
    vin: check.vin || "",
    placas: check.placas || "",
    marca: check.marca || "",
    modelo: check.modelo || "",
    anio: check.anio || "",
    version: check.version || "",
  };
}

function compareVehicleIdentity(customerData, validatedData) {
  return COMPARABLE_FIELDS.map((field) => {
    const customerValue = customerData[field.customerKey] || "";
    const validatedValue = validatedData[field.key] || "";

    const customerNormalized = normalizeComparable(customerValue);
    const validatedNormalized = normalizeComparable(validatedValue);

    let status = "MATCH";

    if (!customerNormalized && validatedNormalized) {
      status = "ADDED";
    } else if (customerNormalized && !validatedNormalized) {
      status = "MISSING";
    } else if (customerNormalized !== validatedNormalized) {
      status = "MISMATCH";
    }

    return {
      field: field.key,
      label: field.label,
      customerValue,
      validatedValue,
      status,
      severity: field.severity,
    };
  });
}

function buildVehicleIdentityFindings(comparisons) {
  return comparisons
    .filter((comparison) =>
      ["MISMATCH", "MISSING"].includes(comparison.status)
    )
    .map((comparison) => ({
      type: `VEHICLE_IDENTITY_${comparison.field.toUpperCase()}_MISMATCH`,
      severity: comparison.severity,
      title: `Inconsistencia en ${comparison.label}`,
      description:
        comparison.status === "MISSING"
          ? `El dato de ${comparison.label} proporcionado por el cliente no fue confirmado en la tarjeta de circulación.`
          : `El dato de ${comparison.label} proporcionado por el cliente no coincide con la tarjeta de circulación.`,
      data: {
        source: "VEHICLE_IDENTITY",
        field: comparison.field,
        customerValue: comparison.customerValue,
        validatedValue: comparison.validatedValue,
        status: comparison.status,
      },
    }));
}

function buildVehicleIdentityPreview({
  customerData,
  validatedData,
  comparisons,
  findings,
}) {
  const confirmedFields = comparisons.filter(
    (comparison) =>
      comparison.status === "MATCH" ||
      comparison.status === "ADDED"
  ).length;

  const coverage = Math.round(
    (confirmedFields / comparisons.length) * 100
  );

  const hasHighRisk = findings.some(
    (finding) => finding.severity === "HIGH"
  );

  const status = findings.length > 0
    ? "NEEDS_REVIEW"
    : "COMPLETED";

  return {
    source: "VEHICLE_IDENTITY",
    status,
    title: "Identidad vehicular",
    summary:
      findings.length === 0
        ? "Los datos principales del vehículo fueron confirmados contra la tarjeta de circulación."
        : `Se detectaron ${findings.length} diferencia(s) entre la información proporcionada y la tarjeta de circulación.`,
    coverage,
    findings,
    data: {
      customerData,
      validatedData,
      comparisons,
      identityConfidence: hasHighRisk
        ? "LOW"
        : findings.length > 0
          ? "MEDIUM"
          : "HIGH",
    },
  };
}

module.exports = {
  buildCustomerSnapshot,
  compareVehicleIdentity,
  buildVehicleIdentityFindings,
  buildVehicleIdentityPreview,
};

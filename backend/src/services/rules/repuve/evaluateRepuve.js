function normalizeComparable(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function createFinding({
  type,
  severity,
  status = "OPEN",
  title,
  description,
  data = null,
}) {
  return {
    type,
    severity,
    status,
    title,
    description,
    data,
  };
}

function compareField({
  field,
  label,
  baseValue,
  sourceValue,
  severity,
}) {
  const normalizedBase =
    normalizeComparable(baseValue);

  const normalizedSource =
    normalizeComparable(sourceValue);

  if (!normalizedBase || !normalizedSource) {
    return createFinding({
      type: `REPUVE_${field}_UNVERIFIABLE`,
      severity: "MEDIUM",
      title: `${label} no verificable`,
      description:
        `No fue posible comparar ${label.toLowerCase()} entre la identidad validada y REPUVE.`,
      data: {
        baseValue: baseValue || null,
        sourceValue: sourceValue || null,
        scoreImpact: -8,
      },
    });
  }

  if (normalizedBase !== normalizedSource) {
    return createFinding({
      type: `REPUVE_${field}_MISMATCH`,
      severity,
      title: `${label} no coincide`,
      description:
        `El valor confirmado en el expediente (${baseValue}) no coincide con REPUVE (${sourceValue}).`,
      data: {
        baseValue,
        sourceValue,
        scoreImpact:
          severity === "CRITICAL"
            ? -45
            : severity === "HIGH"
              ? -25
              : -12,
      },
    });
  }

  return createFinding({
    type: `REPUVE_${field}_MATCH`,
    severity: "INFO",
    status: "RESOLVED",
    title: `${label} coincide`,
    description:
      `El valor de ${label.toLowerCase()} coincide con la consulta REPUVE.`,
    data: {
      baseValue,
      sourceValue,
      scoreImpact: 0,
    },
  });
}

function evaluateLegalStatus({
  key,
  label,
  result,
}) {
  const status = result?.status || "UNKNOWN";

  if (status === "ALERT") {
    return createFinding({
      type: `REPUVE_${key}_ALERT`,
      severity: "CRITICAL",
      title: `Alerta en ${label}`,
      description:
        result?.rawText ||
        `${label} reportó una alerta para el vehículo consultado.`,
      data: {
        sourceStatus: status,
        scoreImpact: -100,
      },
    });
  }

  if (status === "UNKNOWN") {
    return createFinding({
      type: `REPUVE_${key}_UNKNOWN`,
      severity: "MEDIUM",
      title: `${label} no verificable`,
      description:
        `No fue posible determinar el resultado de ${label}.`,
      data: {
        sourceStatus: status,
        scoreImpact: -10,
      },
    });
  }

  return createFinding({
    type: `REPUVE_${key}_CLEAR`,
    severity: "INFO",
    status: "RESOLVED",
    title: `${label} sin alerta encontrada`,
    description:
      result?.rawText ||
      `La consulta presentada no muestra una alerta en ${label}.`,
    data: {
      sourceStatus: status,
      scoreImpact: 0,
    },
  });
}

function evaluateRepuve({
  vehicleBase,
  repuve,
}) {
  const findings = [];

  findings.push(
    compareField({
      field: "VIN",
      label: "VIN / NIV",
      baseValue: vehicleBase?.vin,
      sourceValue: repuve?.vehicle?.vin,
      severity: "CRITICAL",
    })
  );

  findings.push(
    compareField({
      field: "PLATE",
      label: "Placas",
      baseValue: vehicleBase?.plate,
      sourceValue: repuve?.vehicle?.plate,
      severity: "HIGH",
    })
  );

  findings.push(
    compareField({
      field: "BRAND",
      label: "Marca",
      baseValue: vehicleBase?.brand,
      sourceValue: repuve?.vehicle?.brand,
      severity: "MEDIUM",
    })
  );

  findings.push(
    compareField({
      field: "MODEL",
      label: "Modelo",
      baseValue: vehicleBase?.model,
      sourceValue: repuve?.vehicle?.model,
      severity: "MEDIUM",
    })
  );

  findings.push(
    compareField({
      field: "YEAR",
      label: "Año",
      baseValue: vehicleBase?.year,
      sourceValue: repuve?.vehicle?.year,
      severity: "MEDIUM",
    })
  );

  findings.push(
    evaluateLegalStatus({
      key: "FGJ",
      label: "Fiscalías",
      result:
        repuve?.legalStatus
          ?.prosecutorOffice,
    })
  );

  findings.push(
    evaluateLegalStatus({
      key: "OCRA",
      label: "OCRA",
      result: repuve?.legalStatus?.ocra,
    })
  );

  findings.push(
    evaluateLegalStatus({
      key: "CARFAX",
      label: "CARFAX Robo USA/CAN",
      result:
        repuve?.legalStatus
          ?.carfaxNorthAmerica,
    })
  );

  findings.push(
    evaluateLegalStatus({
      key: "MINISTERIAL",
      label:
        "Avisos ministeriales o judiciales",
      result:
        repuve?.legalStatus
          ?.ministerialJudicialNotices,
    })
  );

  if (!repuve?.query?.queriedAt) {
    findings.push(
      createFinding({
        type: "REPUVE_QUERY_DATE_MISSING",
        severity: "MEDIUM",
        title:
          "Fecha de consulta no disponible",
        description:
          "No se registró la fecha de consulta del resultado REPUVE.",
        data: {
          scoreImpact: -8,
        },
      })
    );
  }

  return findings;
}

module.exports = {
  evaluateRepuve,
};
const { prisma } = require("../../../lib/prisma");

const REPUVE_NORMALIZED_SCHEMA_VERSION = "1.0";

const VALID_STATUSES = new Set([
  "CLEAR",
  "ALERT",
  "UNKNOWN",
]);

function createHttpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function cleanText(value) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function normalizeComparable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function normalizeVin(value) {
  const vin = normalizeComparable(value);

  if (!vin) return null;

  /*
   * No se corrige ni completa el VIN.
   * Solo se eliminan separadores y se homologa a mayúsculas.
   */
  return vin;
}

function normalizePlate(value) {
  const plate = normalizeComparable(value);
  return plate || null;
}

function normalizeUpperText(value) {
  const text = cleanText(value);
  return text ? text.toUpperCase() : null;
}

function normalizeYear(value) {
  const text = cleanText(value);
  if (!text) return null;

  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : text;
}

function normalizeStatus(value) {
  const status = normalizeComparable(value);

  return VALID_STATUSES.has(status)
    ? status
    : "UNKNOWN";
}

function normalizeIsoDate(value) {
  const text = cleanText(value);
  if (!text) return null;

  const directIso = text.match(
    /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?\b/
  );

  if (directIso) {
    const [, year, month, day] = directIso;

    return [
      year,
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  const latinDate = text.match(
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})(?:[T\s].*)?\b/
  );

  if (latinDate) {
    let [, day, month, year] = latinDate;

    if (year.length === 2) {
      year = Number(year) >= 70
        ? `19${year}`
        : `20${year}`;
    }

    return [
      year,
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  /*
   * Si no existe un formato inequívoco, se conserva el texto.
   * El normalizador no debe inventar una fecha.
   */
  return text;
}

function normalizeConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Number(
    Math.max(0, Math.min(1, number)).toFixed(4)
  );
}

function normalizeStatusBlock(block = {}) {
  return {
    status: normalizeStatus(block?.status),
    rawText: cleanText(block?.rawText),
  };
}

function resolveOfficialResult(officialResult = {}) {
  const status = normalizeStatus(
    officialResult?.status
  );

  const comparableText = normalizeComparable(
    officialResult?.rawText
  );

  if (status === "ALERT") {
    if (
      comparableText.includes("RECUPERADO") ||
      comparableText.includes("RECOVERED")
    ) {
      return "RECOVERED";
    }

    return "THEFT_REPORT";
  }

  if (status === "CLEAR") {
    return "NO_THEFT_REPORT";
  }

  if (
    comparableText.includes("NOENCONTRADO") ||
    comparableText.includes("SINREGISTRO") ||
    comparableText.includes("NOTFOUND")
  ) {
    return "NOT_FOUND";
  }

  if (
    comparableText.includes("SINREPORTEDEROBO") ||
    comparableText.includes("NOREPORT") ||
    comparableText.includes("NOTHEFTREPORT")
  ) {
    return "NO_THEFT_REPORT";
  }

  if (
    comparableText.includes("RECUPERADO") ||
    comparableText.includes("RECOVERED")
  ) {
    return "RECOVERED";
  }

  if (
    comparableText.includes("REPORTEDEROBO") ||
    comparableText.includes("THEFTREPORT")
  ) {
    return "THEFT_REPORT";
  }

  return "OTHER";
}

function buildValidation({
  vehicle,
  document,
  query,
  legalStatus,
}) {
  const issues = [];

  if (!document.recognizedAsRepuve) {
    issues.push({
      code: "DOCUMENT_NOT_RECOGNIZED",
      field: "document.recognizedAsRepuve",
      severity: "HIGH",
      message:
        "El artifact no fue reconocido claramente como evidencia REPUVE.",
    });
  }

  if (!vehicle.vin) {
    issues.push({
      code: "VIN_MISSING",
      field: "vehicle.vin",
      severity: "HIGH",
      message:
        "No se extrajo un VIN del artifact.",
    });
  } else if (vehicle.vin.length !== 17) {
    issues.push({
      code: "VIN_LENGTH_INVALID",
      field: "vehicle.vin",
      severity: "HIGH",
      message:
        `El VIN normalizado contiene ${vehicle.vin.length} caracteres; se esperaban 17.`,
    });
  }

  if (!vehicle.plate) {
    issues.push({
      code: "PLATE_MISSING",
      field: "vehicle.plate",
      severity: "MEDIUM",
      message:
        "No se extrajeron placas del artifact.",
    });
  }

  if (!query.queriedAt) {
    issues.push({
      code: "QUERY_DATE_MISSING",
      field: "query.queriedAt",
      severity: "MEDIUM",
      message:
        "No se extrajo la fecha de consulta.",
    });
  }

  if (
    legalStatus.officialResult.status ===
    "UNKNOWN"
  ) {
    issues.push({
      code: "OFFICIAL_RESULT_UNKNOWN",
      field: "legalStatus.officialResult",
      severity: "HIGH",
      message:
        "El resultado oficial no pudo clasificarse.",
    });
  }

  return {
    valid:
      !issues.some(
        (issue) => issue.severity === "HIGH"
      ),
    issueCount: issues.length,
    issues,
  };
}

function buildNormalizedRepuveData(rawData = {}) {
  const vehicle = {
    vin: normalizeVin(rawData.vehicle?.vin),
    plate: normalizePlate(rawData.vehicle?.plate),
    brand: normalizeUpperText(
      rawData.vehicle?.brand
    ),
    model: normalizeUpperText(
      rawData.vehicle?.model
    ),
    year: normalizeYear(rawData.vehicle?.year),
    version: normalizeUpperText(
      rawData.vehicle?.version
    ),
    vehicleClass: normalizeUpperText(
      rawData.vehicle?.vehicleClass
    ),
    vehicleType: normalizeUpperText(
      rawData.vehicle?.vehicleType
    ),
    registrationCertificateNumber:
      normalizeUpperText(
        rawData.vehicle
          ?.registrationCertificateNumber
      ),
  };

  const document = {
    recognizedAsRepuve: Boolean(
      rawData.document?.recognizedAsRepuve
    ),
    documentTitle: cleanText(
      rawData.document?.documentTitle
    ),
    sourceLabel: cleanText(
      rawData.document?.sourceLabel
    ),
  };

  const registration = {
    registeringInstitution: cleanText(
      rawData.registration
        ?.registeringInstitution
    ),
    registeringState: normalizeUpperText(
      rawData.registration?.registeringState
    ),
    registeredAt: normalizeIsoDate(
      rawData.registration?.registeredAt
    ),
    platedAt: normalizeIsoDate(
      rawData.registration?.platedAt
    ),
    lastUpdatedAt: normalizeIsoDate(
      rawData.registration?.lastUpdatedAt
    ),
    registrationFolio: normalizeUpperText(
      rawData.registration?.registrationFolio
    ),
    observations: cleanText(
      rawData.registration?.observations
    ),
  };

  const query = {
    queriedAt: normalizeIsoDate(
      rawData.query?.queriedAt
    ),
    queryFolio: normalizeUpperText(
      rawData.query?.queryFolio
    ),
  };

  const legalStatus = {
    prosecutorOffice: normalizeStatusBlock(
      rawData.legalStatus?.prosecutorOffice
    ),
    ocra: normalizeStatusBlock(
      rawData.legalStatus?.ocra
    ),
    carfaxNorthAmerica: normalizeStatusBlock(
      rawData.legalStatus
        ?.carfaxNorthAmerica
    ),
    ministerialJudicialNotices:
      normalizeStatusBlock(
        rawData.legalStatus
          ?.ministerialJudicialNotices
      ),
    officialResult: normalizeStatusBlock(
      rawData.legalStatus?.officialResult
    ),
  };

  const confidence = {
    vin: normalizeConfidence(
      rawData.fieldConfidence?.vin
    ),
    plate: normalizeConfidence(
      rawData.fieldConfidence?.plate
    ),
    brand: normalizeConfidence(
      rawData.fieldConfidence?.brand
    ),
    model: normalizeConfidence(
      rawData.fieldConfidence?.model
    ),
    year: normalizeConfidence(
      rawData.fieldConfidence?.year
    ),
    officialResult: normalizeConfidence(
      rawData.fieldConfidence
        ?.officialResult
    ),
    queriedAt: normalizeConfidence(
      rawData.fieldConfidence?.queriedAt
    ),
  };

  const validation = buildValidation({
    vehicle,
    document,
    query,
    legalStatus,
  });

  return {
    source: "REPUVE",
    stage: "NORMALIZED",
    schemaVersion:
      REPUVE_NORMALIZED_SCHEMA_VERSION,

    sourceRawEvidenceId: rawData.id || null,
    sourceRawSchemaVersion:
      rawData.schemaVersion || null,

    artifact: rawData.artifact || null,
    document,
    vehicle,
    registration,
    query,
    legalStatus,

    analysisInput: {
      result: resolveOfficialResult(
        legalStatus.officialResult
      ),
      queryDate: query.queriedAt,
      queriedVin: vehicle.vin,
      queriedPlate: vehicle.plate,
      officialFolio:
        query.queryFolio ||
        registration.registrationFolio,
      observations:
        registration.observations,
      evidenceReviewed:
        document.recognizedAsRepuve,
    },

    confidence,
    validation,

    rawText: cleanText(rawData.rawText) || "",
    warnings: Array.isArray(rawData.warnings)
      ? rawData.warnings
          .map(cleanText)
          .filter(Boolean)
      : [],

    normalization: {
      normalizer: "repuve-normalizer-v1",
      normalizedAt: new Date().toISOString(),
    },
  };
}

function calculateNormalizedConfidence(
  normalizedData
) {
  const values = Object.values(
    normalizedData?.confidence || {}
  ).filter(
    (value) =>
      typeof value === "number" &&
      Number.isFinite(value)
  );

  if (values.length === 0) return 0;

  const average =
    values.reduce((sum, value) => sum + value, 0) /
    values.length;

  const validationPenalty =
    normalizedData.validation.valid ? 0 : 0.15;

  return Number(
    Math.max(
      0,
      Math.min(1, average - validationPenalty)
    ).toFixed(4)
  );
}

async function normalizeRepuveArtifact({
  investigationId,
  artifactId,
  rawEvidenceId,
  userId,
}) {
  const artifact = await prisma.artifact.findUnique({
    where: {
      id: artifactId,
    },
    include: {
      investigation: true,
    },
  });

  if (!artifact) {
    throw createHttpError(
      "Artifact no encontrado",
      404,
      "ARTIFACT_NOT_FOUND"
    );
  }

  if (
    artifact.investigationId !== investigationId
  ) {
    throw createHttpError(
      "El artifact no pertenece a esta investigación",
      409,
      "ARTIFACT_INVESTIGATION_MISMATCH"
    );
  }

  if (artifact.type !== "REPUVE") {
    throw createHttpError(
      `El artifact es de tipo ${artifact.type}, no REPUVE`,
      409,
      "ARTIFACT_TYPE_MISMATCH"
    );
  }

  const rawEvidence =
    rawEvidenceId
      ? await prisma.evidence.findUnique({
          where: {
            id: rawEvidenceId,
          },
        })
      : await prisma.evidence.findFirst({
          where: {
            investigationId,
            artifactId,
            type: "REPUVE_RAW",
            extractionStatus: "COMPLETED",
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

  if (!rawEvidence) {
    throw createHttpError(
      "No existe una evidencia REPUVE_RAW completada para normalizar",
      409,
      "REPUVE_RAW_EVIDENCE_MISSING"
    );
  }

  if (
    rawEvidence.investigationId !==
      investigationId ||
    rawEvidence.artifactId !== artifactId ||
    rawEvidence.type !== "REPUVE_RAW"
  ) {
    throw createHttpError(
      "La evidencia RAW no corresponde al artifact REPUVE solicitado",
      409,
      "REPUVE_RAW_EVIDENCE_MISMATCH"
    );
  }

  const normalizedData =
    buildNormalizedRepuveData({
      ...(rawEvidence.data || {}),
      id: rawEvidence.id,
    });

  const confidence =
    calculateNormalizedConfidence(
      normalizedData
    );

  const existingEvidence =
    await prisma.evidence.findFirst({
      where: {
        investigationId,
        artifactId,
        type: "REPUVE_NORMALIZED",
      },
    });

  const evidence = existingEvidence
    ? await prisma.evidence.update({
        where: {
          id: existingEvidence.id,
        },
        data: {
          source: "CARVANTA_NORMALIZER",
          data: normalizedData,
          extractionStatus: "COMPLETED",
          confidence,
          extractor: "repuve-normalizer-v1",
          extractedAt: new Date(),
          createdById: userId,
        },
      })
    : await prisma.evidence.create({
        data: {
          checkId:
            artifact.investigation.checkId,
          investigationId,
          artifactId,
          source: "CARVANTA_NORMALIZER",
          type: "REPUVE_NORMALIZED",
          data: normalizedData,
          extractionStatus: "COMPLETED",
          confidence,
          extractor: "repuve-normalizer-v1",
          extractedAt: new Date(),
          createdById: userId,
        },
      });

  await prisma.artifact.update({
    where: {
      id: artifact.id,
    },
    data: {
      /*
       * Continúa PROCESSING porque todavía faltan
       * Cerebro 3 y Cerebro 4.
       */
      processingStatus: "PROCESSING",
      processingError: null,
    },
  });

  return {
    artifactId,
    rawEvidenceId: rawEvidence.id,
    evidence,
    normalized: normalizedData,
  };
}

module.exports = {
  REPUVE_NORMALIZED_SCHEMA_VERSION,
  cleanText,
  normalizeComparable,
  normalizeVin,
  normalizePlate,
  normalizeYear,
  normalizeStatus,
  normalizeIsoDate,
  normalizeConfidence,
  resolveOfficialResult,
  buildNormalizedRepuveData,
  calculateNormalizedConfidence,
  normalizeRepuveArtifact,
};

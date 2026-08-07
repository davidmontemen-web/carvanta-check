const {
  prisma,
} = require("../../../lib/prisma");

const TRANSUNION_NORMALIZED_SCHEMA_VERSION = "1.0";

function createHttpError(
  message,
  statusCode,
  code
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function cleanText(value) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !text ||
    [
      "-",
      "N/A",
      "NO DISPONIBLE",
      "SIN INFORMACION",
      "SIN INFORMACIÓN",
    ].includes(text.toUpperCase())
  ) {
    return null;
  }

  return text;
}

function normalizeIdentifier(value) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  return normalized || null;
}

function normalizeVin(value) {
  const normalized = normalizeIdentifier(value);

  return normalized?.length === 17
    ? normalized
    : null;
}

function normalizePlate(value) {
  const normalized = normalizeIdentifier(value);

  if (
    !normalized ||
    normalized === "0" ||
    normalized.length < 5
  ) {
    return null;
  }

  return normalized;
}

function normalizeUpper(value) {
  const text = cleanText(value);

  return text
    ? text.toUpperCase()
    : null;
}

function normalizeBooleanText(value) {
  const normalized =
    normalizeUpper(value);

  if (
    [
      "SI",
      "SÍ",
      "YES",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "NO",
      "NOT",
    ].includes(normalized)
  ) {
    return false;
  }

  return null;
}

function parseNumber(value) {
  const text = String(value ?? "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!text) {
    return null;
  }

  const numeric = Number(text);

  return Number.isFinite(numeric)
    ? numeric
    : null;
}

function normalizeCurrency(value) {
  return parseNumber(value);
}

function normalizeConfidence(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Number(
    Math.max(
      0,
      Math.min(1, numeric)
    ).toFixed(4)
  );
}

function uniqueBy(items, keyBuilder) {
  const result = [];
  const seen = new Set();

  for (const item of items) {
    const key = keyBuilder(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function normalizeVehicleIdentity(raw) {
  const vehicle =
    raw.vehicleIdentity || {};

  return {
    vin:
      normalizeVin(
        raw.reportMetadata?.vin
      ),

    manufacturer:
      cleanText(
        vehicle.manufacturer
      ),

    brand:
      normalizeUpper(
        vehicle.brand
      ),

    model:
      cleanText(
        vehicle.submodel
      ),

    vehicleClass:
      cleanText(
        vehicle.vehicleClass
      ),

    modelYear:
      cleanText(
        vehicle.modelYear
      ),

    version:
      cleanText(
        vehicle.version
      ),

    countryOfOrigin:
      cleanText(
        vehicle.countryOfOrigin
      ),

    color:
      cleanText(
        vehicle.color
      ),

    engineNumber:
      cleanText(
        vehicle.engineNumber
      ),

    nci:
      cleanText(
        vehicle.nci
      ),
  };
}

function collectPlates(raw) {
  const candidates = [];

  for (const item of
    raw.institutionReports || []) {
    candidates.push({
      plate:
        normalizePlate(item.plate),

      source:
        cleanText(
          item.institution
        ),

      date:
        cleanText(
          item.registrationDate
        ),

      origin:
        "INSTITUTION_REPORT",
    });
  }

  for (const item of
    raw.dealerInformation || []) {
    candidates.push({
      plate:
        normalizePlate(item.plate),

      source:
        cleanText(
          item.institution
        ),

      date:
        cleanText(
          item.reportDate
        ),

      origin:
        "DEALER_INFORMATION",
    });
  }

  for (const item of
    raw.plateHistory || []) {
    candidates.push({
      plate:
        normalizePlate(item.plate),

      source:
        cleanText(
          item.institution
        ),

      date:
        cleanText(
          item.movementDate
        ),

      origin:
        "PLATE_HISTORY",
    });
  }

  return uniqueBy(
    candidates.filter(
      (item) => item.plate
    ),
    (item) =>
      [
        item.plate,
        item.source,
        item.date,
        item.origin,
      ].join("|")
  );
}

function buildDistinctPlates(plateRecords) {
  return Array.from(
    new Set(
      plateRecords.map(
        (item) => item.plate
      )
    )
  );
}

function normalizePolicies(raw) {
  return (
    raw.insurancePolicies || []
  ).map((policy) => ({
    company:
      cleanText(policy.company),

    policyNumber:
      cleanText(
        policy.policyNumber
      ),

    section:
      cleanText(policy.section),

    place:
      cleanText(policy.place),

    startDate:
      cleanText(policy.startDate),

    endDate:
      cleanText(policy.endDate),

    use:
      cleanText(policy.use),

    product:
      cleanText(policy.product),

    coverages:
      cleanText(
        policy.coverages
      ),

    status:
      normalizeUpper(
        policy.status
      ),

    lastStatusDate:
      cleanText(
        policy.lastStatusDate
      ),

    statusChangeReason:
      cleanText(
        policy.statusChangeReason
      ),
  }));
}

function normalizeClaims(raw) {
  return (
    raw.claims || []
  ).map((claim) => ({
    company:
      cleanText(claim.company),

    claimNumber:
      cleanText(
        claim.claimNumber
      ),

    description:
      cleanText(
        claim.description
      ),

    place:
      cleanText(claim.place),

    occurredDate:
      cleanText(
        claim.occurredDate
      ),

    reportedDate:
      cleanText(
        claim.reportedDate
      ),

    status:
      cleanText(claim.status),

    updatedAt:
      cleanText(claim.updatedAt),

    claimant:
      cleanText(claim.claimant),

    responsibleParty:
      cleanText(
        claim.responsibleParty
      ),

    compensationType:
      cleanText(
        claim.compensationType
      ),

    reserveAmount:
      normalizeCurrency(
        claim.reserveAmount
      ),

    indemnificationAmount:
      normalizeCurrency(
        claim.indemnificationAmount
      ),

    sipac:
      cleanText(claim.sipac),

    deductible:
      cleanText(claim.deductible),
  }));
}

function normalizeTheftChecks(raw) {
  return (
    raw.theftAndRecovery || []
  ).map((item) => ({
    queryType:
      normalizeUpper(
        item.queryType
      ),

    queriedValue:
      normalizeIdentifier(
        item.queriedValue
      ),

    institution:
      cleanText(
        item.institution
      ),

    status:
      normalizeUpper(item.status),

    updatedAt:
      cleanText(item.updatedAt),

    theftPlace:
      cleanText(item.theftPlace),

    theftDate:
      cleanText(item.theftDate),

    investigationDate:
      cleanText(
        item.investigationDate
      ),

    recoveryPlace:
      cleanText(
        item.recoveryPlace
      ),

    recoveryDate:
      cleanText(
        item.recoveryDate
      ),
  }));
}

function normalizeFinancings(raw) {
  return (
    raw.financings || []
  ).map((item) => ({
    company:
      cleanText(item.company),

    contractNumber:
      cleanText(
        item.contractNumber
      ),

    financingType:
      cleanText(
        item.financingType
      ),

    state:
      cleanText(item.state),

    personType:
      cleanText(
        item.personType
      ),

    startDate:
      cleanText(
        item.startDate
      ),

    endDate:
      cleanText(item.endDate),

    term:
      cleanText(item.term),

    vehicleCondition:
      cleanText(
        item.vehicleCondition
      ),

    status:
      normalizeUpper(item.status),

    use:
      cleanText(item.use),

    cancellationDate:
      cleanText(
        item.cancellationDate
      ),

    observations:
      cleanText(
        item.observations
      ),

    portfolioStatus:
      cleanText(
        item.portfolioStatus
      ),
  }));
}

function normalizeDealerInformation(raw) {
  return (
    raw.dealerInformation || []
  ).map((item) => ({
    institution:
      cleanText(
        item.institution
      ),

    lastLocation:
      cleanText(
        item.lastLocation
      ),

    reportDate:
      cleanText(
        item.reportDate
      ),

    physicalCondition:
      cleanText(
        item.physicalCondition
      ),

    singleOwner:
      normalizeBooleanText(
        item.singleOwner
      ),

    use:
      cleanText(item.use),

    mileage:
      parseNumber(item.mileage),

    plate:
      normalizePlate(item.plate),

    color:
      cleanText(item.color),

    issuingState:
      cleanText(
        item.issuingState
      ),

    serviceCount:
      parseNumber(
        item.serviceCount
      ),

    lastServiceDate:
      cleanText(
        item.lastServiceDate
      ),

    extendedWarranty:
      normalizeBooleanText(
        item.extendedWarranty
      ),

    extendedWarrantyDate:
      cleanText(
        item.extendedWarrantyDate
      ),
  }));
}

function buildValidation({
  normalized,
  check,
}) {
  const issues = [];

  const investigationVin =
    normalizeVin(check?.vin);

  if (
    investigationVin &&
    normalized.vehicle.vin &&
    investigationVin !==
      normalized.vehicle.vin
  ) {
    issues.push({
      code:
        "TRANSUNION_VIN_MISMATCH",

      severity: "HIGH",

      message:
        "El VIN del reporte TransUnion no coincide con el VIN del expediente.",

      data: {
        investigationVin,
        reportVin:
          normalized.vehicle.vin,
      },
    });
  }

  if (!normalized.vehicle.vin) {
    issues.push({
      code:
        "TRANSUNION_VIN_MISSING",

      severity: "HIGH",

      message:
        "No fue posible identificar un VIN válido en el reporte TransUnion.",
    });
  }

  if (
    !normalized.document
      .recognizedAsTransUnion
  ) {
    issues.push({
      code:
        "TRANSUNION_DOCUMENT_NOT_RECOGNIZED",

      severity: "HIGH",

      message:
        "El archivo no fue reconocido claramente como un reporte TransUnion.",
    });
  }

  return {
    valid:
      !issues.some(
        (issue) =>
          [
            "HIGH",
            "CRITICAL",
          ].includes(
            issue.severity
          )
      ),

    issues,
  };
}

function buildCoverage(normalized) {
  const sections = {
    identity:
      Boolean(
        normalized.vehicle.vin
      ),

    prices:
      Object.values(
        normalized.prices
      ).some(
        (value) =>
          value !== null
      ),

    dealerInformation:
      normalized.dealerInformation
        .length > 0,

    financings:
      normalized.financings
        .length > 0,

    insurance:
      normalized.insurance
        .allPolicies.length > 0,

    claims:
      normalized.claims.length > 0,

    theft:
      normalized.theftChecks
        .length > 0,

    plates:
      normalized.plates
        .distinct.length > 0,
  };

  const values =
    Object.values(sections);

  const completed =
    values.filter(Boolean).length;

  return {
    sections,
    completedSections:
      completed,

    totalSections:
      values.length,

    percentage:
      Math.round(
        (
          completed /
          values.length
        ) * 100
      ),
  };
}

async function normalizeTransUnionInvestigation({
  investigationId,
  rawEvidenceId,
  userId,
}) {
  const investigation =
    await prisma.investigation.findUnique({
      where: {
        id: investigationId,
      },

      include: {
        check: true,
      },
    });

  if (!investigation) {
    throw createHttpError(
      "Investigación no encontrada",
      404,
      "INVESTIGATION_NOT_FOUND"
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

            type:
              "TRANSUNION_RAW",

            extractionStatus:
              "COMPLETED",
          },

          orderBy: {
            updatedAt: "desc",
          },
        });

  if (!rawEvidence) {
    throw createHttpError(
      "No existe una evidencia TRANSUNION_RAW completada",
      409,
      "TRANSUNION_RAW_MISSING"
    );
  }

  if (
    rawEvidence.investigationId !==
      investigationId ||
    rawEvidence.type !==
      "TRANSUNION_RAW"
  ) {
    throw createHttpError(
      "La evidencia RAW no corresponde a la investigación",
      409,
      "TRANSUNION_RAW_MISMATCH"
    );
  }

  const raw =
    rawEvidence.data || {};

  const plateRecords =
    collectPlates(raw);

  const allPolicies =
    normalizePolicies(raw);

  const activePolicies =
    allPolicies.filter(
      (policy) =>
        policy.status === "VIGENTE"
    );

  const expiredPolicies =
    allPolicies.filter(
      (policy) =>
        policy.status === "VENCIDA"
    );

  const normalizedData = {
    source: "TRANSUNION",
    stage: "NORMALIZED",

    schemaVersion:
      TRANSUNION_NORMALIZED_SCHEMA_VERSION,

    sourceRawEvidenceId:
      rawEvidence.id,

    document: {
      recognizedAsTransUnion:
        Boolean(
          raw.document
            ?.recognizedAsTransUnion
        ),

      title:
        cleanText(
          raw.document?.title
        ),

      reportStatus:
        cleanText(
          raw.document
            ?.reportStatus
        ),

      reportDate:
        cleanText(
          raw.reportMetadata
            ?.reportDate
        ),

      reportTime:
        cleanText(
          raw.reportMetadata
            ?.reportTime
        ),

      reportId:
        cleanText(
          raw.reportMetadata
            ?.reportId
        ),

      company:
        cleanText(
          raw.reportMetadata
            ?.company
        ),

      disclaimer:
        cleanText(
          raw.document
            ?.disclaimer
        ),
    },

    vehicle:
      normalizeVehicleIdentity(
        raw
      ),

    prices: {
      listPrice:
        normalizeCurrency(
          raw.prices
            ?.listPrice
        ),

      salePrice:
        normalizeCurrency(
          raw.prices
            ?.salePrice
        ),

      purchasePrice:
        normalizeCurrency(
          raw.prices
            ?.purchasePrice
        ),

      priceDate:
        cleanText(
          raw.prices
            ?.priceDate
        ),

      currency:
        cleanText(
          raw.prices
            ?.currency
        ) || "MXN",
    },

    equipment:
      raw.equipment || {},

    institutionReports:
      raw.institutionReports || [],

    dealerInformation:
      normalizeDealerInformation(
        raw
      ),

    financings:
      normalizeFinancings(raw),

    insurance: {
      allPolicies,
      activePolicies,
      expiredPolicies,

      administration:
        raw.insuranceAdministration ||
        [],
    },

    claims:
      normalizeClaims(raw),

    theftChecks:
      normalizeTheftChecks(raw),

    plates: {
      records: plateRecords,
      distinct:
        buildDistinctPlates(
          plateRecords
        ),
    },

    consultationHistory:
      raw.consultationHistory ||
      [],

    sectionsWithoutInformation:
      Array.isArray(
        raw.sectionsWithoutInformation
      )
        ? raw.sectionsWithoutInformation
        : [],

    warnings:
      Array.isArray(
        raw.warnings
      )
        ? raw.warnings
        : [],

    confidence:
      normalizeConfidence(
        rawEvidence.confidence
      ),

    normalizedAt:
      new Date().toISOString(),
  };

  normalizedData.validation =
    buildValidation({
      normalized:
        normalizedData,

      check:
        investigation.check,
    });

  normalizedData.coverage =
    buildCoverage(
      normalizedData
    );

  const existingEvidence =
    await prisma.evidence.findFirst({
      where: {
        investigationId,

        artifactId: null,

        type:
          "TRANSUNION_NORMALIZED",
      },
    });

  const evidence =
    existingEvidence
      ? await prisma.evidence.update({
          where: {
            id:
              existingEvidence.id,
          },

          data: {
            source:
              "CARVANTA_NORMALIZER",

            data:
              normalizedData,

            extractionStatus:
              "COMPLETED",

            confidence:
              normalizedData.confidence,

            extractor:
              "transunion-normalizer-v1",

            extractedAt:
              new Date(),

            createdById:
              userId,
          },
        })
      : await prisma.evidence.create({
          data: {
            checkId:
              investigation.checkId,

            investigationId,

            artifactId: null,

            createdById:
              userId,

            source:
              "CARVANTA_NORMALIZER",

            type:
              "TRANSUNION_NORMALIZED",

            data:
              normalizedData,

            extractionStatus:
              "COMPLETED",

            confidence:
              normalizedData.confidence,

            extractor:
              "transunion-normalizer-v1",

            extractedAt:
              new Date(),
          },
        });

  return {
    rawEvidenceId:
      rawEvidence.id,

    evidence,

    normalized:
      normalizedData,
  };
}

module.exports = {
  normalizeTransUnionInvestigation,
};
const {
  prisma,
} = require("../../../lib/prisma");

const RAPI_NORMALIZED_SCHEMA_VERSION = "1.0";

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

  return text || null;
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
  return normalizeIdentifier(value);
}

function normalizePlate(value) {
  return normalizeIdentifier(value);
}

function normalizeStatus(value) {
  const normalized = normalizeIdentifier(value);

  if (
    [
      "CLEAR",
      "ALERT",
      "UNKNOWN",
    ].includes(normalized)
  ) {
    return normalized;
  }

  return "UNKNOWN";
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

function normalizeRawEvidence(evidence) {
  const data =
    evidence?.data &&
    typeof evidence.data === "object"
      ? evidence.data
      : {};

  const queryType =
    data?.query?.queryType === "VIN"
      ? "VIN"
      : data?.query?.queryType === "PLATE"
        ? "PLATE"
        : "UNKNOWN";

  const queriedValue =
    queryType === "VIN"
      ? normalizeVin(
          data?.query?.vin ||
          data?.query?.queriedValue
        )
      : queryType === "PLATE"
        ? normalizePlate(
            data?.query?.plate ||
            data?.query?.queriedValue
          )
        : normalizeIdentifier(
            data?.query?.queriedValue
          );

  return {
    rawEvidenceId: evidence.id,
    artifactId: evidence.artifactId,
    artifactType:
      data?.artifact?.type || null,

    queryType,
    queriedValue,

    vin:
      queryType === "VIN"
        ? queriedValue
        : null,

    plate:
      queryType === "PLATE"
        ? queriedValue
        : null,

    queriedAt:
      cleanText(
        data?.query?.queriedAt
      ),

    result: {
      status: normalizeStatus(
        data?.result?.status
      ),

      hasIllicitOriginReport:
        typeof data?.result
          ?.hasIllicitOriginReport ===
        "boolean"
          ? data.result
              .hasIllicitOriginReport
          : null,

      informationalOnly:
        Boolean(
          data?.result
            ?.informationalOnly
        ),

      rawText:
        cleanText(
          data?.result?.rawText
        ),
    },

    recognizedAsRapi:
      Boolean(
        data?.document
          ?.recognizedAsRapi
      ),

    confidence:
      normalizeConfidence(
        evidence.confidence
      ),

    extractedAt:
      evidence.extractedAt ||
      evidence.updatedAt ||
      null,

    warnings: Array.isArray(
      data?.warnings
    )
      ? data.warnings
      : [],
  };
}

function buildValidation({
  queries,
  check,
}) {
  const issues = [];

  const investigationVin =
    normalizeVin(check?.vin);

  const investigationPlate =
    normalizePlate(
      check?.placas
    );

  const vinQueries =
    queries.filter(
      (query) =>
        query.queryType === "VIN"
    );

  const plateQueries =
    queries.filter(
      (query) =>
        query.queryType === "PLATE"
    );

  if (vinQueries.length === 0) {
    issues.push({
      code: "RAPI_VIN_QUERY_MISSING",
      severity: "HIGH",
      message:
        "No existe una consulta RAPI por VIN.",
    });
  }

  for (const query of vinQueries) {
    if (
      investigationVin &&
      query.vin &&
      investigationVin !== query.vin
    ) {
      issues.push({
        code: "RAPI_VIN_MISMATCH",
        severity: "HIGH",
        message:
          "El VIN consultado en RAPI no coincide con el VIN del expediente.",

        data: {
          investigationVin,
          queriedVin:
            query.vin,
          artifactId:
            query.artifactId,
        },
      });
    }
  }

  if (
    investigationPlate &&
    !plateQueries.some(
      (query) =>
        query.plate ===
        investigationPlate
    )
  ) {
    issues.push({
      code:
        "RAPI_CURRENT_PLATE_QUERY_MISSING",

      severity: "MEDIUM",

      message:
        "No existe una consulta RAPI para la placa registrada en el expediente.",

      data: {
        investigationPlate,
      },
    });
  }

  for (const query of queries) {
    if (!query.recognizedAsRapi) {
      issues.push({
        code:
          "RAPI_DOCUMENT_NOT_RECOGNIZED",

        severity: "HIGH",

        message:
          "Uno de los archivos no fue reconocido claramente como consulta RAPI.",

        data: {
          artifactId:
            query.artifactId,
        },
      });
    }

    if (!query.queriedValue) {
      issues.push({
        code:
          "RAPI_IDENTIFIER_MISSING",

        severity: "HIGH",

        message:
          "No fue posible identificar el VIN o la placa consultada.",

        data: {
          artifactId:
            query.artifactId,
        },
      });
    }

    if (
      query.result.status ===
      "UNKNOWN"
    ) {
      issues.push({
        code:
          "RAPI_RESULT_UNKNOWN",

        severity: "HIGH",

        message:
          "El resultado de una consulta RAPI no pudo clasificarse.",

        data: {
          artifactId:
            query.artifactId,
          queriedValue:
            query.queriedValue,
        },
      });
    }
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

function buildCoverage(queries) {
  const vinQueries =
    queries.filter(
      (query) =>
        query.queryType === "VIN"
    );

  const plateQueries =
    queries.filter(
      (query) =>
        query.queryType === "PLATE"
    );

  const identifiableQueries =
    queries.filter(
      (query) =>
        Boolean(query.queriedValue)
    );

  const completedQueries =
    queries.filter(
      (query) =>
        query.result.status !==
        "UNKNOWN"
    );

  const total = queries.length;

  return {
    totalQueries: total,
    vinQueries:
      vinQueries.length,

    plateQueries:
      plateQueries.length,

    identifiersChecked: Array.from(
      new Set(
        identifiableQueries.map(
          (query) =>
            query.queriedValue
        )
      )
    ),

    completedQueries:
      completedQueries.length,

    percentage:
      total > 0
        ? Math.round(
            (
              completedQueries.length /
              total
            ) * 100
          )
        : 0,
  };
}

async function normalizeRapiInvestigation({
  investigationId,
  userId,
}) {
  const investigation =
    await prisma.investigation.findUnique({
      where: {
        id: investigationId,
      },

      include: {
        check: true,

        evidences: {
          where: {
            type: "RAPI_RAW",
            extractionStatus:
              "COMPLETED",
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  if (!investigation) {
    throw createHttpError(
      "Investigación no encontrada",
      404,
      "INVESTIGATION_NOT_FOUND"
    );
  }

  if (
    investigation.evidences
      .length === 0
  ) {
    throw createHttpError(
      "No existen extracciones RAPI para normalizar",
      409,
      "RAPI_RAW_MISSING"
    );
  }

  const queries =
    investigation.evidences.map(
      normalizeRawEvidence
    );

  const validation =
    buildValidation({
      queries,
      check:
        investigation.check,
    });

  const coverage =
    buildCoverage(queries);

  const normalizedData = {
    source: "RAPI",
    stage: "NORMALIZED",
    schemaVersion:
      RAPI_NORMALIZED_SCHEMA_VERSION,

    investigationId,

    vehicleReference: {
      vin:
        normalizeVin(
          investigation.check.vin
        ),

      currentPlate:
        normalizePlate(
          investigation.check
            .placas
        ),
    },

    queries,

    vinQueries:
      queries.filter(
        (query) =>
          query.queryType ===
          "VIN"
      ),

    plateQueries:
      queries.filter(
        (query) =>
          query.queryType ===
          "PLATE"
      ),

    coverage,
    validation,

    normalizedAt:
      new Date().toISOString(),
  };

  const confidence =
    queries.length > 0
      ? Number(
          (
            queries.reduce(
              (
                sum,
                query
              ) =>
                sum +
                query.confidence,
              0
            ) /
            queries.length
          ).toFixed(4)
        )
      : 0;

  const existingEvidence =
    await prisma.evidence.findFirst({
      where: {
        investigationId,
        type:
          "RAPI_NORMALIZED",
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

            artifactId: null,

            data:
              normalizedData,

            extractionStatus:
              "COMPLETED",

            confidence,

            extractor:
              "rapi-normalizer-v1",

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

            source:
              "CARVANTA_NORMALIZER",

            type:
              "RAPI_NORMALIZED",

            data:
              normalizedData,

            extractionStatus:
              "COMPLETED",

            confidence,

            extractor:
              "rapi-normalizer-v1",

            extractedAt:
              new Date(),

            createdById:
              userId,
          },
        });

  return {
    evidence,
    normalized:
      normalizedData,
  };
}

module.exports = {
  normalizeRapiInvestigation,
};
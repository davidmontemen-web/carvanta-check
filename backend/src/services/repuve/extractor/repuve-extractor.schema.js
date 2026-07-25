const REPUVE_RAW_SCHEMA_VERSION = "1.0";

const repuveRawJsonSchema = {
  name: "repuve_raw_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "document",
      "vehicle",
      "registration",
      "query",
      "legalStatus",
      "rawText",
      "fieldConfidence",
      "warnings",
    ],
    properties: {
      document: {
        type: "object",
        additionalProperties: false,
        required: [
          "recognizedAsRepuve",
          "documentTitle",
          "sourceLabel",
        ],
        properties: {
          recognizedAsRepuve: { type: "boolean" },
          documentTitle: { type: ["string", "null"] },
          sourceLabel: { type: ["string", "null"] },
        },
      },

      vehicle: {
        type: "object",
        additionalProperties: false,
        required: [
          "vin",
          "plate",
          "brand",
          "model",
          "year",
          "version",
          "vehicleClass",
          "vehicleType",
          "registrationCertificateNumber",
        ],
        properties: {
          vin: { type: ["string", "null"] },
          plate: { type: ["string", "null"] },
          brand: { type: ["string", "null"] },
          model: { type: ["string", "null"] },
          year: { type: ["string", "null"] },
          version: { type: ["string", "null"] },
          vehicleClass: { type: ["string", "null"] },
          vehicleType: { type: ["string", "null"] },
          registrationCertificateNumber: {
            type: ["string", "null"],
          },
        },
      },

      registration: {
        type: "object",
        additionalProperties: false,
        required: [
          "registeringInstitution",
          "registeringState",
          "registeredAt",
          "platedAt",
          "lastUpdatedAt",
          "registrationFolio",
          "observations",
        ],
        properties: {
          registeringInstitution: {
            type: ["string", "null"],
          },
          registeringState: { type: ["string", "null"] },
          registeredAt: { type: ["string", "null"] },
          platedAt: { type: ["string", "null"] },
          lastUpdatedAt: { type: ["string", "null"] },
          registrationFolio: { type: ["string", "null"] },
          observations: { type: ["string", "null"] },
        },
      },

      query: {
        type: "object",
        additionalProperties: false,
        required: ["queriedAt", "queryFolio"],
        properties: {
          queriedAt: { type: ["string", "null"] },
          queryFolio: { type: ["string", "null"] },
        },
      },

      legalStatus: {
        type: "object",
        additionalProperties: false,
        required: [
          "prosecutorOffice",
          "ocra",
          "carfaxNorthAmerica",
          "ministerialJudicialNotices",
          "officialResult",
        ],
        properties: {
          prosecutorOffice: {
            $ref: "#/$defs/statusBlock",
          },
          ocra: {
            $ref: "#/$defs/statusBlock",
          },
          carfaxNorthAmerica: {
            $ref: "#/$defs/statusBlock",
          },
          ministerialJudicialNotices: {
            $ref: "#/$defs/statusBlock",
          },
          officialResult: {
            $ref: "#/$defs/statusBlock",
          },
        },
      },

      rawText: { type: "string" },

      fieldConfidence: {
        type: "object",
        additionalProperties: false,
        required: [
          "vin",
          "plate",
          "brand",
          "model",
          "year",
          "officialResult",
          "queriedAt",
        ],
        properties: {
          vin: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          plate: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          brand: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          model: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          year: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          officialResult: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          queriedAt: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
      },

      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },

    $defs: {
      statusBlock: {
        type: "object",
        additionalProperties: false,
        required: ["status", "rawText"],
        properties: {
          status: {
            type: "string",
            enum: ["CLEAR", "ALERT", "UNKNOWN"],
          },
          rawText: { type: ["string", "null"] },
        },
      },
    },
  },
};

function buildEmptyRepuveRaw() {
  return {
    schemaVersion: REPUVE_RAW_SCHEMA_VERSION,

    document: {
      recognizedAsRepuve: false,
      documentTitle: null,
      sourceLabel: null,
    },

    vehicle: {
      vin: null,
      plate: null,
      brand: null,
      model: null,
      year: null,
      version: null,
      vehicleClass: null,
      vehicleType: null,
      registrationCertificateNumber: null,
    },

    registration: {
      registeringInstitution: null,
      registeringState: null,
      registeredAt: null,
      platedAt: null,
      lastUpdatedAt: null,
      registrationFolio: null,
      observations: null,
    },

    query: {
      queriedAt: null,
      queryFolio: null,
    },

    legalStatus: {
      prosecutorOffice: {
        status: "UNKNOWN",
        rawText: null,
      },
      ocra: {
        status: "UNKNOWN",
        rawText: null,
      },
      carfaxNorthAmerica: {
        status: "UNKNOWN",
        rawText: null,
      },
      ministerialJudicialNotices: {
        status: "UNKNOWN",
        rawText: null,
      },
      officialResult: {
        status: "UNKNOWN",
        rawText: null,
      },
    },

    rawText: "",
    fieldConfidence: {
      vin: 0,
      plate: 0,
      brand: 0,
      model: 0,
      year: 0,
      officialResult: 0,
      queriedAt: 0,
    },
    warnings: [],
  };
}

module.exports = {
  REPUVE_RAW_SCHEMA_VERSION,
  repuveRawJsonSchema,
  buildEmptyRepuveRaw,
};

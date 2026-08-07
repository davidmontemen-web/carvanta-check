const RAPI_RAW_SCHEMA_VERSION = "1.0";

const rapiRawJsonSchema = {
  name: "rapi_raw_extraction",
  strict: true,

  schema: {
    type: "object",
    additionalProperties: false,

    required: [
      "document",
      "query",
      "result",
      "rawText",
      "fieldConfidence",
      "warnings",
    ],

    properties: {
      document: {
        type: "object",
        additionalProperties: false,

        required: [
          "recognizedAsRapi",
          "documentTitle",
          "sourceLabel",
        ],

        properties: {
          recognizedAsRapi: {
            type: "boolean",
          },

          documentTitle: {
            type: ["string", "null"],
          },

          sourceLabel: {
            type: ["string", "null"],
          },
        },
      },

      query: {
        type: "object",
        additionalProperties: false,

        required: [
          "queryType",
          "queriedValue",
          "queriedAt",
          "vin",
          "plate",
        ],

        properties: {
          queryType: {
            type: "string",
            enum: [
              "VIN",
              "PLATE",
              "UNKNOWN",
            ],
          },

          queriedValue: {
            type: ["string", "null"],
          },

          queriedAt: {
            type: ["string", "null"],
          },

          vin: {
            type: ["string", "null"],
          },

          plate: {
            type: ["string", "null"],
          },
        },
      },

      result: {
        type: "object",
        additionalProperties: false,

        required: [
          "status",
          "hasIllicitOriginReport",
          "rawText",
          "informationalOnly",
        ],

        properties: {
          status: {
            type: "string",
            enum: [
              "CLEAR",
              "ALERT",
              "UNKNOWN",
            ],
          },

          hasIllicitOriginReport: {
            type: [
              "boolean",
              "null",
            ],
          },

          rawText: {
            type: ["string", "null"],
          },

          informationalOnly: {
            type: "boolean",
          },
        },
      },

      rawText: {
        type: "string",
      },

      fieldConfidence: {
        type: "object",
        additionalProperties: false,

        required: [
          "recognizedAsRapi",
          "queryType",
          "queriedValue",
          "queriedAt",
          "result",
        ],

        properties: {
          recognizedAsRapi: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          queryType: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          queriedValue: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          queriedAt: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          result: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
      },

      warnings: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  },
};

function buildEmptyRapiRaw() {
  return {
    document: {
      recognizedAsRapi: false,
      documentTitle: null,
      sourceLabel: null,
    },

    query: {
      queryType: "UNKNOWN",
      queriedValue: null,
      queriedAt: null,
      vin: null,
      plate: null,
    },

    result: {
      status: "UNKNOWN",
      hasIllicitOriginReport: null,
      rawText: null,
      informationalOnly: true,
    },

    rawText: "",

    fieldConfidence: {
      recognizedAsRapi: 0,
      queryType: 0,
      queriedValue: 0,
      queriedAt: 0,
      result: 0,
    },

    warnings: [],
  };
}

module.exports = {
  RAPI_RAW_SCHEMA_VERSION,
  rapiRawJsonSchema,
  buildEmptyRapiRaw,
};
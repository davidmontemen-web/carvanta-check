const REPUVE_ANALYSIS_SCHEMA_VERSION = "1.0";

const repuveInvestigatorJsonSchema = {
  name: "repuve_investigation_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "risk",
      "confidence",
      "findings",
      "recommendations",
      "reasoning",
    ],
    properties: {
      summary: { type: "string" },
      risk: {
        type: "string",
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "code",
            "severity",
            "title",
            "description",
            "evidence",
          ],
          properties: {
            code: { type: "string" },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            title: { type: "string" },
            description: { type: "string" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "code",
            "priority",
            "title",
            "description",
          ],
          properties: {
            code: { type: "string" },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            title: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      reasoning: {
        type: "object",
        additionalProperties: false,
        required: [
          "positiveSignals",
          "negativeSignals",
          "missingInformation",
        ],
        properties: {
          positiveSignals: {
            type: "array",
            items: { type: "string" },
          },
          negativeSignals: {
            type: "array",
            items: { type: "string" },
          },
          missingInformation: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};

module.exports = {
  REPUVE_ANALYSIS_SCHEMA_VERSION,
  repuveInvestigatorJsonSchema,
};

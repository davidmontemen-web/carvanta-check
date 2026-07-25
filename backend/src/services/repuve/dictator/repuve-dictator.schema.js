const REPUVE_REPORT_SCHEMA_VERSION = "1.0";

const repuveDictatorJsonSchema = {
  name: "repuve_executive_report",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "executiveSummary",
      "rationale",
      "nextSteps",
      "disclaimer",
    ],
    properties: {
      executiveSummary: {
        type: "string",
      },
      rationale: {
        type: "array",
        items: { type: "string" },
      },
      nextSteps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "priority", "action"],
          properties: {
            code: { type: "string" },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            action: { type: "string" },
          },
        },
      },
      disclaimer: {
        type: "string",
      },
    },
  },
};

module.exports = {
  REPUVE_REPORT_SCHEMA_VERSION,
  repuveDictatorJsonSchema,
};

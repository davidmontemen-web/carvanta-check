const TRANSUNION_ANALYSIS_SCHEMA_VERSION = "1.0";

const transunionInvestigatorJsonSchema = {
  name: "transunion_investigation_analysis",
  strict: true,

  schema: {
    type: "object",
    additionalProperties: false,

    required: [
      "summary",
      "risk",
      "confidence",
      "categoryAssessment",
      "findings",
      "recommendations",
      "reasoning",
    ],

    properties: {
      summary: {
        type: "string",
      },

      risk: {
        type: "string",
        enum: [
          "LOW",
          "MEDIUM",
          "HIGH",
          "CRITICAL",
        ],
      },

      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },

      categoryAssessment: {
        type: "object",
        additionalProperties: false,

        required: [
          "identity",
          "theft",
          "insurance",
          "claims",
          "financing",
          "condition",
          "plates",
          "informationCoverage",
        ],

        properties: {
          identity: {
            $ref: "#/$defs/categoryResult",
          },

          theft: {
            $ref: "#/$defs/categoryResult",
          },

          insurance: {
            $ref: "#/$defs/categoryResult",
          },

          claims: {
            $ref: "#/$defs/categoryResult",
          },

          financing: {
            $ref: "#/$defs/categoryResult",
          },

          condition: {
            $ref: "#/$defs/categoryResult",
          },

          plates: {
            $ref: "#/$defs/categoryResult",
          },

          informationCoverage: {
            $ref: "#/$defs/categoryResult",
          },
        },
      },

      findings: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "code",
            "severity",
            "category",
            "title",
            "description",
            "customerMeaning",
            "evidence",
          ],

          properties: {
            code: {
              type: "string",
            },

            severity: {
              type: "string",
              enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
              ],
            },

            category: {
              type: "string",
              enum: [
                "IDENTITY",
                "THEFT",
                "INSURANCE",
                "CLAIMS",
                "FINANCING",
                "CONDITION",
                "PLATES",
                "COVERAGE",
              ],
            },

            title: {
              type: "string",
            },

            description: {
              type: "string",
            },

            customerMeaning: {
              type: "string",
            },

            evidence: {
              type: "array",
              items: {
                type: "string",
              },
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
            code: {
              type: "string",
            },

            priority: {
              type: "string",
              enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
              ],
            },

            title: {
              type: "string",
            },

            description: {
              type: "string",
            },
          },
        },
      },

      reasoning: {
        type: "object",
        additionalProperties: false,

        required: [
          "positiveSignals",
          "riskSignals",
          "missingInformation",
          "platesToInvestigate",
        ],

        properties: {
          positiveSignals: {
            type: "array",
            items: {
              type: "string",
            },
          },

          riskSignals: {
            type: "array",
            items: {
              type: "string",
            },
          },

          missingInformation: {
            type: "array",
            items: {
              type: "string",
            },
          },

          platesToInvestigate: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
    },

    $defs: {
      categoryResult: {
        type: "object",
        additionalProperties: false,

        required: [
          "status",
          "risk",
          "summary",
        ],

        properties: {
          status: {
            type: "string",
            enum: [
              "CLEAR",
              "INFORMATIONAL",
              "NEEDS_REVIEW",
              "ALERT",
              "NO_INFORMATION",
            ],
          },

          risk: {
            type: "string",
            enum: [
              "LOW",
              "MEDIUM",
              "HIGH",
              "CRITICAL",
            ],
          },

          summary: {
            type: "string",
          },
        },
      },
    },
  },
};

module.exports = {
  TRANSUNION_ANALYSIS_SCHEMA_VERSION,
  transunionInvestigatorJsonSchema,
};
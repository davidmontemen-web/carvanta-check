const TRANSUNION_RAW_SCHEMA_VERSION = "1.0";

const nullableString = {
  type: ["string", "null"],
};

const transunionRawJsonSchema = {
  name: "transunion_raw_extraction",
  strict: true,

  schema: {
    type: "object",
    additionalProperties: false,

    required: [
      "document",
      "reportMetadata",
      "vehicleIdentity",
      "prices",
      "equipment",
      "institutionReports",
      "dealerInformation",
      "financings",
      "insurancePolicies",
      "insuranceAdministration",
      "claims",
      "theftAndRecovery",
      "plateHistory",
      "consultationHistory",
      "sectionsWithoutInformation",
      "warnings",
      "fieldConfidence",
    ],

    properties: {
      document: {
        type: "object",
        additionalProperties: false,

        required: [
          "recognizedAsTransUnion",
          "title",
          "reportStatus",
          "totalPages",
          "disclaimer",
        ],

        properties: {
          recognizedAsTransUnion: {
            type: "boolean",
          },

          title: nullableString,
          reportStatus: nullableString,

          totalPages: {
            type: ["integer", "null"],
          },

          disclaimer: nullableString,
        },
      },

      reportMetadata: {
        type: "object",
        additionalProperties: false,

        required: [
          "vin",
          "userId",
          "company",
          "reportDate",
          "reportTime",
          "reportId",
        ],

        properties: {
          vin: nullableString,
          userId: nullableString,
          company: nullableString,
          reportDate: nullableString,
          reportTime: nullableString,
          reportId: nullableString,
        },
      },

      vehicleIdentity: {
        type: "object",
        additionalProperties: false,

        required: [
          "manufacturer",
          "brand",
          "submodel",
          "vehicleClass",
          "modelYear",
          "version",
          "countryOfOrigin",
          "color",
          "engineNumber",
          "nci",
        ],

        properties: {
          manufacturer: nullableString,
          brand: nullableString,
          submodel: nullableString,
          vehicleClass: nullableString,
          modelYear: nullableString,
          version: nullableString,
          countryOfOrigin: nullableString,
          color: nullableString,
          engineNumber: nullableString,
          nci: nullableString,
        },
      },

      prices: {
        type: "object",
        additionalProperties: false,

        required: [
          "listPrice",
          "salePrice",
          "purchasePrice",
          "priceDate",
          "currency",
        ],

        properties: {
          listPrice: nullableString,
          salePrice: nullableString,
          purchasePrice: nullableString,
          priceDate: nullableString,
          currency: nullableString,
        },
      },

      equipment: {
        type: "object",
        additionalProperties: false,

        required: [
          "bodyType",
          "doors",
          "engine",
          "cylinders",
          "power",
          "fuel",
          "transmission",
          "traction",
          "steering",
          "interior",
          "airbags",
          "airConditioning",
          "electricWindows",
          "stereo",
          "wheelType",
          "wheelSize",
          "frontBrakes",
          "rearBrakes",
          "frontSuspension",
          "rearSuspension",
          "passengers",
          "valves",
          "electricMirrors",
          "sunroof",
          "tire",
          "cabType",
          "roof",
        ],

        properties: {
          bodyType: nullableString,
          doors: nullableString,
          engine: nullableString,
          cylinders: nullableString,
          power: nullableString,
          fuel: nullableString,
          transmission: nullableString,
          traction: nullableString,
          steering: nullableString,
          interior: nullableString,
          airbags: nullableString,
          airConditioning: nullableString,
          electricWindows: nullableString,
          stereo: nullableString,
          wheelType: nullableString,
          wheelSize: nullableString,
          frontBrakes: nullableString,
          rearBrakes: nullableString,
          frontSuspension: nullableString,
          rearSuspension: nullableString,
          passengers: nullableString,
          valves: nullableString,
          electricMirrors: nullableString,
          sunroof: nullableString,
          tire: nullableString,
          cabType: nullableString,
          roof: nullableString,
        },
      },

      institutionReports: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "institution",
            "manufacturer",
            "submodel",
            "vehicleClass",
            "version",
            "plate",
            "modelYear",
            "vehicleType",
            "engineNumber",
            "color",
            "registrationDate",
            "timesReported",
          ],

          properties: {
            institution: nullableString,
            manufacturer: nullableString,
            submodel: nullableString,
            vehicleClass: nullableString,
            version: nullableString,
            plate: nullableString,
            modelYear: nullableString,
            vehicleType: nullableString,
            engineNumber: nullableString,
            color: nullableString,
            registrationDate: nullableString,
            timesReported: nullableString,
          },
        },
      },

      dealerInformation: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "institution",
            "lastLocation",
            "reportDate",
            "physicalCondition",
            "singleOwner",
            "use",
            "mileage",
            "plate",
            "color",
            "issuingState",
            "serviceCount",
            "lastServiceDate",
            "extendedWarranty",
            "extendedWarrantyDate",
          ],

          properties: {
            institution: nullableString,
            lastLocation: nullableString,
            reportDate: nullableString,
            physicalCondition: nullableString,
            singleOwner: nullableString,
            use: nullableString,
            mileage: nullableString,
            plate: nullableString,
            color: nullableString,
            issuingState: nullableString,
            serviceCount: nullableString,
            lastServiceDate: nullableString,
            extendedWarranty: nullableString,
            extendedWarrantyDate: nullableString,
          },
        },
      },

      financings: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "company",
            "contractNumber",
            "financingType",
            "state",
            "personType",
            "startDate",
            "endDate",
            "term",
            "vehicleCondition",
            "status",
            "use",
            "cancellationDate",
            "observations",
            "portfolioStatus",
          ],

          properties: {
            company: nullableString,
            contractNumber: nullableString,
            financingType: nullableString,
            state: nullableString,
            personType: nullableString,
            startDate: nullableString,
            endDate: nullableString,
            term: nullableString,
            vehicleCondition: nullableString,
            status: nullableString,
            use: nullableString,
            cancellationDate: nullableString,
            observations: nullableString,
            portfolioStatus: nullableString,
          },
        },
      },

      insurancePolicies: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "company",
            "policyNumber",
            "section",
            "place",
            "startDate",
            "endDate",
            "use",
            "product",
            "coverages",
            "status",
            "lastStatusDate",
            "statusChangeReason",
          ],

          properties: {
            company: nullableString,
            policyNumber: nullableString,
            section: nullableString,
            place: nullableString,
            startDate: nullableString,
            endDate: nullableString,
            use: nullableString,
            product: nullableString,
            coverages: nullableString,
            status: nullableString,
            lastStatusDate: nullableString,
            statusChangeReason: nullableString,
          },
        },
      },

      insuranceAdministration: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "company",
            "policyNumber",
            "section",
            "salesChannel",
            "agent",
            "promoter",
            "collectionMethod",
            "paymentMethod",
            "beneficiary",
          ],

          properties: {
            company: nullableString,
            policyNumber: nullableString,
            section: nullableString,
            salesChannel: nullableString,
            agent: nullableString,
            promoter: nullableString,
            collectionMethod: nullableString,
            paymentMethod: nullableString,
            beneficiary: nullableString,
          },
        },
      },

      claims: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "company",
            "claimNumber",
            "description",
            "place",
            "occurredDate",
            "reportedDate",
            "status",
            "updatedAt",
            "claimant",
            "responsibleParty",
            "compensationType",
            "reserveAmount",
            "indemnificationAmount",
            "sipac",
            "deductible",
          ],

          properties: {
            company: nullableString,
            claimNumber: nullableString,
            description: nullableString,
            place: nullableString,
            occurredDate: nullableString,
            reportedDate: nullableString,
            status: nullableString,
            updatedAt: nullableString,
            claimant: nullableString,
            responsibleParty: nullableString,
            compensationType: nullableString,
            reserveAmount: nullableString,
            indemnificationAmount: nullableString,
            sipac: nullableString,
            deductible: nullableString,
          },
        },
      },

      theftAndRecovery: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "queryType",
            "queriedValue",
            "institution",
            "status",
            "theftPlace",
            "updatedAt",
            "theftDate",
            "investigationDate",
            "recoveryPlace",
            "recoveryDate",
          ],

          properties: {
            queryType: nullableString,
            queriedValue: nullableString,
            institution: nullableString,
            status: nullableString,
            theftPlace: nullableString,
            updatedAt: nullableString,
            theftDate: nullableString,
            investigationDate: nullableString,
            recoveryPlace: nullableString,
            recoveryDate: nullableString,
          },
        },
      },

      plateHistory: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "plate",
            "institution",
            "movement",
            "movementDate",
          ],

          properties: {
            plate: nullableString,
            institution: nullableString,
            movement: nullableString,
            movementDate: nullableString,
          },
        },
      },

      consultationHistory: {
        type: "array",

        items: {
          type: "object",
          additionalProperties: false,

          required: [
            "company",
            "consultationDate",
          ],

          properties: {
            company: nullableString,
            consultationDate: nullableString,
          },
        },
      },

      sectionsWithoutInformation: {
        type: "array",
        items: {
          type: "string",
        },
      },

      warnings: {
        type: "array",
        items: {
          type: "string",
        },
      },

      fieldConfidence: {
        type: "object",
        additionalProperties: false,

        required: [
          "document",
          "reportMetadata",
          "vehicleIdentity",
          "prices",
          "equipment",
          "institutionReports",
          "dealerInformation",
          "financings",
          "insurancePolicies",
          "claims",
          "theftAndRecovery",
          "plateHistory",
          "sectionsWithoutInformation",
        ],

        properties: {
          document: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          reportMetadata: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          vehicleIdentity: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          prices: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          equipment: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          institutionReports: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          dealerInformation: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          financings: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          insurancePolicies: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          claims: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          theftAndRecovery: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          plateHistory: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },

          sectionsWithoutInformation: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
  },
};

module.exports = {
  TRANSUNION_RAW_SCHEMA_VERSION,
  transunionRawJsonSchema,
};
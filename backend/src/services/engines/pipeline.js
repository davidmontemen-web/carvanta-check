const { prisma } = require("../../lib/prisma");

const {
  runCollectionEngine,
} = require("./collection.engine");

const {
  runExtractionEngine,
} = require("./extraction.engine");

const {
  runIntelligenceEngine,
} = require("./intelligence.engine");

const {
  runReportEngine,
} = require("./report.engine");

async function runInvestigationPipeline(
  investigationId
) {
  return prisma.$transaction(
    async (transaction) => {
      const {
        investigation,
        artifacts,
      } = await runCollectionEngine({
        transaction,
        investigationId,
      });

      const evidences =
        await runExtractionEngine({
          transaction,
          investigation,
          artifacts,
        });

      const findings =
        await runIntelligenceEngine({
          transaction,
          investigation,
          evidences,
        });

      const report =
        await runReportEngine({
          transaction,
          investigation,
          evidences,
          findings,
        });

      return {
        investigationId:
          investigation.id,

        checkId:
          investigation.checkId,

        pipeline: {
          collection: {
            artifacts:
              artifacts.length,
          },

          extraction: {
            evidences:
              evidences.length,
          },

          intelligence: {
            findings:
              findings.length,
          },

          report: {
            id: report.id,
            quality: report.quality,
            riskLevel:
              report.riskLevel,
          },
        },

        report,
      };
    }
  );
}

module.exports = {
  runInvestigationPipeline,
};
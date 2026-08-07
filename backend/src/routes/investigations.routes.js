const express = require("express");

const createInvestigationRouter = require("./investigations/investigation.routes");
const createArtifactsRouter = require("./investigations/artifacts.routes");
const createEvidencesRouter = require("./investigations/evidences.routes");
const createFindingsRouter = require("./investigations/findings.routes");
const createLifecycleRouter = require("./investigations/lifecycle.routes");
const createVehicleBaseRouter = require("./investigations/vehicle-base.routes");
const createWorkspaceRouter = require("./investigations/workspace.routes");
const createRepuveRouter = require("./investigations/repuve.routes");
const createRapiRouter = require("./investigations/rapi.routes");
const createTransUnionRouter = require("./investigations/transunion.routes");
const createInvoiceRouter = require("./investigations/invoice.routes");

function createInvestigationsRouter(dependencies) {
  const router = express.Router();

  router.use(createInvestigationRouter());
  router.use(createArtifactsRouter(dependencies));
  router.use(createEvidencesRouter());
  router.use(createFindingsRouter());
  router.use(createLifecycleRouter());
  router.use(createVehicleBaseRouter());
  router.use(createWorkspaceRouter());
  router.use(createRepuveRouter());
  router.use(createRapiRouter());
  router.use(createTransUnionRouter());
  router.use(createInvoiceRouter());

  return router;
}

module.exports = createInvestigationsRouter;

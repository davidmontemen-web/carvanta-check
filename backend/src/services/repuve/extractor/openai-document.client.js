const fs = require("fs/promises");

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

function requireOpenAiApiKey() {
  const apiKey = String(
    process.env.OPENAI_API_KEY || ""
  ).trim();

  if (!apiKey) {
    const error = new Error(
      "OPENAI_API_KEY no está configurada en el backend"
    );

    error.code = "OPENAI_API_KEY_MISSING";
    error.statusCode = 503;
    throw error;
  }

  return apiKey;
}

function resolveModel() {
  return (
    String(
      process.env.OPENAI_EXTRACTION_MODEL || ""
    ).trim() || "gpt-5-mini"
  );
}

function buildFileInput({
  mimeType,
  originalName,
  base64,
}) {
  if (String(mimeType || "").startsWith("image/")) {
    return {
      type: "input_image",
      detail: "high",
      image_url: `data:${mimeType};base64,${base64}`,
    };
  }

  return {
    type: "input_file",
    filename: originalName || "repuve-document.pdf",
    file_data: `data:${mimeType || "application/pdf"};base64,${base64}`,
  };
}


function buildOpenAiHttpError(response, responseBody) {
  const apiError = responseBody?.error || {};
  const technicalMessage =
    apiError.message || "OpenAI no pudo procesar el artifact";
  const apiCode = String(apiError.code || "").trim();
  const apiType = String(apiError.type || "").trim();

  let publicMessage =
    "No fue posible procesar el documento con inteligencia artificial. Intenta nuevamente.";

  let code = "OPENAI_EXTRACTION_FAILED";
  let statusCode = response.status >= 500 ? 503 : 422;

  if (
    response.status === 429 &&
    (apiCode === "insufficient_quota" ||
      apiType === "insufficient_quota" ||
      /quota|billing/i.test(technicalMessage))
  ) {
    publicMessage =
      "El servicio de inteligencia artificial no tiene saldo disponible. Revisa la facturación de la API y vuelve a intentarlo.";
    code = "OPENAI_INSUFFICIENT_QUOTA";
    statusCode = 503;
  } else if (response.status === 429) {
    publicMessage =
      "El servicio de inteligencia artificial alcanzó temporalmente su límite de solicitudes. Espera unos momentos y vuelve a intentarlo.";
    code = "OPENAI_RATE_LIMITED";
    statusCode = 503;
  } else if (response.status === 401) {
    publicMessage =
      "La configuración del servicio de inteligencia artificial no es válida. Contacta al administrador.";
    code = "OPENAI_AUTHENTICATION_FAILED";
    statusCode = 503;
  } else if (response.status === 413) {
    publicMessage =
      "El archivo es demasiado grande para procesarlo. Reduce su tamaño y vuelve a intentarlo.";
    code = "OPENAI_FILE_TOO_LARGE";
    statusCode = 413;
  }

  const error = new Error(publicMessage);
  error.code = code;
  error.statusCode = statusCode;
  error.details = {
    provider: "OPENAI",
    httpStatus: response.status,
    apiCode: apiCode || null,
    apiType: apiType || null,
    technicalMessage,
  };

  return error;
}

function readOutputText(responseBody) {
  if (
    typeof responseBody?.output_text === "string" &&
    responseBody.output_text.trim()
  ) {
    return responseBody.output_text.trim();
  }

  const textParts = [];

  for (const outputItem of responseBody?.output || []) {
    for (const contentItem of outputItem?.content || []) {
      if (
        contentItem?.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function parseJsonOutput(outputText) {
  const cleaned = String(outputText || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const parsingError = new Error(
      "El extractor devolvió una respuesta que no es JSON válido"
    );

    parsingError.code =
      "REPUVE_EXTRACTION_INVALID_JSON";

    parsingError.cause = error;
    throw parsingError;
  }
}

async function extractStructuredDocument({
  absoluteFilePath,
  originalName,
  mimeType,
  jsonSchema,
  instructions,
}) {
  const apiKey = requireOpenAiApiKey();
  const fileBuffer = await fs.readFile(absoluteFilePath);
  const base64 = fileBuffer.toString("base64");

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: resolveModel(),
      store: false,

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: instructions,
            },
            buildFileInput({
              mimeType,
              originalName,
              base64,
            }),
          ],
        },
      ],

      text: {
        format: {
          type: "json_schema",
          ...jsonSchema,
        },
      },
    }),
  });

  const responseBody = await response.json();

  if (!response.ok) {
    const error = buildOpenAiHttpError(
      response,
      responseBody
    );

    console.error("[OPENAI EXTRACTION ERROR]", {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });

    throw error;
  }

  const outputText = readOutputText(responseBody);

  if (!outputText) {
    const error = new Error(
      "El extractor no devolvió contenido"
    );

    error.code = "REPUVE_EXTRACTION_EMPTY";
    throw error;
  }

  return {
    data: parseJsonOutput(outputText),

    provider: "OPENAI",
    model: resolveModel(),
    responseId: responseBody.id || null,

    usage: responseBody.usage || null,
  };
}

module.exports = {
  extractStructuredDocument,
};

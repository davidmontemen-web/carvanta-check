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

function resolveInvestigationModel() {
  return (
    String(
      process.env.OPENAI_INVESTIGATION_MODEL ||
        process.env.OPENAI_EXTRACTION_MODEL ||
        ""
    ).trim() || "gpt-5-mini"
  );
}

function readOutputText(responseBody) {
  if (
    typeof responseBody?.output_text === "string" &&
    responseBody.output_text.trim()
  ) {
    return responseBody.output_text.trim();
  }

  const parts = [];

  for (const outputItem of responseBody?.output || []) {
    for (const contentItem of outputItem?.content || []) {
      if (
        contentItem?.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        parts.push(contentItem.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function parseJsonOutput(outputText) {
  const cleaned = String(outputText || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch (cause) {
    const error = new Error(
      "El investigador devolvió una respuesta que no es JSON válido"
    );
    error.code = "AI_INVESTIGATION_INVALID_JSON";
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }
}

async function generateStructuredAnalysis({
  instructions,
  input,
  jsonSchema,
}) {
  const apiKey = requireOpenAiApiKey();
  const model = resolveInvestigationModel();

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: instructions,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(input),
            },
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
    const error = new Error(
      responseBody?.error?.message ||
        "OpenAI no pudo analizar el conocimiento normalizado"
    );
    error.code = "OPENAI_INVESTIGATION_FAILED";
    error.statusCode =
      response.status >= 500 ? 503 : 422;
    error.details = responseBody?.error || null;
    throw error;
  }

  const outputText = readOutputText(responseBody);

  if (!outputText) {
    const error = new Error(
      "El investigador no devolvió contenido"
    );
    error.code = "AI_INVESTIGATION_EMPTY";
    error.statusCode = 502;
    throw error;
  }

  return {
    data: parseJsonOutput(outputText),
    provider: "OPENAI",
    model,
    responseId: responseBody.id || null,
    usage: responseBody.usage || null,
  };
}

module.exports = {
  generateStructuredAnalysis,
};

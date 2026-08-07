const VPIC_BASE_URL =
  "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    !normalized ||
    normalized.toLowerCase() === "not applicable" ||
    normalized.toLowerCase() === "not available"
  ) {
    return null;
  }

  return normalized;
}

function normalizeYear(value) {
  const year = Number.parseInt(value, 10);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return null;
  }

  return year;
}

async function decodeVin(vin) {
  const normalizedVin = String(vin || "")
    .trim()
    .toUpperCase();

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) {
    return {
      success: false,
      identified: false,
      error: "VIN_INVALID",
      vehicle: null,
    };
  }

  const url =
    `${VPIC_BASE_URL}/${encodeURIComponent(normalizedVin)}` +
    "?format=json";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        success: false,
        identified: false,
        error: "PROVIDER_ERROR",
        vehicle: null,
      };
    }

    const data = await response.json();
    const result = data?.Results?.[0];

    if (!result) {
      return {
        success: false,
        identified: false,
        error: "EMPTY_RESPONSE",
        vehicle: null,
      };
    }

    const vehicle = {
      marca: normalizeText(result.Make),
      modelo: normalizeText(result.Model),
      anio: normalizeYear(result.ModelYear),
    };

    const identified = Boolean(
      vehicle.marca ||
      vehicle.modelo ||
      vehicle.anio
    );

    return {
      success: true,
      identified,
      error: null,
      vehicle,
    };
  } catch (error) {
    console.error("Error decoding VIN:", error.message);

    return {
      success: false,
      identified: false,
      error:
        error.name === "TimeoutError"
          ? "PROVIDER_TIMEOUT"
          : "PROVIDER_UNAVAILABLE",
      vehicle: null,
    };
  }
}

module.exports = {
  decodeVin,
};
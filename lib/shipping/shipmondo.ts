const SHIPMONDO_BASE_URL =
  "https://app.shipmondo.com/api/public/v3";

function getAuthorizationHeader() {
  const username =
    process.env.SHIPMONDO_API_USERNAME;
  const apiKey =
    process.env.SHIPMONDO_API_KEY;

  if (!username || !apiKey) {
    throw new Error(
      "Shipmondo API credentials mangler.",
    );
  }

  const encoded = Buffer.from(
    `${username}:${apiKey}`,
  ).toString("base64");

  return `Basic ${encoded}`;
}

export class ShipmondoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseMessage: string,
  ) {
    super(`Shipmondo API returnerede ${status}.`);
    this.name = "ShipmondoApiError";
  }
}

export async function shipmondoRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${SHIPMONDO_BASE_URL}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: getAuthorizationHeader(),
        ...init.headers,
      },
      cache: "no-store",
    },
  );

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    console.error("Shipmondo API-fejl", {
      status: response.status,
      data,
    });

    const responseMessage =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "";

    throw new ShipmondoApiError(response.status, responseMessage);
  }

  return data as T;
}

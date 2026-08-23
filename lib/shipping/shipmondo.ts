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

    throw new Error(
      `Shipmondo API returnerede ${response.status}.`,
    );
  }

  return data as T;
}
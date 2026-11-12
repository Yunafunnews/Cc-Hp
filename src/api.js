import { createStaticApi } from "./pages-api";
export const isStaticMode = import.meta.env.VITE_STATIC_MODE === "true";
const baseUrl = new URL(import.meta.env.BASE_URL, location.origin).href;
const staticApi = createStaticApi({ baseUrl });
export function shareLink(key, value) {
  const url = new URL(baseUrl);
  url.searchParams.set(key, String(value));
  return url.href;
}
export const downloadHref = (gif) =>
  isStaticMode ? gif.url : `/api/gifs/${gif.id}/download`;
export async function api(path, options = {}) {
  if (isStaticMode) return staticApi(path, options);
  const { body, ...rest } = options;
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: {
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...rest.headers,
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error || "Please try again."), {
      status: response.status,
    });
  return result;
}

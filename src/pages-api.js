// GitHub Pages has no application server. This adapter exposes only public demo media.
export const galleryOnlyMessage =
  "You are viewing the public gallery. Accounts and uploads will be available when the community opens.";
const failure = (status, message) =>
  Object.assign(new Error(message), { status });
export function createStaticApi({ baseUrl, fetcher = fetch }) {
  let manifest;
  async function gallery() {
    manifest ??= fetcher(new URL("gifs/manifest.json", baseUrl))
      .then(async (response) => {
        if (!response.ok)
          throw failure(
            response.status,
            "The gallery could not be loaded. Please try again.",
          );
        const data = await response.json();
        return data.map((g, i) => ({
          ...g,
          id: i + 1,
          username: "cc&hp Studio",
          userId: 0,
          status: "approved",
          likes: 0,
          downloads: 0,
          liked: false,
          saved: false,
          tags: g.tags.split(",").filter(Boolean),
          url: new URL(`gifs/${g.filename}`, baseUrl).href,
        }));
      })
      .catch((error) => {
        manifest = undefined;
        throw error;
      });
    return manifest;
  }
  return async (path, options = {}) => {
    if (options.method && options.method !== "GET")
      throw failure(503, galleryOnlyMessage);
    const url = new URL(path, "https://local.invalid");
    if (url.pathname === "/me") return { user: null };
    if (url.pathname === "/health") return { ok: true, mode: "static" };
    if (url.pathname === "/gifs") {
      if (url.searchParams.get("saved") === "1")
        throw failure(503, galleryOnlyMessage);
      let gifs = await gallery();
      const q = (url.searchParams.get("q") || "").toLocaleLowerCase().trim(),
        category = url.searchParams.get("category");
      if (q)
        gifs = gifs.filter((g) =>
          `${g.title} ${g.tags.join(" ")}`.toLocaleLowerCase().includes(q),
        );
      if (category && category !== "all")
        gifs = gifs.filter((g) => g.category === category);
      if (url.searchParams.get("sort") === "newest") gifs = [...gifs].reverse();
      return { gifs };
    }
    const detail = url.pathname.match(/^\/gifs\/(\d+)$/);
    if (detail) {
      const gif = (await gallery()).find((g) => g.id === Number(detail[1]));
      if (!gif) throw failure(404, "This loop could not be found.");
      return { gif, comments: [] };
    }
    if (url.pathname === "/stats")
      return { gifs: (await gallery()).length, members: 0, downloads: 0 };
    throw failure(503, galleryOnlyMessage);
  };
}

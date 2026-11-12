import { useCallback, useEffect, useRef, useState } from "react";
import {
  PawPrint,
  Compass,
  Flame,
  Bookmark,
  Sparkles,
  UserPlus,
  Images,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Search,
  Globe,
  Settings,
  ChevronDown,
  Heart,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Check,
  Cat,
  Dog,
  Leaf,
  Smile,
  Moon,
  Dribbble,
  Infinity as Loop,
  SlidersHorizontal,
  Flower2,
} from "lucide-react";
import { api, isStaticMode } from "./api";
import {
  LocaleContext,
  languages,
  translator,
  normalizeLocale,
  localeDirection,
} from "./i18n";
import Gallery from "./components/Gallery";
import AdminConsole from "./components/AdminConsole";
import Modal from "./components/Modal";
import Auth from "./components/Auth";
import Upload, { cats } from "./components/Upload";
import GifDetail from "./components/GifDetail";
import Dashboard, { RankCard } from "./components/Dashboard";

const categoryIcons = {
  cats: Cat,
  dogs: Dog,
  "tiny-friends": Leaf,
  reactions: Smile,
  sleepy: Moon,
  playtime: Dribbble,
};
const routeFromHash = () => {
  const v =
    location.hash.slice(1) ||
    (location.pathname.replace(/\/+$/, "").endsWith("/admin") ? "admin" : "");
  return [
    "explore",
    "trending",
    "saved",
    "collections",
    "story",
    "growth",
    "invites",
    "uploads",
    "settings",
    "moderation",
    "admin",
  ].includes(v)
    ? v
    : "explore";
};
export default function App() {
  const [locale, setLocale] = useState(() =>
      normalizeLocale(
        localStorage.getItem("cc-hp-locale") ||
          localStorage.getItem("pawloop-locale"),
      ),
    ),
    [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [page, setPage] = useState(routeFromHash),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(null),
    [gifs, setGifs] = useState([]),
    [featured, setFeatured] = useState([]),
    [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [refresh, setRefresh] = useState(0);
  const t = translator(locale),
    galleryRef = useRef(null),
    timer = useRef(null);
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3500);
  }, []);
  useEffect(() => {
    const handler = () => setPage(routeFromHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    localStorage.setItem("cc-hp-locale", locale);
    document.documentElement.dir = localeDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    api("/me")
      .then((r) => setUser(r.user))
      .catch((e) => notify(e.message))
      .finally(() => setAuthReady(true));
    api("/gifs")
      .then((r) => {
        setFeatured(r.gifs.slice(0, 8));
      })
      .catch(() => {});
    const sharedId = new URLSearchParams(location.search).get("gif");
    if (sharedId && /^\d+$/.test(sharedId)) {
      api(`/gifs/${sharedId}`)
        .then((r) => setModal({ type: "gif", gif: r.gif }))
        .catch((e) => notify(e.message));
    }
  }, [notify]);
  useEffect(() => {
    if (
      new URLSearchParams(location.search).get("invite") &&
      authReady &&
      !user
    )
      setModal({ type: "auth", mode: "register" });
  }, [authReady]);
  useEffect(() => {
    const id = setTimeout(() => setSearch(query), 200);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    if (page === "saved" && !user) {
      setGifs([]);
      setLoading(false);
      return;
    }
    const p = new URLSearchParams({
      q: search,
      category,
      sort: page === "trending" ? "popular" : sort,
    });
    if (page === "saved") p.set("saved", "1");
    api(`/gifs?${p}`)
      .then((r) => {
        if (live) setGifs(r.gifs);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [category, search, sort, page, user?.id, refresh]);
  const navigate = useCallback((next) => {
    setPage(next);
    location.hash = next;
    setMobile(false);
    setQuery("");
    setCategory("all");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const closeModal = useCallback(() => setModal(null), []);
  const askAuth = () => setModal({ type: "auth", mode: "register" });
  const openUpload = () =>
    setModal(user ? { type: "upload" } : { type: "auth", mode: "register" });
  function protectedNav(next) {
    if (!user) {
      askAuth();
      return;
    }
    navigate(next);
  }
  function updateGif(g) {
    setGifs((old) =>
      page === "saved" && !g.saved
        ? old.filter((x) => x.id !== g.id)
        : old.map((x) => (x.id === g.id ? g : x)),
    );
  }
  async function action(g, type) {
    if (!user) {
      askAuth();
      return;
    }
    try {
      const r = await api(`/gifs/${g.id}/${type}`, { method: "POST" });
      updateGif(r.gif);
      if (page === "saved" && type === "save") setRefresh((x) => x + 1);
    } catch (e) {
      notify(e.message);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("explore");
    } catch (e) {
      notify(e.message);
    }
  }
  const isGallery = ["explore", "trending", "saved"].includes(page);
  const navButton = (key, label, Icon, guard = false) => (
    <button
      key={key}
      className={`side-link ${page === key ? "active" : ""}`}
      onClick={() => (guard ? protectedNav(key) : navigate(key))}
    >
      <Icon size={19} />
      <span>{t(label)}</span>
      {key === "trending" && <span className="new-dot" />}
    </button>
  );
  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      <div className="site">
        <header className="topbar">
          <div className="brand-group">
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle menu"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={21} /> : <Menu size={21} />}
            </button>
            <button
              className="brand"
              onClick={() => navigate("explore")}
              aria-label="cc&hp home"
            >
              <span className="brand-icon">
                <PawPrint size={25} strokeWidth={2.7} />
              </span>
              <span>
                cc&amp;hp<span className="brand-period">.</span>
              </span>
            </button>
          </div>
          <nav className="top-nav" aria-label="Main navigation">
            {[
              ["explore", "Explore"],
              ["collections", "Collections"],
              ["story", "Our story"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={page === key ? "active" : ""}
                onClick={() => navigate(key)}
              >
                {t(label)}
              </button>
            ))}
          </nav>
          <div className="top-actions">
            <button
              className="language-button"
              aria-label={t("Settings")}
              onClick={() => navigate("settings")}
            >
              <Globe size={17} />
              <span>
                {locale === "zh-CN"
                  ? "简"
                  : locale === "zh-TW"
                    ? "繁"
                    : locale.toUpperCase()}
              </span>
              <ChevronDown size={12} />
            </button>
            {user ? (
              <button
                className="top-avatar"
                title={user.username}
                onClick={() => navigate("growth")}
              >
                {user.username[0].toUpperCase()}
              </button>
            ) : (
              <button
                className="signin-button"
                onClick={() => setModal({ type: "auth", mode: "login" })}
              >
                {t("Sign in")}
              </button>
            )}
            <button className="button primary upload-top" onClick={openUpload}>
              <Plus size={17} />
              <span>{t("Upload a GIF")}</span>
            </button>
          </div>
        </header>
        <div className="app-layout">
          <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
            <div className="sidebar-content">
              <span className="nav-heading">{t("DISCOVER")}</span>
              <nav>
                {navButton("explore", "For you", Compass)}
                {navButton("trending", "Trending", Flame)}
                {navButton("saved", "My collection", Bookmark, true)}
              </nav>
              <span className="nav-heading second-heading">
                {t("CREATOR SPACE")}
              </span>
              <nav>
                {navButton("growth", "My growth", Sparkles, true)}
                {navButton("invites", "Invite friends", UserPlus, true)}
                {navButton("uploads", "My uploads", Images, true)}
                {user?.role === "admin" &&
                  navButton("admin", "Admin console", ShieldCheck, true)}
              </nav>
              <div className="sidebar-garden">
                <div className="garden-art">
                  <Flower2 size={40} />
                  <Sparkles size={17} />
                  <span>✦</span>
                </div>
                <strong>{t("A little loop. A lot of love.")}</strong>
                <p>{t("Made for pet people, by pet people.")}</p>
                <button onClick={() => navigate("story")}>
                  {t("Our story")}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
            <div className="sidebar-bottom">
              <button
                className={`side-link ${page === "settings" ? "active" : ""}`}
                onClick={() => navigate("settings")}
              >
                <Settings size={18} />
                {t("Settings")}
              </button>
              {user && (
                <button className="side-link" onClick={logout}>
                  <LogOut size={18} />
                  {t("Sign out")}
                </button>
              )}
              <p>© {new Date().getFullYear()} cc&hp</p>
            </div>
          </aside>
          {mobile && (
            <button
              className="mobile-shade"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            />
          )}
          <main className="main-content">
            {isStaticMode && (
              <div className="gallery-notice" role="note">
                <PawPrint size={16} />
                <span>
                  {t(
                    "You are viewing the public gallery. Accounts and uploads will be available when the community opens.",
                  )}
                </span>
              </div>
            )}
            {page === "explore" && (
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <span className="orange-dot" />
                    {t("SMALL MOMENTS. INFINITE REPLAYS.")}
                  </span>
                  <h1>
                    <span>{t("Little loops.")}</span>
                    <em>{t("Big happiness.")}</em>
                  </h1>
                  <p>
                    {t(
                      "Your daily dose of paws, play, and personality. Find a GIF that says it better.",
                    )}
                  </p>
                  <div className="hero-actions">
                    <button
                      className="button dark"
                      onClick={() =>
                        galleryRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                    >
                      {t("Explore the loops")}
                      <ArrowRight size={16} />
                    </button>
                    <button className="hero-share" onClick={openUpload}>
                      {t("Share a little joy")}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="hero-footnote">
                    <span className="overlapping-paws">
                      <span>
                        <Cat size={13} />
                      </span>
                      <span>
                        <Dog size={13} />
                      </span>
                      <span>
                        <PawPrint size={13} />
                      </span>
                    </span>
                    <span>
                      {t("100% pet-approved")}
                      <Heart size={12} />
                    </span>
                  </div>
                </div>
                <div
                  className="hero-art"
                  aria-label={t("A home for your pet’s little moments.")}
                >
                  <span className="art-star star-one">✳</span>
                  <span className="art-star star-two">✧</span>
                  <span className="art-orbit" />
                  <div className="polaroid polaroid-back">
                    {featured[1] && (
                      <img src={featured[1].url} alt={featured[1].title} />
                    )}
                    <span>tiny paws, big personality ♡</span>
                  </div>
                  <div className="polaroid polaroid-front">
                    {featured[0] && (
                      <img src={featured[0].url} alt={featured[0].title} />
                    )}
                    <span>just one more replay.</span>
                  </div>
                  <div className="hero-sticker">
                    <Loop size={21} />
                    <span>{t("ON REPEAT, ALWAYS")}</span>
                  </div>
                  <div className="floating-paw">
                    <PawPrint size={30} />
                  </div>
                  <span className="art-doodle">♡</span>
                </div>
              </section>
            )}
            {isGallery && (
              <div className="discovery-layout">
                <section className="gallery-section" ref={galleryRef}>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow section-eyebrow">
                        {page === "saved"
                          ? "YOUR HAPPY LITTLE ARCHIVE"
                          : page === "trending"
                            ? "THE PACK’S CURRENT FAVORITES"
                            : null}
                      </span>
                      <h2>
                        {t(
                          page === "saved"
                            ? "Your saved little moments"
                            : page === "trending"
                              ? "Trending"
                              : "Find your kind of happy",
                        )}
                      </h2>
                      <p>
                        {t(
                          page === "saved"
                            ? "The ones you’ll come back to, again and again."
                            : "A tiny escape. An endless supply of good vibes.",
                        )}
                      </p>
                    </div>
                    <span className="section-sparkle">✧</span>
                  </div>
                  <div className="search-box">
                    <Search size={19} />
                    <input
                      aria-label={t("Search for a little happiness...")}
                      placeholder={t("Search for a little happiness...")}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                    <span className="search-shortcut">
                      <SlidersHorizontal size={15} />
                    </span>
                  </div>
                  <div className="category-chips">
                    <button
                      className={category === "all" ? "active" : ""}
                      onClick={() => setCategory("all")}
                    >
                      <PawPrint size={14} />
                      {t("All loops")}
                    </button>
                    {cats.map(([key, label]) => {
                      const Icon = categoryIcons[key];
                      return (
                        <button
                          key={key}
                          className={category === key ? "active" : ""}
                          onClick={() => setCategory(key)}
                        >
                          <Icon size={14} />
                          {t(label)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="gallery-toolbar">
                    <span>
                      {gifs.length} {t("loops to love")}
                      <span className="tiny-spark">✦</span>
                    </span>
                    <label>
                      <span className="sr-only">Sort loops</span>
                      <select
                        value={page === "trending" ? "popular" : sort}
                        onChange={(e) => {
                          setSort(e.target.value);
                          if (page === "trending") navigate("explore");
                        }}
                      >
                        <option value="featured">{t("Featured")}</option>
                        <option value="newest">{t("Newest")}</option>
                        <option value="popular">{t("Most loved")}</option>
                      </select>
                    </label>
                  </div>
                  {page === "saved" && !user ? (
                    <div className="empty-state">
                      <Bookmark size={36} />
                      <h3>{t("Make room for your favorites.")}</h3>
                      <button className="button primary" onClick={askAuth}>
                        {t("Join the pack")}
                      </button>
                    </div>
                  ) : (
                    <Gallery
                      gifs={gifs}
                      loading={loading}
                      error={error}
                      onRetry={() => setRefresh((x) => x + 1)}
                      onOpen={(gif) => setModal({ type: "gif", gif })}
                      onAction={action}
                      onClear={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                      emptySaved={page === "saved"}
                    />
                  )}
                </section>
                <aside className="right-rail">
                  {user ? (
                    <div className="member-card">
                      <span className="eyebrow">
                        {t("Your next little milestone")}
                      </span>
                      <RankCard user={user} compact />
                      <button
                        className="button secondary full"
                        onClick={() => navigate("growth")}
                      >
                        {t("View my growth")}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="join-card">
                      <div className="join-illustration">
                        <span className="join-paw">
                          <PawPrint size={32} />
                        </span>
                        <span className="join-star">✧</span>
                        <span className="join-heart">♡</span>
                      </div>
                      <span className="eyebrow">
                        {t("GOOD THINGS GROW HERE")}
                      </span>
                      <h3>{t("Little paws. Big community.")}</h3>
                      <p>
                        {t(
                          "Make a home for your favorites. Share your pet’s personality. Grow with every little contribution.",
                        )}
                      </p>
                      <button className="button primary full" onClick={askAuth}>
                        {t("Join the pack")}
                        <ArrowUpRight size={16} />
                      </button>
                      <small>{t("Free to explore. Better together.")}</small>
                    </div>
                  )}
                  <div className="kind-card">
                    <span className="eyebrow">{t("THE CC&HP WAY")}</span>
                    <Heart size={25} strokeWidth={1.5} />
                    <h3>{t("A little kindness goes a long way.")}</h3>
                    <p>{t("Be kind. Share joy. Give credit.")}</p>
                  </div>
                  <div className="reaction-note">
                    <span>↗</span>
                    <h4>{t("Find a loop. Send a smile.")}</h4>
                    <p>
                      {t("Download your favorites and make someone’s day.")}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCategory("reactions");
                        galleryRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    >
                      {t("Browse reactions")}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </aside>
              </div>
            )}
            {["growth", "invites", "uploads"].includes(page) &&
              (user ? (
                <Dashboard
                  key={`${user.id}:${refresh}`}
                  user={user}
                  tab={page}
                  onTab={navigate}
                  onUser={setUser}
                  onUpload={openUpload}
                  notify={notify}
                />
              ) : (
                <GuestPage t={t} onJoin={askAuth} />
              ))}
            {page === "settings" && (
              <div className="settings-page">
                <header className="page-heading">
                  <span className="eyebrow">YOUR CC&amp;HP, YOUR WAY</span>
                  <h1>{t("Settings")}</h1>
                  <p>{t("Make yourself at home.")}</p>
                </header>
                <section className="panel settings-panel">
                  <div className="setting-icon">
                    <Globe size={25} />
                  </div>
                  <div>
                    <h2>{t("Language")}</h2>
                    <p>{t("Choose how cc&hp speaks to you.")}</p>
                    <label className="sr-only" htmlFor="language">
                      {t("Language")}
                    </label>
                    <select
                      id="language"
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
                    >
                      {languages.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <p className="small muted">
                      {t(
                        "More languages will join the pack. User posts stay in their original language.",
                      )}{" "}
                      {t("Some secondary text may appear in English.")}
                    </p>
                  </div>
                </section>
                <section className="panel settings-panel">
                  <div className="setting-icon">
                    <PawPrint size={25} />
                  </div>
                  <div>
                    <h2>{t("Account")}</h2>
                    {user ? (
                      <>
                        <h3>{user.username}</h3>
                        <p>{user.email}</p>
                        <button className="button secondary" onClick={logout}>
                          <LogOut size={16} />
                          {t("Sign out")}
                        </button>
                      </>
                    ) : (
                      <>
                        <p>{t("You’re exploring as a guest.")}</p>
                        <button className="button primary" onClick={askAuth}>
                          {t("Join the pack")}
                        </button>
                      </>
                    )}
                  </div>
                </section>
              </div>
            )}
            {page === "collections" && (
              <>
                <header className="page-heading">
                  <span className="eyebrow">LITTLE POCKETS OF HAPPINESS</span>
                  <h1>{t("A collection for every mood")}</h1>
                  <p>{t("Curated little corners of the internet.")}</p>
                </header>
                <div className="collection-grid">
                  {cats.map(([key, label], i) => {
                    const Icon = categoryIcons[key];
                    const cover =
                      featured.find((g) => g.category === key) ||
                      featured[i % Math.max(featured.length, 1)];
                    return (
                      <button
                        key={key}
                        className={`collection-card collection-${i}`}
                        onClick={() => {
                          navigate("explore");
                          setCategory(key);
                          setTimeout(
                            () =>
                              galleryRef.current?.scrollIntoView({
                                behavior: "smooth",
                              }),
                            50,
                          );
                        }}
                      >
                        <div className="collection-cover">
                          {cover && <img src={cover.url} alt={t(label)} />}
                          <span>
                            <Icon size={28} />
                          </span>
                        </div>
                        <div className="collection-name">
                          <h2>{t(label)}</h2>
                          <ArrowUpRight size={22} />
                        </div>
                        <p>{t("Explore collection")}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {page === "story" && (
              <div className="story-page">
                <span className="story-paw">
                  <PawPrint size={60} />
                </span>
                <span className="eyebrow">OUR LITTLE STORY</span>
                <h1>{t("It started with a pet. And a very small moment.")}</h1>
                <p>
                  {t(
                    "cc&hp is a home for the things our pets do that deserve to be watched more than once. The silly stretches. The sleepy blinks. The unexpected zoomies.",
                  )}
                </p>
                <div className="story-strip">
                  {featured.slice(0, 3).map((g) => (
                    <img key={g.id} src={g.url} alt={g.title} />
                  ))}
                </div>
                <h2>{t("A little loop. A lot of love.")}</h2>
                <p>
                  {t(
                    "We’re building a kind little corner where anyone can collect a smile, share a GIF, and make someone’s day a little brighter.",
                  )}
                </p>
                <div className="demo-disclosure">
                  {t(
                    "This gallery currently uses attributed demo GIFs. Your own pet can be the next star.",
                  )}
                </div>
                <button className="button primary" onClick={openUpload}>
                  {t("Share a little joy")}
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
            {["admin", "moderation"].includes(page) &&
              (user?.role === "admin" ? (
                <AdminConsole
                  user={user}
                  notify={notify}
                  initialTab={page === "moderation" ? "gifs" : "overview"}
                />
              ) : (
                <GuestPage t={t} onJoin={askAuth} />
              ))}
            <footer className="footer">
              <span>
                <PawPrint size={14} />
                {t("Made with paws & a little love.")}
              </span>
              <span>
                {t("Keep the loops kind.")}
                <Heart size={12} />
              </span>
            </footer>
          </main>
        </div>
        {modal && (
          <Modal
            onClose={closeModal}
            wide={modal.type === "gif"}
            label={
              modal.type === "gif"
                ? modal.gif.title
                : t(modal.type === "auth" ? "Account" : "Upload a GIF")
            }
          >
            {modal.type === "auth" && isStaticMode ? (
              <div className="success-panel">
                <PawPrint size={42} />
                <h2>{t("Share a little joy")}</h2>
                <p>
                  {t(
                    "You are viewing the public gallery. Accounts and uploads will be available when the community opens.",
                  )}
                </p>
                <button className="button primary" onClick={closeModal}>
                  {t("Explore the loops")}
                </button>
              </div>
            ) : modal.type === "auth" ? (
              <Auth
                initialMode={modal.mode}
                onSuccess={(u) => {
                  setUser(u);
                  setModal(null);
                  setRefresh((x) => x + 1);
                }}
              />
            ) : modal.type === "upload" ? (
              <Upload
                onDone={() => {
                  setModal(null);
                  setRefresh((x) => x + 1);
                  navigate("uploads");
                }}
              />
            ) : (
              <GifDetail
                initial={modal.gif}
                user={user}
                onAuth={askAuth}
                onChange={updateGif}
                notify={notify}
              />
            )}
          </Modal>
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
          </div>
        )}
      </div>
    </LocaleContext.Provider>
  );
}
function GuestPage({ t, onJoin }) {
  return (
    <div className="empty-state guest-page">
      <PawPrint size={48} />
      <h1>{t("Welcome to your happy place")}</h1>
      <p>{t("Free to explore. Better together.")}</p>
      <button className="button primary" onClick={onJoin}>
        {t("Join the pack")}
      </button>
    </div>
  );
}

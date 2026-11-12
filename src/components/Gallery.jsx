import {
  Heart,
  Bookmark,
  ArrowDownToLine,
  Image,
  ArrowUpRight,
} from "lucide-react";
import { useLocale } from "../i18n";
import { downloadHref } from "../api";
export function GifCard({ gif, onOpen, onAction, index = 0 }) {
  const { t } = useLocale();
  return (
    <article
      className="gif-card"
      style={{ "--card-delay": `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="gif-picture">
        <button
          className="gif-open"
          onClick={() => onOpen(gif)}
          aria-label={`${gif.title} — ${t("Explore")}`}
        >
          <img
            src={gif.url}
            alt={gif.title}
            loading={index < 4 ? "eager" : "lazy"}
            style={{ aspectRatio: `${gif.width}/${gif.height}` }}
          />
          <span className="gif-label">GIF</span>
        </button>
        <button
          className={`icon-button save-button ${gif.saved ? "is-active" : ""}`}
          title={t(gif.saved ? "Saved" : "Save")}
          aria-label={`${t(gif.saved ? "Saved" : "Save")} ${gif.title}`}
          aria-pressed={gif.saved}
          onClick={() => onAction(gif, "save")}
        >
          <Bookmark size={17} fill={gif.saved ? "currentColor" : "none"} />
        </button>
        <a
          className="card-download icon-button"
          href={downloadHref(gif)}
          download={`${gif.title}.gif`}
          title={t("Download GIF")}
          aria-label={`${t("Download GIF")} ${gif.title}`}
        >
          <ArrowDownToLine size={17} />
        </a>
      </div>
      <div className="gif-caption">
        <button onClick={() => onOpen(gif)}>{gif.title}</button>
        <button
          className={`heart-button ${gif.liked ? "is-active" : ""}`}
          onClick={() => onAction(gif, "like")}
          aria-label={`${t("Like")} ${gif.title}`}
          aria-pressed={gif.liked}
        >
          <Heart size={14} fill={gif.liked ? "currentColor" : "none"} />
          {gif.likes}
        </button>
      </div>
      <div className="gif-meta">
        <span className="tiny-avatar">{gif.username[0]}</span>
        <span>{gif.username}</span>
        {gif.source && (
          <span className="demo-dot" title={t("Demo content")}>
            ✧
          </span>
        )}
      </div>
    </article>
  );
}
export default function Gallery({
  gifs,
  onOpen,
  onAction,
  loading,
  error,
  onRetry,
  onClear,
  emptySaved = false,
}) {
  const { t } = useLocale();
  if (loading)
    return (
      <div className="gallery-loading" role="status">
        <div className="loading-paw">✧</div>
        {t("Loading your little moments...")}
      </div>
    );
  if (error)
    return (
      <div className="empty-state">
        <Image size={32} />
        <h3>{error}</h3>
        <button className="button secondary" onClick={onRetry}>
          {t("Try again")}
        </button>
      </div>
    );
  if (!gifs.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <Bookmark size={28} />
        </span>
        <h3>
          {t(emptySaved ? "Make room for your favorites." : "No loops found")}
        </h3>
        <p>
          {t(
            emptySaved
              ? "Save a loop with the bookmark button. You’ll find it here."
              : "Try another search, or be the first to share a little joy.",
          )}
        </p>
        {!emptySaved && (
          <button className="button secondary" onClick={onClear}>
            {t("Clear filters")}
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>
    );
  return (
    <div className="masonry">
      {gifs.map((g, i) => (
        <GifCard
          key={g.id}
          gif={g}
          onOpen={onOpen}
          onAction={onAction}
          index={i}
        />
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Bookmark,
  Heart,
  Link,
  Flag,
  Send,
  MessageCircle,
} from "lucide-react";
import { useLocale } from "../i18n";
import { api, downloadHref, shareLink } from "../api";
export default function GifDetail({ initial, user, onAuth, onChange, notify }) {
  const { t } = useLocale();
  const [gif, setGif] = useState(initial),
    [comments, setComments] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api(`/gifs/${initial.id}`)
      .then((r) => {
        setGif(r.gif);
        setComments(r.comments);
      })
      .catch((e) => setError(e.message));
  }, [initial.id]);
  async function action(type) {
    if (!user) {
      onAuth();
      return;
    }
    try {
      const r = await api(`/gifs/${gif.id}/${type}`, { method: "POST" });
      setGif(r.gif);
      onChange(r.gif);
    } catch (e) {
      setError(e.message);
    }
  }
  async function post(e) {
    e.preventDefault();
    if (!user) {
      onAuth();
      return;
    }
    setBusy(true);
    try {
      await api(`/gifs/${gif.id}/comments`, {
        method: "POST",
        body: { text: message },
      });
      setMessage("");
      const r = await api(`/gifs/${gif.id}`);
      setComments(r.comments);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="detail-content">
      <div className="detail-media">
        <img src={gif.url} alt={gif.title} />
        <span className="gif-label">GIF</span>
      </div>
      <div className="detail-info">
        <span className="eyebrow">A LITTLE MOMENT, ON REPEAT</span>
        <h2>{gif.title}</h2>
        <p className="detail-author">
          <span className="avatar">{gif.username[0]}</span>
          {gif.username}
          <span className="muted">
            · {gif.downloads} {t("downloads")}
          </span>
        </p>
        <div className="tags">
          {gif.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <a
          className="button primary full"
          href={downloadHref(gif)}
          download={`${gif.title}.gif`}
        >
          <ArrowDownToLine size={18} />
          {t("Download GIF")}
          <small>{(gif.size / 1024 / 1024).toFixed(1)} MB</small>
        </a>
        <div className="detail-actions">
          <button
            className={`button secondary ${gif.liked ? "is-active" : ""}`}
            onClick={() => action("like")}
          >
            <Heart size={17} fill={gif.liked ? "currentColor" : "none"} />
            {gif.likes}
          </button>
          <button
            className={`button secondary ${gif.saved ? "is-active" : ""}`}
            onClick={() => action("save")}
          >
            <Bookmark size={17} fill={gif.saved ? "currentColor" : "none"} />
            {t(gif.saved ? "Saved" : "Save")}
          </button>
          <button
            className="icon-button"
            title={t("Copy link")}
            aria-label={t("Copy link")}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareLink("gif", gif.id));
                notify(t("Link copied!"));
              } catch {
                setError("Please copy the URL from your address bar.");
              }
            }}
          >
            <Link size={18} />
          </button>
        </div>
        {gif.source && (
          <p className="source-note">
            {t("Demo content")} ·{" "}
            <a href={gif.source} target="_blank" rel="noreferrer">
              {t("Source")} ↗
            </a>
          </p>
        )}
        <div className="comments-title">
          <MessageCircle size={17} />
          <h3>{t("Comments")}</h3>
          <span>{comments.length}</span>
        </div>
        <form className="comment-form" onSubmit={post}>
          <input
            aria-label={t("Leave a little kindness...")}
            placeholder={t("Leave a little kindness...")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            required
          />
          <button
            className="icon-button"
            aria-label={t("Post")}
            disabled={busy}
          >
            <Send size={18} />
          </button>
        </form>
        <div className="comment-list">
          {comments.length ? (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <span className="tiny-avatar">{c.username[0]}</span>
                <div>
                  <strong>{c.username}</strong>
                  <p>{c.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted small">
              {t("No comments yet. Start a little conversation.")}
            </p>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="text-button report-button"
          onClick={async () => {
            if (!user) {
              onAuth();
              return;
            }
            try {
              await api(`/gifs/${gif.id}/report`, { method: "POST" });
              notify(t("This loop has been reported for review."));
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Flag size={12} />
          {t("Report")}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { UploadCloud, CheckCircle2, ArrowRight, FileImage } from "lucide-react";
import { useLocale } from "../i18n";
import { api } from "../api";
export const cats = [
  ["cats", "Cats"],
  ["dogs", "Dogs"],
  ["tiny-friends", "Tiny friends"],
  ["reactions", "Reactions"],
  ["sleepy", "Sleepy"],
  ["playtime", "Playtime"],
];
export default function Upload({ onDone }) {
  const { t } = useLocale();
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(f) {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      setError("GIF must be smaller than 15 MB.");
      return;
    }
    if (!/\.gif$/i.test(f.name)) {
      setError("Please choose a GIF file.");
      return;
    }
    setError("");
    setFile(f);
  }
  async function submit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a GIF file.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const data = new FormData(e.currentTarget);
      data.set("file", file);
      await api("/gifs", { method: "POST", body: data });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="success-panel">
        <CheckCircle2 size={54} />
        <h2>{t("Your loop is waiting for a little check.")}</h2>
        <p>
          {t(
            "Thanks for sharing a little joy. You can follow its progress in My uploads.",
          )}
        </p>
        <button className="button primary" onClick={onDone}>
          {t("View my uploads")}
          <ArrowRight size={17} />
        </button>
      </div>
    );
  return (
    <div className="upload-content">
      <span className="eyebrow">A MOMENT WORTH LOOPING</span>
      <h2>{t("Share your pet’s personality")}</h2>
      <p className="muted">{t("Little moments deserve a little spotlight.")}</p>
      <form onSubmit={submit}>
        <label
          className={`dropzone ${file ? "has-file" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
        >
          {file ? (
            <>
              <img src={preview} alt="Upload preview" />
              <span>
                <FileImage size={16} />
                {file.name}
              </span>
            </>
          ) : (
            <>
              <UploadCloud size={32} />
              <strong>{t("Drop your GIF here")}</strong>
              <span>{t("or choose a file")}</span>
              <small>{t("GIF only · Up to 15 MB")}</small>
            </>
          )}
          <input
            aria-label={t("GIF file")}
            type="file"
            accept="image/gif,.gif"
            onChange={(e) => choose(e.target.files[0])}
          />
        </label>
        <label>
          {t("Title")}
          <input
            name="title"
            placeholder={t("Give this moment a name")}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <div className="form-row">
          <label>
            {t("Category")}
            <select name="category">
              {cats.map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Tags")}
            <input
              name="tags"
              maxLength={200}
              placeholder={t("happy, sleepy, weekend...")}
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" required />
          {t("I own this GIF or have permission to share it.")}
        </label>
        <p className="reward-note">
          ✧{" "}
          {t("Approved loops earn 25 XP. Your first one earns an extra 30 XP.")}
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {t(busy ? "Working on it..." : "Submit for review")}
          <ArrowRight size={17} />
        </button>
      </form>
    </div>
  );
}

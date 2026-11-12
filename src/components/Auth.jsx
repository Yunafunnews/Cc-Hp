import { useState } from "react";
import { PawPrint, ArrowRight } from "lucide-react";
import { useLocale } from "../i18n";
import { api } from "../api";
export default function Auth({ initialMode = "register", onSuccess }) {
  const { t } = useLocale();
  const [mode, setMode] = useState(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const invite = new URLSearchParams(location.search).get("invite") || "";
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = Object.fromEntries(new FormData(e.currentTarget));
      const data = await api(`/auth/${mode}`, { method: "POST", body: form });
      onSuccess(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-content">
      <div className="big-paw">
        <PawPrint size={29} />
      </div>
      <span className="eyebrow">WELCOME TO CC&HP</span>
      <h2>
        {t(mode === "register" ? "Welcome to your happy place" : "Sign in")}
      </h2>
      <p className="muted">
        {t(
          mode === "register"
            ? "A few details, a whole lot of joy."
            : "Welcome back. Your favorite loops missed you.",
        )}
      </p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <label>
            {t("Display name")}
            <input
              name="username"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={30}
            />
          </label>
        )}
        <label>
          {t("Email")}
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          {t("Password")}
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "register" ? 10 : 1}
            maxLength={128}
            placeholder={mode === "register" ? t("At least 10 characters") : ""}
          />
        </label>
        {mode === "register" && (
          <label>
            {t("Invitation code (optional)")}
            <input
              name="invite"
              defaultValue={invite}
              autoCapitalize="characters"
              maxLength={24}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {t(
            busy
              ? "Working on it..."
              : mode === "register"
                ? "Create account"
                : "Sign in",
          )}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">
        {t(
          mode === "register"
            ? "Already part of the pack?"
            : "New around here?",
        )}{" "}
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
          }}
        >
          {t(mode === "register" ? "Sign in" : "Create account")}
        </button>
      </p>
    </div>
  );
}

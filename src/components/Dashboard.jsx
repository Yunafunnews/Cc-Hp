import { useEffect, useRef, useState } from "react";
import {
  PawPrint,
  Sprout,
  Heart,
  Star,
  Crown,
  ArrowRight,
  Check,
  Copy,
  Gift,
  UploadCloud,
  Sun,
  UserPlus,
  Image,
  Clock,
} from "lucide-react";
import { api, shareLink } from "../api";
import { useLocale } from "../i18n";
export const badgeIcons = {
  paw: PawPrint,
  sprout: Sprout,
  heart: Heart,
  star: Star,
  crown: Crown,
};
export function RankCard({ user, compact = false }) {
  const { t } = useLocale(),
    Badge = badgeIcons[user.rank.badge];
  const progress = user.nextRank
    ? Math.min(
        100,
        ((user.points - user.rank.min) / (user.nextRank.min - user.rank.min)) *
          100,
      )
    : 100;
  return (
    <div className={`rank-card ${compact ? "compact" : ""}`}>
      <div className="rank-card-top">
        <span className="rank-icon">
          <Badge size={compact ? 24 : 34} />
        </span>
        <div>
          <span className="eyebrow">LEVEL {user.rank.level}</span>
          <h3>{t(user.rank.title)}</h3>
        </div>
        <strong>{user.points} XP</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="rank-bottom">
        <span>{t(user.nextRank ? "NEXT LEVEL" : "MAX LEVEL")}</span>
        <span>
          {user.nextRank ? `${user.points} / ${user.nextRank.min} XP` : "✦"}
        </span>
      </div>
    </div>
  );
}
export default function Dashboard({
  user,
  tab,
  onTab,
  onUser,
  onUpload,
  notify,
}) {
  const { t } = useLocale(),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const load = (version = generation.current) =>
    api("/dashboard")
      .then((r) => {
        if (version !== generation.current) return;
        setData(r);
        onUser(r.user);
      })
      .catch((e) => {
        if (version === generation.current) setError(e.message);
      });
  useEffect(() => {
    const version = ++generation.current;
    load(version);
    return () => {
      generation.current++;
    };
  }, []);
  async function checkin() {
    const version = generation.current;
    setBusy(true);
    try {
      const r = await api("/tasks/checkin", { method: "POST" });
      if (version !== generation.current) return;
      onUser(r.user);
      await load(version);
      if (version === generation.current) notify("+10 XP ✧");
    } catch (e) {
      if (version === generation.current) setError(e.message);
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareLink("invite", user.inviteCode));
      notify(t("Link copied!"));
    } catch {
      setError("Please copy the invitation link from the field.");
    }
  }
  if (!data)
    return (
      <div className="empty-state">
        {error || t("Loading your little moments...")}
      </div>
    );
  const reason = {
    welcome: "Welcome bonus",
    checkin: "Daily check-in",
    upload: "Approved upload",
    "first-upload": "First upload bonus",
    invite: "Invitation reward",
  };
  return (
    <div className="dashboard">
      <header className="page-heading">
        <span className="eyebrow">{t("YOUR LITTLE CORNER")}</span>
        <h1>
          {t(
            tab === "invites"
              ? "A little joy is better shared."
              : tab === "uploads"
                ? "My uploads"
                : "Every little contribution counts.",
          )}
        </h1>
        <p>
          {t(
            tab === "invites"
              ? "Invite a friend. Grow together."
              : tab === "uploads"
                ? "Your pet’s next moment belongs here."
                : "Collect moments. Earn your stripes.",
          )}
        </p>
      </header>
      <div className="dashboard-tabs">
        {[
          ["growth", "My growth"],
          ["invites", "Invite friends"],
          ["uploads", "My uploads"],
        ].map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => onTab(k)}
          >
            {t(v)}
          </button>
        ))}
      </div>
      {tab === "growth" && (
        <>
          <RankCard user={user} />
          <section className="panel">
            <h2>{t("Daily tasks")}</h2>
            <div className="task">
              <span className="task-icon yellow">
                <Sun size={23} />
              </span>
              <div>
                <h3>
                  {t("Daily check-in")}
                  <span className="xp">+10 XP</span>
                </h3>
                <p>{t("A little hello, every day. Resets at 00:00 UTC.")}</p>
              </div>
              <button
                className={`button ${data.checkedIn ? "subtle" : "secondary"}`}
                disabled={data.checkedIn || busy}
                onClick={checkin}
              >
                {data.checkedIn ? (
                  <>
                    <Check size={15} />
                    {t("Done for today")}
                  </>
                ) : (
                  t("Check in")
                )}
              </button>
            </div>
            <div className="task">
              <span className="task-icon peach">
                <UploadCloud size={23} />
              </span>
              <div>
                <h3>
                  {t("First approved GIF")}
                  <span className="xp">+55 XP</span>
                </h3>
                <p>{t("Share your first loop with the pack.")}</p>
              </div>
              <button
                className="button secondary"
                disabled={data.firstUpload}
                onClick={onUpload}
              >
                {t(data.firstUpload ? "Completed" : "Upload")}
              </button>
            </div>
            <div className="task">
              <span className="task-icon green">
                <UserPlus size={23} />
              </span>
              <div>
                <h3>
                  {t("Invite your first friend")}
                  <span className="xp">+50 XP</span>
                </h3>
                <p>{t("50 XP when their first GIF is approved.")}</p>
              </div>
              <button
                className="button secondary"
                onClick={() => onTab("invites")}
              >
                {t("Invite")}
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
          <section className="panel">
            <h2>{t("Your badge shelf")}</h2>
            <div className="badge-shelf">
              {data.levels.map((l) => {
                const Icon = badgeIcons[l.badge],
                  unlocked = user.points >= l.min;
                return (
                  <div
                    key={l.level}
                    className={unlocked ? "badge unlocked" : "badge"}
                  >
                    <span>
                      <Icon size={27} />
                    </span>
                    <strong>{t(l.title)}</strong>
                    <small>{unlocked ? t("Unlocked") : `${l.min} XP`}</small>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel">
            <h2>{t("Point history")}</h2>
            {data.ledger.map((p, i) => (
              <div className="ledger-row" key={i}>
                <span>{t(reason[p.reason] || p.reason)}</span>
                <small>
                  {new Date(p.createdAt + "Z").toLocaleDateString()}
                </small>
                <strong>+{p.amount} XP</strong>
              </div>
            ))}
          </section>
        </>
      )}
      {tab === "invites" && (
        <>
          <div className="invite-hero">
            <div className="gift-icon">
              <Gift size={38} />
            </div>
            <h2>{t("Invite a friend. Grow together.")}</h2>
            <p>
              {t(
                "Share your personal link. When your friend’s first GIF is approved, you earn 50 XP. Up to 10 rewarded invitations per UTC day.",
              )}
            </p>
            <label>
              {t("Your invitation link")}
              <div className="invite-input">
                <input value={shareLink("invite", user.inviteCode)} readOnly />
                <button className="button primary" onClick={copy}>
                  <Copy size={16} />
                  {t("Copy invitation")}
                </button>
              </div>
            </label>
            <p className="invite-code">
              {t("Your code")}: <strong>{user.inviteCode}</strong>
            </p>
          </div>
          <div className="invite-stats">
            <div>
              <UserPlus />
              <strong>{data.invitations.length}</strong>
              <span>{t("Friends invited")}</span>
            </div>
            <div>
              <Star />
              <strong>
                {data.invitations.filter((i) => i.rewarded).length * 50} XP
              </strong>
              <span>{t("Rewards earned")}</span>
            </div>
          </div>
          <section className="panel">
            {data.invitations.length ? (
              data.invitations.map((i, n) => (
                <div className="ledger-row" key={n}>
                  <span>{i.username}</span>
                  <small>
                    {t(
                      i.rewarded
                        ? "Rewarded"
                        : i.rewardStatus === "capped"
                          ? "Daily reward limit reached"
                          : "Waiting for first approved GIF",
                    )}
                  </small>
                  {i.rewarded && <strong>+50 XP</strong>}
                </div>
              ))
            ) : (
              <div className="empty-state small-empty">
                <UserPlus size={25} />
                <p>
                  {t(
                    "No invitations yet. Someone’s happy place starts with you.",
                  )}
                </p>
              </div>
            )}
          </section>
        </>
      )}
      {tab === "uploads" && (
        <section className="panel">
          {data.uploads.length ? (
            <div className="upload-list">
              {data.uploads.map((g) => (
                <div className="upload-row" key={g.id}>
                  <img src={g.url} alt={g.title} />
                  <div>
                    <strong>{g.title}</strong>
                    <small>
                      {g.width} × {g.height} · {(g.size / 1024).toFixed(0)} KB
                    </small>
                  </div>
                  <span className={`status ${g.status}`}>
                    {t(g.status[0].toUpperCase() + g.status.slice(1))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Image size={34} />
              <h3>{t("No uploads yet")}</h3>
              <p>{t("Your pet’s next moment belongs here.")}</p>
              <button className="button primary" onClick={onUpload}>
                {t("Upload a GIF")}
              </button>
            </div>
          )}
        </section>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

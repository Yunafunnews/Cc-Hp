import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Images,
  Users,
  ReceiptText,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Pencil,
  Eye,
  PawPrint,
} from "lucide-react";
import { api } from "../api";
import { useLocale } from "../i18n";
import Modal from "./Modal";
import { cats } from "./Upload";
const reasons = {
  welcome: "Welcome bonus",
  checkin: "Daily check-in",
  upload: "Approved upload",
  "first-upload": "First upload bonus",
  invite: "Invitation reward",
};
const date = (value) =>
  new Date(value.replace(" ", "T") + "Z").toLocaleDateString();
function Status({ gif, t }) {
  return (
    <span className={`status ${gif.status}`}>
      {t(
        gif.reported
          ? "Reported"
          : gif.status[0].toUpperCase() + gif.status.slice(1),
      )}
    </span>
  );
}
function Pager({ page, total, limit, onPage, t }) {
  return (
    <div className="admin-pagination">
      <span>
        {total} {t("records")} · {t("Page")} {page} /{" "}
        {Math.max(1, Math.ceil(total / limit))}
      </span>
      <div>
        <button
          className="button secondary"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label={t("Previous page")}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="button secondary"
          disabled={page * limit >= total}
          onClick={() => onPage(page + 1)}
          aria-label={t("Next page")}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
function PointsTable({ entries, t, member = false }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {!member && <th>{t("Member")}</th>}
            <th>{t("Activity")}</th>
            <th>{t("Points")}</th>
            <th>{t("Date")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((p) => (
            <tr key={p.id}>
              {!member && <td>{p.username}</td>}
              <td>{t(reasons[p.reason] || p.reason)}</td>
              <td>
                <span className="points-amount">+{p.amount} XP</span>
              </td>
              <td className="muted">{date(p.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!entries.length && (
        <div className="admin-empty">{t("No records found")}</div>
      )}
    </div>
  );
}
function EditGif({ gif, onSaved }) {
  const { t } = useLocale(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await api(`/admin/gifs/${gif.id}`, { method: "PATCH", body });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-dialog">
      <span className="eyebrow">CC&HP ADMIN</span>
      <h2>{t("Edit GIF")}</h2>
      <p className="muted">
        {t("Update the details. Review status and points stay unchanged.")}
      </p>
      <img className="admin-edit-preview" src={gif.url} alt={gif.title} />
      <form onSubmit={submit}>
        <label>
          {t("Title")}
          <input
            name="title"
            defaultValue={gif.title}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          {t("Category")}
          <select name="category" defaultValue={gif.category}>
            {cats.map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Tags")}
          <input
            name="tags"
            defaultValue={gif.tags.join(", ")}
            maxLength={200}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {t(busy ? "Working on it..." : "Save changes")}
          <Check size={16} />
        </button>
      </form>
    </div>
  );
}
function MemberDetails({ id }) {
  const { t } = useLocale(),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api(`/admin/users/${id}`)
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id]);
  if (!data)
    return (
      <div className="admin-dialog">
        <p role={error ? "alert" : "status"}>
          {error || t("Loading your little moments...")}
        </p>
      </div>
    );
  return (
    <div className="admin-dialog">
      <span className="eyebrow">{t("Member details")}</span>
      <h2>{data.user.username}</h2>
      <p className="muted">{data.user.email}</p>
      <div className="admin-member-summary">
        <span>
          <PawPrint size={24} />
          {t(data.user.rank.title)}
        </span>
        <strong>{data.user.points} XP</strong>
      </div>
      <dl className="admin-detail-list">
        <div>
          <dt>{t("Role")}</dt>
          <dd>{t(data.user.role === "admin" ? "Administrator" : "Member")}</dd>
        </div>
        <div>
          <dt>{t("Approved GIFs")}</dt>
          <dd>{data.stats.approvedUploads}</dd>
        </div>
        <div>
          <dt>{t("Friends invited")}</dt>
          <dd>{data.stats.invitedCount}</dd>
        </div>
        <div>
          <dt>{t("Your code")}</dt>
          <dd>{data.user.inviteCode}</dd>
        </div>
      </dl>
      <h3>{t("Recent point activity")}</h3>
      <PointsTable entries={data.ledger} t={t} member />
    </div>
  );
}
export default function AdminConsole({
  user,
  notify,
  initialTab = "overview",
}) {
  const { t } = useLocale(),
    [tab, setTab] = useState(initialTab),
    [overview, setOverview] = useState(null),
    [loadedResult, setLoadedResult] = useState(null),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("review"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null),
    [dialog, setDialog] = useState(null);
  const requestKey = JSON.stringify([tab, query, status, page]);
  const result = loadedResult?.key === requestKey ? loadedResult.data : null;
  const close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: "20",
    });
    if (tab === "gifs") params.set("status", status);
    Promise.all([
      api("/admin/overview", { signal: controller.signal }),
      tab === "overview"
        ? Promise.resolve(null)
        : api(`/admin/${tab}?${params}`, { signal: controller.signal }),
    ])
      .then(([summary, data]) => {
        if (live) {
          setOverview(summary);
          if (data && page > Math.max(1, Math.ceil(data.total / data.limit))) {
            setPage(Math.max(1, Math.ceil(data.total / data.limit)));
            return;
          }
          setLoadedResult({ key: requestKey, data });
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [tab, query, status, page, revision]);
  function selectTab(value) {
    if (value === tab) {
      setRevision((n) => n + 1);
    }
    setLoading(true);
    setTab(value);
    setSearch("");
    setQuery("");
    setPage(1);
    setDialog(null);
  }
  async function review(gif, value) {
    setBusy(gif.id);
    setError("");
    try {
      await api(`/admin/gifs/${gif.id}/review`, {
        method: "POST",
        body: { status: value },
      });
      setRevision((n) => n + 1);
      notify(t(value === "approved" ? "Approved" : "Rejected"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  const tabs = [
    ["overview", "Overview", LayoutDashboard],
    ["gifs", "GIF management", Images],
    ["users", "Members", Users],
    ["points", "Points ledger", ReceiptText],
  ];
  const statCards = [
    ["members", "Members"],
    ["gifs", "Total GIFs"],
    ["pending", "Pending review"],
    ["approved", "Approved GIFs"],
    ["reports", "Open reports"],
    ["downloads", "Total downloads"],
  ];
  return (
    <div className="admin-console">
      <header className="page-heading admin-heading">
        <div>
          <span className="eyebrow">CC&HP ADMIN</span>
          <h1>{t("Admin console")}</h1>
          <p>{t("A little care behind every happy loop.")}</p>
        </div>
        <div className="admin-identity">
          <ShieldCheck size={18} />
          <span>
            {user.username}
            <small>{t("Administrator")}</small>
          </span>
        </div>
      </header>
      <nav className="admin-tabs" aria-label={t("Administration")}>
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            aria-pressed={tab === key}
            onClick={() => selectTab(key)}
          >
            <Icon size={17} />
            {t(label)}
          </button>
        ))}
      </nav>
      {error && (
        <div className="form-error" role="alert">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            {t("Try again")}
          </button>
        </div>
      )}
      {tab === "overview" && overview && (
        <>
          <div className="admin-stat-grid">
            {statCards.map(([key, label], i) => (
              <div className={`admin-stat stat-${i}`} key={key}>
                <span>{t(label)}</span>
                <strong>{overview.stats[key].toLocaleString()}</strong>
                {key === "pending" && (
                  <button
                    className="icon-button"
                    aria-label={t("Review pending GIFs")}
                    onClick={() => {
                      setStatus("review");
                      selectTab("gifs");
                    }}
                  >
                    <ArrowUpRight size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="admin-overview-panels">
            <section className="panel">
              <div className="admin-panel-heading">
                <h2>{t("Recent GIFs")}</h2>
                <button
                  className="text-button"
                  onClick={() => {
                    setStatus("all");
                    selectTab("gifs");
                  }}
                >
                  {t("View all")}
                  <ArrowUpRight size={14} />
                </button>
              </div>
              {overview.recentGifs.length ? (
                <div className="admin-recent-list">
                  {overview.recentGifs.map((g) => (
                    <div key={g.id}>
                      <img src={g.url} alt={g.title} />
                      <div>
                        <strong>{g.title}</strong>
                        <small>{g.username}</small>
                      </div>
                      <Status gif={g} t={t} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">{t("No records found")}</div>
              )}
            </section>
            <section className="panel">
              <h2>{t("Points issued")}</h2>
              <div className="admin-issued-total">
                <SparkMark />
                <strong>
                  {overview.stats.totalPoints.toLocaleString()}{" "}
                  <small>XP</small>
                </strong>
              </div>
              <div className="admin-reward-list">
                {overview.rewards.map((r) => (
                  <div key={r.reason}>
                    <span>{t(reasons[r.reason] || r.reason)}</span>
                    <strong>{r.amount} XP</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
      {tab !== "overview" && (
        <section className="panel admin-data-panel">
          <div className="admin-filters">
            <div className="search-box">
              <Search size={18} />
              <input
                aria-label={t(
                  tab === "gifs"
                    ? "Search GIFs..."
                    : tab === "users"
                      ? "Search members..."
                      : "Search ledger...",
                )}
                placeholder={t(
                  tab === "gifs"
                    ? "Search GIFs..."
                    : tab === "users"
                      ? "Search members..."
                      : "Search ledger...",
                )}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {tab === "gifs" && (
              <label>
                <span className="sr-only">{t("Content status")}</span>
                <select
                  aria-label={t("Content status")}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {[
                    ["review", "Needs review"],
                    ["all", "All statuses"],
                    ["pending", "Pending"],
                    ["approved", "Approved"],
                    ["rejected", "Rejected"],
                    ["reported", "Reported"],
                  ].map(([key, label]) => (
                    <option key={key} value={key}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {loading ? (
            <div className="admin-empty" role="status">
              {t("Loading your little moments...")}
            </div>
          ) : (
            result && (
              <>
                {tab === "gifs" && (
                  <div className="admin-table-wrap">
                    <table className="admin-table gif-admin-table">
                      <thead>
                        <tr>
                          <th>{t("GIF")}</th>
                          <th>{t("Creator")}</th>
                          <th>{t("Status")}</th>
                          <th>{t("Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.gifs.map((g) => (
                          <tr key={g.id}>
                            <td>
                              <div className="admin-gif-cell">
                                <img src={g.url} alt={g.title} />
                                <div>
                                  <strong>{g.title}</strong>
                                  <small>
                                    {t(
                                      cats.find(
                                        (c) => c[0] === g.category,
                                      )?.[1] || g.category,
                                    )}{" "}
                                    · {(g.size / 1024).toFixed(0)} KB
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{g.username}</td>
                            <td>
                              <Status gif={g} t={t} />
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                <button
                                  className="button secondary"
                                  onClick={() =>
                                    setDialog({ type: "edit", gif: g })
                                  }
                                >
                                  <Pencil size={13} />
                                  {t("Edit")}
                                </button>
                                {(g.status === "pending" ||
                                  g.status === "flagged" ||
                                  g.reported) && (
                                  <>
                                    <button
                                      className="button primary"
                                      disabled={busy === g.id}
                                      onClick={() => review(g, "approved")}
                                    >
                                      {t("Approve")}
                                    </button>
                                    <button
                                      className="button secondary"
                                      disabled={busy === g.id}
                                      onClick={() => review(g, "rejected")}
                                    >
                                      {t("Reject")}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!result.gifs.length && (
                      <div className="admin-empty">
                        <Check size={25} />
                        {t("No records found")}
                      </div>
                    )}
                  </div>
                )}
                {tab === "users" && (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t("Member")}</th>
                          <th>{t("Role")}</th>
                          <th>{t("Points")}</th>
                          <th>{t("Approved GIFs")}</th>
                          <th>{t("Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.users.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <strong>{u.username}</strong>
                              <small className="admin-email">{u.email}</small>
                            </td>
                            <td>
                              {t(
                                u.role === "admin" ? "Administrator" : "Member",
                              )}
                            </td>
                            <td>
                              <span className="points-amount">
                                {u.points} XP
                              </span>
                            </td>
                            <td>{u.approvedUploads}</td>
                            <td>
                              <button
                                className="button secondary"
                                onClick={() =>
                                  setDialog({ type: "member", id: u.id })
                                }
                              >
                                <Eye size={13} />
                                {t("View")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!result.users.length && (
                      <div className="admin-empty">{t("No records found")}</div>
                    )}
                  </div>
                )}
                {tab === "points" && (
                  <PointsTable entries={result.entries} t={t} />
                )}
                <Pager
                  page={page}
                  total={result.total}
                  limit={result.limit}
                  onPage={setPage}
                  t={t}
                />
              </>
            )
          )}
        </section>
      )}
      {tab === "overview" && loading && !overview && (
        <div className="admin-empty" role="status">
          {t("Loading your little moments...")}
        </div>
      )}
      {dialog && (
        <Modal
          onClose={close}
          label={t(dialog.type === "edit" ? "Edit GIF" : "Member details")}
          wide={dialog.type === "member"}
        >
          {dialog.type === "edit" ? (
            <EditGif
              gif={dialog.gif}
              onSaved={() => {
                close();
                setRevision((n) => n + 1);
                notify(t("Changes saved"));
              }}
            />
          ) : (
            <MemberDetails id={dialog.id} />
          )}
        </Modal>
      )}
    </div>
  );
}
function SparkMark() {
  return (
    <span aria-hidden="true" className="admin-spark">
      ✧
    </span>
  );
}

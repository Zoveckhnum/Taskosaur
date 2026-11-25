import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import styles from "./OfficeOperationsPanel.module.css";
type Project = {
  id: string;
  name: string;
  workspace: string;
  canChange: boolean;
};
type Task = { id: string; slug: string; title: string };
type Activity = {
  key: string;
  type: string;
  name: string;
  plannedAt: string | null;
  durationMinutes: number;
  participant: string | null;
};
export type OfficeDirectory = {
  projects?: Project[];
  tasks?: Task[];
  statuses?: { id: string; name: string }[];
  assignees?: { id: string; name: string }[];
  diagnostics?: { id: number; title: string; clientName: string }[];
  activities?: Activity[];
  nextOffset?: number | null;
};
export type OfficeOperationView = {
  id: string;
  state: string;
  expiresAt: number;
  confirmationToken?: string;
  proposalHash: string;
  proposal: {
    summary: string;
    changes: { field: string; before: unknown; after: unknown }[];
  };
  receipt?: {
    platform: string;
    resourceId: string;
    slug?: string;
    url: string;
  } | null;
};
export type OfficeOperationApi = {
  query: (
    operation: string,
    parameters: Record<string, unknown>,
  ) => Promise<OfficeDirectory>;
  prepare: (body: {
    requestId: string;
    operation: string;
    parameters: Record<string, unknown>;
  }) => Promise<OfficeOperationView>;
  decision: (
    id: string,
    action: "confirm" | "cancel" | "status",
    body: Record<string, unknown>,
  ) => Promise<OfficeOperationView>;
};
const initial = {
  title: "",
  description: "",
  date: "",
  time: "09:00",
  minutes: "30",
  participant: "",
  priority: "MEDIUM",
  statusId: "",
  assigneeId: "",
  taskReference: "",
  activityKey: "",
};
const fieldNames: Record<string, string> = {
  title: "Título",
  description: "Descripción",
  priority: "Prioridad",
  status: "Estado",
  assignees: "Responsables",
  dueDate: "Fecha de entrega",
};
function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "")
    return "Sin asignar";
  if (Array.isArray(value))
    return value.length ? value.map(valueText).join(", ") : "Sin asignar";
  if (typeof value === "object") {
    const v = value as {
      name?: string;
      date?: string;
      time?: string;
      minutes?: number;
      participant?: string;
      journey?: number;
    };
    return (
      [
        v.name,
        v.date,
        v.time,
        typeof v.minutes === "number" ? v.minutes + " minutos" : null,
        v.participant,
        v.journey ? "Jornada " + v.journey : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Sin datos"
    );
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  return String(value);
}
function requestUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const v = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20)}`;
}
function safeLink(value: string) {
  try {
    const u = new URL(value);
    return !u.username &&
      !u.password &&
      (u.protocol === "https:" ||
        (u.protocol === "http:" &&
          ["127.0.0.1", "localhost"].includes(u.hostname)))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export default function OfficeOperationsPanel({
  api,
}: {
  api: OfficeOperationApi;
}) {
  const reviewHeading = useRef<HTMLHeadingElement>(null),
    prepareButton = useRef<HTMLButtonElement>(null),
    hadReview = useRef(false);
  const prefix = useId(),
    gate = useRef(false),
    requestId = useRef<string | null>(null);
  const [platform, setPlatform] = useState(""),
    [action, setAction] = useState("create"),
    [resource, setResource] = useState(""),
    [draft, setDraft] = useState(initial);
  const [directory, setDirectory] = useState<OfficeDirectory>({}),
    [options, setOptions] = useState<OfficeDirectory>({}),
    [tasks, setTasks] = useState<Task[]>([]),
    [selectedTask, setSelectedTask] = useState("");
  const [view, setView] = useState<OfficeOperationView | null>(null),
    [busy, setBusy] = useState(false),
    [directoryLoading, setDirectoryLoading] = useState(false),
    [resourceLoading, setResourceLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const loading = directoryLoading || resourceLoading;
  useEffect(() => {
    if (view) {
      reviewHeading.current?.focus();
      hadReview.current = true;
    } else if (hadReview.current) {
      prepareButton.current?.focus();
      hadReview.current = false;
    }
  }, [view?.id, view?.state]);
  const operation = (platform === "taskosaur" ? "task." : "agenda.") + action;
  useEffect(() => {
    let live = true;
    setDirectory({});
    setOptions({});
    setTasks([]);
    setResource("");
    setSelectedTask("");
    setError("");
    setDirectoryLoading(false);
    if (!platform) return;
    setDirectoryLoading(true);
    void api
      .query(platform === "taskosaur" ? "task.projects" : "agenda.list", {})
      .then((v) => {
        if (live) setDirectory(v);
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo consultar el directorio autorizado.",
          );
      })
      .finally(() => {
        if (live) setDirectoryLoading(false);
      });
    return () => {
      live = false;
    };
  }, [platform, api]);
  useEffect(() => {
    let live = true;
    setOptions({});
    setTasks([]);
    setSelectedTask("");
    setResourceLoading(false);
    if (!platform || !resource) return;
    setResourceLoading(true);
    setError("");
    const read =
      platform === "taskosaur"
        ? Promise.all([
            api.query("task.options", { projectId: resource }),
            api.query("task.list", { projectId: resource }),
          ]).then(([o, t]) => ({ ...o, tasks: t.tasks }))
        : api.query("agenda.list", { diagnosticId: Number(resource) });
    void read
      .then((v) => {
        if (live) {
          setOptions(v);
          setTasks(v.tasks ?? []);
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "No se pudo consultar el recurso.",
          );
      })
      .finally(() => {
        if (live) setResourceLoading(false);
      });
    return () => {
      live = false;
    };
  }, [platform, resource, api]);
  function edit(key: keyof typeof initial, value: string) {
    requestId.current = null;
    setDraft((old) => ({ ...old, [key]: value }));
    setError("");
  }
  function reset() {
    setView(null);
    setDraft({ ...initial, priority: action === "update" ? "" : "MEDIUM" });
    requestId.current = null;
    setNotice("");
    setError("");
    setSelectedTask("");
  }
  async function prepare(e: FormEvent) {
    e.preventDefault();
    if (gate.current || loading || view) return;
    setError("");
    setNotice("");
    let parameters: Record<string, unknown>;
    if (!resource) {
      setError("Selecciona el proyecto o diagnóstico.");
      return;
    }
    if (platform === "taskosaur") {
      if (action === "create")
        parameters = {
          projectId: resource,
          title: draft.title,
          description: draft.description,
          ...(draft.date ? { dueDate: draft.date } : {}),
          ...(draft.statusId ? { statusId: draft.statusId } : {}),
          ...(draft.priority ? { priority: draft.priority } : {}),
          ...(draft.assigneeId
            ? {
                assigneeIds:
                  draft.assigneeId === "__clear" ? [] : [draft.assigneeId],
              }
            : {}),
        };
      else {
        if (!selectedTask) {
          setError("Selecciona o busca una tarea.");
          return;
        }
        parameters = {
          taskId: selectedTask,
          ...(draft.title ? { title: draft.title } : {}),
          ...(draft.description ? { description: draft.description } : {}),
          ...(draft.date ? { dueDate: draft.date } : {}),
          ...(draft.statusId ? { statusId: draft.statusId } : {}),
          ...(draft.priority ? { priority: draft.priority } : {}),
          ...(draft.assigneeId
            ? {
                assigneeIds:
                  draft.assigneeId === "__clear" ? [] : [draft.assigneeId],
              }
            : {}),
        };
      }
    } else {
      const current = options.activities?.find(
        (a) => a.key === draft.activityKey,
      );
      parameters = {
        diagnosticId: Number(resource),
        date: draft.date,
        startTime: draft.time,
        durationMinutes: Number(draft.minutes),
        participant: draft.participant || null,
        ...(action === "create" || current?.type === "custom"
          ? { name: draft.title }
          : {}),
        ...(action === "update" ? { activityKey: draft.activityKey } : {}),
      };
    }
    gate.current = true;
    setBusy(true);
    requestId.current ??= requestUuid();
    try {
      setView(
        await api.prepare({
          requestId: requestId.current,
          operation,
          parameters,
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se confirmó la preparación. Reintenta con los mismos datos.",
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function decide(decision: "confirm" | "cancel" | "status") {
    if (!view || gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.decision(
        view.id,
        decision,
        decision === "status"
          ? {}
          : {
              confirmationToken: view.confirmationToken,
              proposalHash: view.proposalHash,
            },
      );
      if (result.state === "cancelled") {
        setView(null);
        requestId.current = null;
        setNotice(
          "Propuesta cancelada. Puedes modificar los campos y preparar otra.",
        );
      } else
        setView((old) => ({
          ...old!,
          ...result,
          state:
            result.state === "prepared" && result.expiresAt <= Date.now()
              ? "expired"
              : result.state,
        }));
    } catch (e) {
      setView((old) => (old ? { ...old, state: "unknown" } : old));
      setError(
        e instanceof Error
          ? e.message
          : "No se confirmó el resultado. Consulta el estado antes de repetir.",
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  async function searchTask() {
    if (!resource || !draft.taskReference.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.query("task.lookup", {
        projectId: resource,
        reference: draft.taskReference.trim(),
      });
      setTasks(result.tasks ?? []);
      setSelectedTask("");
      if (!result.tasks?.length)
        setError("No se encontró una tarea autorizada con esa referencia.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo buscar la tarea.");
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || !!view,
    href = view?.receipt ? safeLink(view.receipt.url) : null;
  const field = (
    label: string,
    key: keyof typeof initial,
    type = "text",
    required = false,
  ) => (
    <label
      className={key === "description" ? styles.wide : undefined}
      htmlFor={prefix + key}
    >
      {label}
      {key === "description" ? (
        <textarea
          id={prefix + key}
          value={draft[key]}
          onChange={(e) => edit(key, e.target.value)}
          maxLength={2000}
          rows={3}
        />
      ) : (
        <input
          id={prefix + key}
          type={type}
          value={draft[key]}
          onChange={(e) => edit(key, e.target.value)}
          required={required}
          {...(key === "minutes"
            ? { min: 1, max: 1440 }
            : key === "title"
              ? { maxLength: 200 }
              : {})}
        />
      )}
    </label>
  );
  return (
    <section
      className={styles.panel}
      aria-label="Operaciones coordinadas por Oficina"
    >
      <p>
        Prepara el cambio y revisa su destino. Los datos se guardan únicamente
        después de confirmar, con tus permisos vigentes.
      </p>
      <form onSubmit={prepare}>
        <fieldset disabled={disabled}>
          <legend>Preparar una operación</legend>
          <div className={styles.grid}>
            <label htmlFor={prefix + "platform"}>
              Plataforma
              <select
                id={prefix + "platform"}
                value={platform}
                onChange={(e) => {
                  reset();
                  setPlatform(e.target.value);
                }}
                required
              >
                <option value="">Selecciona una plataforma</option>
                <option value="taskosaur">Proyectos</option>
                <option value="iqualitys">Diagnóstico · agenda</option>
              </select>
            </label>
            <label htmlFor={prefix + "action"}>
              Operación
              <select
                id={prefix + "action"}
                value={action}
                onChange={(e) => {
                  reset();
                  setDraft({
                    ...initial,
                    priority: e.target.value === "update" ? "" : "MEDIUM",
                  });
                  setAction(e.target.value);
                }}
              >
                <option value="create">Crear</option>
                <option value="update">Actualizar</option>
              </select>
            </label>
            {platform ? (
              <label className={styles.wide} htmlFor={prefix + "resource"}>
                {platform === "taskosaur" ? "Proyecto" : "Diagnóstico"}
                <select
                  id={prefix + "resource"}
                  value={resource}
                  onChange={(e) => {
                    reset();
                    setResource(e.target.value);
                  }}
                  required
                  disabled={loading}
                >
                  <option value="">Selecciona un destino autorizado</option>
                  {platform === "taskosaur"
                    ? directory.projects?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.workspace} · {p.name}
                        </option>
                      ))
                    : directory.diagnostics?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.clientName} · {d.title}
                        </option>
                      ))}
                </select>
              </label>
            ) : null}
            {platform === "taskosaur" &&
            Number.isSafeInteger(directory.nextOffset) ? (
              <button
                type="button"
                onClick={() => {
                  setDirectoryLoading(true);
                  void api
                    .query("task.projects", { offset: directory.nextOffset })
                    .then((v) =>
                      setDirectory((old) => ({
                        ...v,
                        projects: [
                          ...(old.projects ?? []),
                          ...(v.projects ?? []),
                        ],
                      })),
                    )
                    .catch((e) => setError(e.message))
                    .finally(() => setDirectoryLoading(false));
                }}
                disabled={loading}
              >
                Cargar más proyectos
              </button>
            ) : null}
            {platform === "taskosaur" && resource && action === "update" ? (
              <>
                <label className={styles.wide} htmlFor={prefix + "task"}>
                  Tarea
                  <select
                    id={prefix + "task"}
                    value={selectedTask}
                    onChange={(e) => {
                      requestId.current = null;
                      setSelectedTask(e.target.value);
                      setDraft((old) => ({
                        ...initial,
                        priority: "",
                        taskReference: old.taskReference,
                      }));
                    }}
                    required
                  >
                    <option value="">Selecciona la tarea</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.slug} · {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                {field(
                  "Buscar por referencia o título exacto",
                  "taskReference",
                )}
                <div className={styles.inline}>
                  <button
                    type="button"
                    onClick={() => void searchTask()}
                    disabled={busy || !draft.taskReference.trim()}
                  >
                    Buscar tarea
                  </button>
                </div>
              </>
            ) : null}
            {platform === "iqualitys" && resource && action === "update" ? (
              <label className={styles.wide} htmlFor={prefix + "activity"}>
                Actividad
                <select
                  id={prefix + "activity"}
                  value={draft.activityKey}
                  onChange={(e) => {
                    const a = options.activities?.find(
                      (a) => a.key === e.target.value,
                    );
                    requestId.current = null;
                    setDraft({
                      ...initial,
                      activityKey: e.target.value,
                      title: a?.type === "custom" ? a.name : "",
                      date: a?.plannedAt?.slice(0, 10) ?? "",
                      time: a?.plannedAt?.slice(11, 16) ?? "09:00",
                      minutes: String(a?.durationMinutes ?? 30),
                      participant: a?.participant ?? "",
                    });
                  }}
                  required
                >
                  <option value="">Selecciona la actividad</option>
                  {options.activities?.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.name} ·{" "}
                      {a.plannedAt?.replace("T", " ") ?? "Sin programar"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {resource ? (
              <>
                {platform === "taskosaur" ||
                action === "create" ||
                options.activities?.find((a) => a.key === draft.activityKey)
                  ?.type === "custom"
                  ? field(
                      action === "update"
                        ? "Título nuevo (opcional)"
                        : "Título",
                      "title",
                      "text",
                      action === "create",
                    )
                  : null}
                {platform === "taskosaur" ? (
                  <>
                    {field(
                      action === "update"
                        ? "Descripción nueva (opcional)"
                        : "Descripción",
                      "description",
                    )}
                    <label htmlFor={prefix + "status"}>
                      Estado
                      <select
                        id={prefix + "status"}
                        value={draft.statusId}
                        onChange={(e) => edit("statusId", e.target.value)}
                      >
                        <option value="">
                          {action === "create"
                            ? "Estado inicial del proyecto"
                            : "Conservar el estado actual"}
                        </option>
                        {options.statuses?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor={prefix + "assignee"}>
                      Responsable
                      <select
                        id={prefix + "assignee"}
                        value={draft.assigneeId}
                        onChange={(e) => edit("assigneeId", e.target.value)}
                      >
                        <option value="">
                          {action === "create"
                            ? "Sin asignar"
                            : "Conservar responsables actuales"}
                        </option>
                        <option value="__clear">Sin responsable</option>
                        {options.assignees?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {
                      <label htmlFor={prefix + "priority"}>
                        Prioridad
                        <select
                          id={prefix + "priority"}
                          value={draft.priority}
                          onChange={(e) => edit("priority", e.target.value)}
                        >
                          {action === "update" ? (
                            <option value="">Conservar prioridad actual</option>
                          ) : null}
                          {[
                            ["LOWEST", "Mínima"],
                            ["LOW", "Baja"],
                            ["MEDIUM", "Media"],
                            ["HIGH", "Alta"],
                            ["HIGHEST", "Máxima"],
                          ].map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                    }
                  </>
                ) : null}
                {field(
                  platform === "taskosaur"
                    ? "Fecha de entrega (opcional)"
                    : "Fecha",
                  "date",
                  "date",
                  platform === "iqualitys",
                )}
                {platform === "iqualitys" ? (
                  <>
                    {field("Hora · Ciudad de México", "time", "time", true)}
                    {field("Duración en minutos", "minutes", "number", true)}
                    {field("Participante", "participant")}
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </fieldset>
        <div className={styles.actions}>
          {!view ? (
            <button
              ref={prepareButton}
              className={styles.primary}
              type="submit"
              disabled={busy || loading || !resource}
            >
              {busy ? "Preparando propuesta…" : "Preparar cambio"}
            </button>
          ) : null}
        </div>
      </form>
      {loading ? <p role="status">Consultando recursos autorizados…</p> : null}
      {platform &&
      !loading &&
      !error &&
      !(directory.projects?.length || directory.diagnostics?.length) ? (
        <p role="status">
          No tienes destinos autorizados en esta plataforma. Solicita acceso al
          administrador.
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {view ? (
        <section className={styles.review} aria-label="Revisión y confirmación">
          <h3 ref={reviewHeading} tabIndex={-1}>
            {view.state === "completed" && view.receipt
              ? "Cambio guardado"
              : view.state === "prepared"
                ? "Revisa antes de confirmar"
                : "Resultado por verificar"}
          </h3>
          <p>{view.proposal.summary}</p>
          {view.state === "prepared" ? (
            <>
              <dl className={styles.changes}>
                {view.proposal.changes.map((c, i) => (
                  <div key={i}>
                    <dt>{fieldNames[c.field] ?? c.field}</dt>
                    <dd>
                      <span>Antes</span>
                      {c.field === "priority"
                        ? ((
                            {
                              LOWEST: "Mínima",
                              LOW: "Baja",
                              MEDIUM: "Media",
                              HIGH: "Alta",
                              HIGHEST: "Máxima",
                            } as Record<string, string>
                          )[String(c.before)] ?? valueText(c.before))
                        : valueText(c.before)}
                    </dd>
                    <dd>
                      <span>Después</span>
                      {c.field === "priority"
                        ? ((
                            {
                              LOWEST: "Mínima",
                              LOW: "Baja",
                              MEDIUM: "Media",
                              HIGH: "Alta",
                              HIGHEST: "Máxima",
                            } as Record<string, string>
                          )[String(c.after)] ?? valueText(c.after))
                        : valueText(c.after)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>
                Vence a las{" "}
                {new Intl.DateTimeFormat("es-MX", {
                  timeZone: "America/Mexico_City",
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                }).format(new Date(view.expiresAt))}{" "}
                (CDMX). Modificar requiere cancelar esta propuesta y prepararla
                de nuevo.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void decide("cancel")}
                >
                  Cancelar / modificar
                </button>
                <button
                  className={styles.primary}
                  type="button"
                  disabled={busy || !view.confirmationToken}
                  onClick={() => void decide("confirm")}
                >
                  {busy ? "Comprobando y guardando…" : "Confirmar cambio"}
                </button>
              </div>
            </>
          ) : view.state === "completed" && view.receipt ? (
            <>
              <p role="status">
                Guardado confirmado en{" "}
                {view.receipt.platform === "taskosaur"
                  ? "Proyectos"
                  : "Diagnóstico"}
                . Registro {view.receipt.slug ?? view.receipt.resourceId}.
              </p>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  Abrir el registro
                </a>
              ) : null}
              <div className={styles.actions}>
                <button type="button" onClick={reset}>
                  Preparar otro cambio
                </button>
              </div>
            </>
          ) : ["conflict", "cancelled", "expired"].includes(view.state) ? (
            <>
              <p role="status">
                Esta propuesta ya no puede guardarse. Revisa los datos y prepara
                una nueva confirmación.
              </p>
              <button type="button" disabled={busy} onClick={reset}>
                Preparar nueva propuesta
              </button>
            </>
          ) : (
            <>
              <p role="status">
                Todavía no hay un recibo de guardado confirmado. Consulta el
                resultado antes de repetir la operación.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide("status")}
              >
                Verificar resultado
              </button>
            </>
          )}
          <p className={styles.reference}>Folio de Oficina: {view.id}</p>
        </section>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

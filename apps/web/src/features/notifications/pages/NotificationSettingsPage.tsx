import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellRing, Plus, Route, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { usePermissions } from "@/hooks/use-permissions";
import { getRolesApi, getStaffApi, type Role } from "@/features/users/services/staff.api";
import {
  createNotificationEventTypeApi,
  createNotificationRoutingRuleApi,
  deleteNotificationRoutingRuleApi,
  getNotificationEventTypesApi,
  getNotificationRoutingRulesApi,
  updateNotificationEventTypeApi,
  updateNotificationRoutingRuleApi,
  type CreateNotificationEventType,
  type NotificationEventType,
  type NotificationPriority,
  type NotificationRoutingRule,
} from "../services/notifications.api";

const EVENT_KEY_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const PRIORITIES: NotificationPriority[] = ["low", "normal", "high", "urgent"];
type RouteUser = { id: string; name: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The change could not be saved.";
}

function EventTypeRow({ eventType }: { eventType: NotificationEventType }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    name: eventType.name,
    description: eventType.description ?? "",
    defaultTitle: eventType.defaultTitle ?? "",
    defaultPriority: eventType.defaultPriority,
    defaultIsTask: eventType.defaultIsTask,
  });

  useEffect(() => {
    setDraft({
      name: eventType.name,
      description: eventType.description ?? "",
      defaultTitle: eventType.defaultTitle ?? "",
      defaultPriority: eventType.defaultPriority,
      defaultIsTask: eventType.defaultIsTask,
    });
  }, [eventType]);

  const save = useMutation({
    mutationFn: (isActive: boolean) => updateNotificationEventTypeApi(eventType.key, { ...draft, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-event-types"] });
      toast.success(`Saved ${eventType.key}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <article className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <code className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>{eventType.key}</code>
        <button
          onClick={() => save.mutate(!eventType.isActive)}
          className="rounded-full border px-2 py-1 text-[10px] font-bold transition hover:border-[var(--accent)]"
          style={{ borderColor: "var(--border)", color: eventType.isActive ? "var(--color-status-done)" : "var(--text-3)" }}
        >
          {eventType.isActive ? "Active" : "Disabled"}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>
          Name
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>
          Default title
          <input value={draft.defaultTitle} onChange={(event) => setDraft({ ...draft, defaultTitle: event.target.value })} className="mt-1 w-full rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>
          Description
          <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1 w-full rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }} />
        </label>
        <div className="flex items-end gap-3">
          <label className="flex-1 text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>
            Priority
            <select value={draft.defaultPriority} onChange={(event) => setDraft({ ...draft, defaultPriority: event.target.value as NotificationPriority })} className="mt-1 w-full rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }}>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-[11px]" style={{ color: "var(--text-2)" }}>
            <input type="checkbox" checked={draft.defaultIsTask} onChange={(event) => setDraft({ ...draft, defaultIsTask: event.target.checked })} />
            Task
          </label>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={() => save.mutate(eventType.isActive)} disabled={save.isPending} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-60" style={{ color: "var(--accent-foreground)" }}>
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </article>
  );
}

function RoutingRules({ eventTypes, rules, roles, staff }: { eventTypes: NotificationEventType[]; rules: NotificationRoutingRule[]; roles: Role[]; staff: RouteUser[] }) {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState("");
  const [target, setTarget] = useState<"role" | "user">("role");
  const [targetId, setTargetId] = useState("");
  const selectedEvent = eventType || eventTypes[0]?.key || "";
  const targets = target === "role" ? roles : staff;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notification-routing-rules"] });
  const create = useMutation({
    mutationFn: () => createNotificationRoutingRuleApi(target === "role" ? { eventType: selectedEvent, roleId: targetId } : { eventType: selectedEvent, userId: targetId }),
    onSuccess: () => { refresh(); setTargetId(""); toast.success("Routing rule added"); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateNotificationRoutingRuleApi(id, isActive),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: deleteNotificationRoutingRuleApi,
    onSuccess: () => { refresh(); toast.success("Routing rule deleted"); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const visibleRules = rules.filter((rule) => rule.eventType === selectedEvent);
  return (
    <section className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="border-b p-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2"><Route className="h-4 w-4" style={{ color: "var(--accent)" }} /><h2 className="text-[13px] font-bold">Routing rules</h2></div>
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>Choose who receives future events. Existing notifications are never rewritten.</p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
        <select value={selectedEvent} onChange={(event) => setEventType(event.target.value)} className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px]" style={{ borderColor: "var(--border)" }}>
          {eventTypes.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}
        </select>
        <select value={target} onChange={(event) => { setTarget(event.target.value as "role" | "user"); setTargetId(""); }} className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px]" style={{ borderColor: "var(--border)" }}>
          <option value="role">Route to role</option><option value="user">Route to user</option>
        </select>
        <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px]" style={{ borderColor: "var(--border)" }}>
          <option value="">Select {target}</option>
          {targets.map((item) => <option key={item.id} value={item.id}>{"displayName" in item ? item.displayName : item.name}</option>)}
        </select>
        <button onClick={() => create.mutate()} disabled={!selectedEvent || !targetId || create.isPending} className="rounded-md bg-[var(--accent)] px-3 py-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-60" style={{ color: "var(--accent-foreground)" }}>Add route</button>
      </div>
      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        {visibleRules.length === 0 ? <p className="p-4 text-[11px]" style={{ color: "var(--text-3)" }}>No routes set for this event type.</p> : visibleRules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--border)" }}>
            <div><p className="text-[12px] font-semibold">{rule.roleName || rule.userName || (rule.roleId ? "Role route" : "Direct user route")}</p><p className="text-[10px]" style={{ color: "var(--text-3)" }}>{rule.roleId ? "Every active holder of this role" : "One named user"}</p></div>
            <div className="flex items-center gap-2"><button onClick={() => setActive.mutate({ id: rule.id, isActive: !rule.isActive })} className="rounded-full border px-2 py-1 text-[10px] font-bold" style={{ borderColor: "var(--border)", color: rule.isActive ? "var(--color-status-done)" : "var(--text-3)" }}>{rule.isActive ? "Active" : "Disabled"}</button><button onClick={() => remove.mutate(rule.id)} className="rounded-md p-1.5 hover:bg-[var(--surface-2)]" aria-label="Delete route"><Trash2 className="h-3.5 w-3.5" style={{ color: "var(--destructive)" }} /></button></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NotificationSettingsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [newEvent, setNewEvent] = useState<CreateNotificationEventType>({ key: "", name: "", defaultPriority: "normal", defaultIsTask: false });
  const eventTypes = useQuery({ queryKey: ["notification-event-types"], queryFn: getNotificationEventTypesApi, enabled: can("notification.manage") });
  const rules = useQuery({ queryKey: ["notification-routing-rules"], queryFn: () => getNotificationRoutingRulesApi(), enabled: can("notification.manage") });
  const roles = useQuery({ queryKey: ["notification-settings-roles"], queryFn: getRolesApi, enabled: can("notification.manage"), retry: false });
  const staff = useQuery({ queryKey: ["notification-settings-staff"], queryFn: getStaffApi, enabled: can("notification.manage"), retry: false });
  const create = useMutation({
    mutationFn: () => createNotificationEventTypeApi(newEvent),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notification-event-types"] }); setNewEvent({ key: "", name: "", defaultPriority: "normal", defaultIsTask: false }); toast.success("Notification event type added"); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const canCreate = EVENT_KEY_PATTERN.test(newEvent.key) && Boolean(newEvent.name.trim());
  const orderedEvents = useMemo(() => eventTypes.data ?? [], [eventTypes.data]);

  if (!can("notification.manage")) return <AppShell><div className="rounded-lg border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><h1 className="text-lg font-bold">Notification settings are restricted</h1><p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>You need the notification.manage permission to configure delivery rules.</p><Link to="/notifications" className="mt-4 inline-flex text-[12px] font-semibold" style={{ color: "var(--accent)" }}>Back to notifications</Link></div></AppShell>;

  return <AppShell><div className="mx-auto max-w-6xl space-y-5"><div><div className="label-eyebrow mb-1">Delivery controls</div><h1 className="text-[24px] font-bold tracking-tight">Notification settings</h1><p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>Configure events and their recipients. Changes only affect notifications delivered from now on.</p></div>
    <section className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><div className="border-b p-4" style={{ borderColor: "var(--border)" }}><div className="flex items-center gap-2"><BellRing className="h-4 w-4" style={{ color: "var(--accent)" }} /><h2 className="text-[13px] font-bold">Add event type</h2></div><p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>Keys use two lowercase segments, such as booking.created.</p></div><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5"><input value={newEvent.key} onChange={(event) => setNewEvent({ ...newEvent, key: event.target.value })} placeholder="booking.created" className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }} /><input value={newEvent.name} onChange={(event) => setNewEvent({ ...newEvent, name: event.target.value })} placeholder="Display name" className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }} /><input value={newEvent.defaultTitle ?? ""} onChange={(event) => setNewEvent({ ...newEvent, defaultTitle: event.target.value })} placeholder="Default title" className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" style={{ borderColor: "var(--border)" }} /><select value={newEvent.defaultPriority} onChange={(event) => setNewEvent({ ...newEvent, defaultPriority: event.target.value as NotificationPriority })} className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2 text-[12px]" style={{ borderColor: "var(--border)" }}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select><button onClick={() => create.mutate()} disabled={!canCreate || create.isPending} className="flex items-center justify-center gap-1 rounded-md bg-[var(--accent)] px-3 py-2 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-60" style={{ color: "var(--accent-foreground)" }}><Plus className="h-3.5 w-3.5" /> Add event</button></div>{newEvent.key && !EVENT_KEY_PATTERN.test(newEvent.key) && <p className="px-4 pb-4 text-[10px]" style={{ color: "var(--destructive)" }}>Use exactly two lowercase segments: booking.created</p>}</section>
    {eventTypes.isError ? <p className="rounded-lg border p-4 text-[12px]" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>{errorMessage(eventTypes.error)}</p> : <div className="grid gap-3">{orderedEvents.map((eventType) => <EventTypeRow key={eventType.key} eventType={eventType} />)}{eventTypes.isLoading && <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading event types…</p>}</div>}
    <RoutingRules eventTypes={orderedEvents} rules={rules.data ?? []} roles={roles.data ?? []} staff={(staff.data ?? []).flatMap((member) => member.id ? [{ id: member.id, name: member.name }] : [])} />
  </div></AppShell>;
}

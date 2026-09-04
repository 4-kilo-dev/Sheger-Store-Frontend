import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getEthiopianTimeApi,
  getEthiopianTimeOptionsApi,
  toGregorianTimeApi,
  type EthiopianTimeValue,
  calendarQueryOptions,
} from "@/lib/calendar/calendar.api";

type EthiopianDayPeriod = EthiopianTimeValue["dayPeriod"];

type EthTimeSelectProps = {
  /** Western 24h `HH:mm` */
  value: string;
  onChange: (westernHHmm: string) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Period + hour + minute picker for Ethiopian civil time.
 * Stores/emits Western 24h `HH:mm` for API compatibility.
 */
export function EthTimeSelect({ value, onChange, className, disabled }: EthTimeSelectProps) {
  const optionsQuery = useQuery({
    queryKey: ["calendar", "ethiopian-time-options"],
    queryFn: getEthiopianTimeOptionsApi,
    ...calendarQueryOptions,
  });
  const timeQuery = useQuery({
    queryKey: ["calendar", "ethiopian-time", value],
    queryFn: () => getEthiopianTimeApi(value || "12:00"),
    ...calendarQueryOptions,
  });
  const { data: options } = optionsQuery;
  const { data: parts } = timeQuery;
  const convert = useMutation({
    mutationFn: ({ period, hour, minute }: { period: EthiopianDayPeriod; hour: number; minute: number }) =>
      toGregorianTimeApi(period, hour, minute),
    onSuccess: (result) => onChange(result.isoTime),
  });
  if (!options) {
    return (
      <div className={`h-9 text-[12px] text-[var(--text-3)] ${className || ""}`}>
        {optionsQuery.isError ? "Calendar service unavailable" : "Loading time…"}
      </div>
    );
  }

  const period = parts?.dayPeriod || options.periods[0].id;
  const periodMeta = options.periods.find((item) => item.id === period) || options.periods[0];
  const ethHour = parts?.ethiopianHour ?? periodMeta.hours[0];
  const minute = parts?.minute ?? 0;
  const snapMinute = options.minutes.includes(minute) ? minute : options.minutes[0];
  const emit = (nextPeriod: EthiopianDayPeriod, nextHour: number, nextMinute: number) => {
    convert.mutate({ period: nextPeriod, hour: nextHour, minute: nextMinute });
  };

  const selectCls =
    "h-9 rounded-md border bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--accent)] disabled:opacity-50";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <select
        disabled={disabled || convert.isPending}
        value={period}
        onChange={(e) => {
          const next = e.target.value as EthiopianDayPeriod;
          const hours = options.periods.find((item) => item.id === next)!.hours;
          const nextHour = hours.includes(ethHour) ? ethHour : hours[0];
          emit(next, nextHour, minute);
        }}
        className={selectCls}
        style={{ borderColor: "var(--border)", minWidth: 110 }}
        aria-label="Time of day period"
      >
        {options.periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        disabled={disabled || convert.isPending}
        value={ethHour}
        onChange={(e) => emit(period, Number(e.target.value), minute)}
        className={selectCls}
        style={{ borderColor: "var(--border)" }}
        aria-label="Hour"
      >
        {periodMeta.hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>

      <span className="text-[12px] font-bold" style={{ color: "var(--text-3)" }}>
        :
      </span>

      <select
        disabled={disabled || convert.isPending}
        value={snapMinute}
        onChange={(e) => emit(period, ethHour, Number(e.target.value))}
        className={selectCls}
        style={{ borderColor: "var(--border)" }}
        aria-label="Minute"
      >
        {options.minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}

import {
  ETHIOPIAN_DAY_PERIODS,
  ethiopianSelectionToWesternHHmm,
  parseWesternHHmm,
  westernToEthiopianTime,
  type EthiopianDayPeriod,
} from "@vortex/utils";
import { useCalendarSystem } from "@/context/CalendarSystemContext";

const MINUTES = ["00", "15", "30", "45"] as const;

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
  const { numeralsSystem } = useCalendarSystem();
  const { hour, minute } = parseWesternHHmm(value || "12:00");
  const parts = westernToEthiopianTime(hour, minute, numeralsSystem === "geez" ? "geez" : "latn");
  const periodMeta = ETHIOPIAN_DAY_PERIODS.find((p) => p.id === parts.period)!;

  const snapMinute = MINUTES.includes(String(minute).padStart(2, "0") as (typeof MINUTES)[number])
    ? String(minute).padStart(2, "0")
    : String(Math.round(minute / 15) * 15).padStart(2, "0").replace("60", "00");

  const emit = (period: EthiopianDayPeriod, ethHour: number, min: number) => {
    onChange(ethiopianSelectionToWesternHHmm(period, ethHour, min));
  };

  const selectCls =
    "h-9 rounded-md border bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--accent)] disabled:opacity-50";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <select
        disabled={disabled}
        value={parts.period}
        onChange={(e) => {
          const next = e.target.value as EthiopianDayPeriod;
          const hours = ETHIOPIAN_DAY_PERIODS.find((p) => p.id === next)!.hours;
          const ethHour = hours.includes(parts.ethHour) ? parts.ethHour : hours[0];
          emit(next, ethHour, minute);
        }}
        className={selectCls}
        style={{ borderColor: "var(--border)", minWidth: 110 }}
        aria-label="Time of day period"
      >
        {ETHIOPIAN_DAY_PERIODS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.labelAm} · {p.labelEn}
          </option>
        ))}
      </select>

      <select
        disabled={disabled}
        value={parts.ethHour}
        onChange={(e) => emit(parts.period, Number(e.target.value), minute)}
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
        disabled={disabled}
        value={snapMinute === "60" ? "00" : snapMinute}
        onChange={(e) => emit(parts.period, parts.ethHour, Number(e.target.value))}
        className={selectCls}
        style={{ borderColor: "var(--border)" }}
        aria-label="Minute"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

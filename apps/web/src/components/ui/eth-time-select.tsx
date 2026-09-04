import {
  ETHIOPIAN_TIME_OPTIONS,
  getEthiopianTime,
  toWesternTime,
  type EthiopianDayPeriod,
} from "@/lib/calendar/ethiopian-calendar-client";

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
  const parts = getEthiopianTime(value || "12:00") || getEthiopianTime("12:00")!;
  const period = parts.dayPeriod;
  const periodMeta = ETHIOPIAN_TIME_OPTIONS.find((item) => item.id === period)!;
  const minute = [0, 15, 30, 45].includes(parts.minute) ? parts.minute : 0;
  const emit = (nextPeriod: EthiopianDayPeriod, nextHour: number, nextMinute: number) => {
    onChange(toWesternTime(nextPeriod, nextHour, nextMinute));
  };
  const selectCls =
    "h-9 rounded-md border bg-[var(--surface)] px-2 text-[12px] outline-none focus:border-[var(--accent)] disabled:opacity-50";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <select
        disabled={disabled}
        value={period}
        onChange={(event) => {
          const nextPeriod = event.target.value as EthiopianDayPeriod;
          const hours = ETHIOPIAN_TIME_OPTIONS.find((item) => item.id === nextPeriod)!.hours;
          emit(nextPeriod, hours.includes(parts.ethiopianHour) ? parts.ethiopianHour : hours[0], minute);
        }}
        className={selectCls}
        style={{ borderColor: "var(--border)", minWidth: 110 }}
        aria-label="Time of day period"
      >
        {ETHIOPIAN_TIME_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <select
        disabled={disabled}
        value={parts.ethiopianHour}
        onChange={(event) => emit(period, Number(event.target.value), minute)}
        className={selectCls}
        style={{ borderColor: "var(--border)" }}
        aria-label="Hour"
      >
        {periodMeta.hours.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}</option>)}
      </select>
      <span className="text-[12px] font-bold" style={{ color: "var(--text-3)" }}>:</span>
      <select
        disabled={disabled}
        value={minute}
        onChange={(event) => emit(period, parts.ethiopianHour, Number(event.target.value))}
        className={selectCls}
        style={{ borderColor: "var(--border)" }}
        aria-label="Minute"
      >
        {[0, 15, 30, 45].map((option) => <option key={option} value={option}>{String(option).padStart(2, "0")}</option>)}
      </select>
    </div>
  );
}

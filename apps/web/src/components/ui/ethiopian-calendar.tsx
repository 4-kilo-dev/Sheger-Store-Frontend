import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ETHIOPIAN_MONTH_NAMES,
  ETHIOPIAN_WEEKDAY_HEADERS,
  getCurrentEthiopianDate,
  getEthiopianMonth,
  toEthiopianDate,
} from "@/lib/calendar/ethiopian-calendar-client";

type EthiopianCalendarProps = {
  value?: string;
  onSelect: (value: string) => void;
  minDate?: Date;
};

function addMonth(view: { year: number; month: number }, direction: -1 | 1) {
  if (direction === -1) {
    return view.month === 1
      ? { year: view.year - 1, month: 13 }
      : { year: view.year, month: view.month - 1 };
  }
  return view.month === 13
    ? { year: view.year + 1, month: 1 }
    : { year: view.year, month: view.month + 1 };
}

export function EthiopianCalendar({ value, onSelect, minDate }: EthiopianCalendarProps) {
  const dateValue = value?.split("T")[0] || "";
  const selected = React.useMemo(() => toEthiopianDate(dateValue), [dateValue]);
  const [view, setView] = React.useState(() => {
    const source = selected || getCurrentEthiopianDate();
    return { year: source.year, month: source.month };
  });

  React.useEffect(() => {
    if (selected) setView({ year: selected.year, month: selected.month });
  }, [selected?.year, selected?.month]);

  const days = React.useMemo(() => getEthiopianMonth(view.year, view.month), [view]);
  const cells = [
    ...Array.from({ length: days[0]?.weekday || 0 }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const minimum = minDate ? minDate.toISOString().slice(0, 10) : undefined;

  return (
    <div className="w-72 p-3" data-calendar-source="ethiopian-calendar-date-converter">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Previous Ethiopian month" onClick={() => setView((current) => addMonth(current, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">{ETHIOPIAN_MONTH_NAMES[view.month - 1]} {view.year}</div>
        <Button variant="ghost" size="icon" aria-label="Next Ethiopian month" onClick={() => setView((current) => addMonth(current, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-[var(--text-3)]">
        {ETHIOPIAN_WEEKDAY_HEADERS.map((header) => <div className="py-1" key={header}>{header}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, index) => {
          if (!day) return <div className="h-9" key={`blank-${index}`} />;
          const isSelected = day.gregorianDate === dateValue;
          const isDisabled = Boolean(minimum && day.gregorianDate < minimum);
          return (
            <Button
              key={day.gregorianDate}
              type="button"
              variant="ghost"
              size="icon"
              disabled={isDisabled}
              onClick={() => onSelect(day.gregorianDate)}
              className={cn(
                "mx-auto h-8 w-8 text-xs",
                isSelected && "bg-[var(--accent)] text-black hover:bg-[var(--accent)] hover:text-black",
                !isSelected && day.isToday && "ring-1 ring-[var(--accent)]",
              )}
            >
              {day.ethiopian.day}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatCalendarValuesApi,
  getCalendarNowApi,
  getEthiopianMonthApi,
} from "@/lib/calendar/calendar.api";
import { useCalendarSystem } from "@/context/CalendarSystemContext";

type EthiopianCalendarProps = {
  value?: string;
  onSelect: (value: string) => void;
  minDate?: Date;
};

export function EthiopianCalendar({ value, onSelect, minDate }: EthiopianCalendarProps) {
  const { numeralsSystem } = useCalendarSystem();
  const dateValue = value?.split("T")[0] || "";
  const { data: now } = useQuery({ queryKey: ["calendar", "now"], queryFn: getCalendarNowApi });
  const { data: selected } = useQuery({
    queryKey: ["calendar", "format", dateValue, numeralsSystem],
    queryFn: () => formatCalendarValuesApi([dateValue], "ethiopic", numeralsSystem).then((entries) => entries[0]),
    enabled: Boolean(dateValue),
  });
  const [view, setView] = React.useState<{ year: number; month: number } | null>(null);

  React.useEffect(() => {
    if (view) return;
    const source = selected?.date.ethiopian || now?.ethiopian;
    if (source) setView({ year: source.year, month: source.month });
  }, [now, selected, view]);

  const { data: month } = useQuery({
    queryKey: ["calendar", "ethiopian-month", view?.year, view?.month, numeralsSystem],
    queryFn: () => getEthiopianMonthApi(view!.year, view!.month, numeralsSystem),
    enabled: Boolean(view),
  });

  const minimum = minDate ? minDate.toISOString().slice(0, 10) : undefined;
  if (!month) {
    return <div className="grid h-64 w-72 place-items-center text-sm text-[var(--text-3)]">Loading calendar…</div>;
  }

  const cells = [
    ...Array.from({ length: month.days[0]?.weekday || 0 }, () => null),
    ...month.days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-72 p-3" data-calendar-source="backend">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Previous Ethiopian month" onClick={() => setView(month.previous)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">{month.monthName} {month.year}</div>
        <Button variant="ghost" size="icon" aria-label="Next Ethiopian month" onClick={() => setView(month.next)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-[var(--text-3)]">
        {month.headers.map((header) => <div className="py-1" key={header}>{header}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, index) => {
          if (!day) return <div className="h-9" key={`blank-${index}`} />;
          const isSelected = day.gregorian.display === dateValue;
          const isDisabled = Boolean(minimum && day.gregorian.display < minimum);
          return (
            <Button
              key={day.gregorian.display}
              type="button"
              variant="ghost"
              size="icon"
              disabled={isDisabled}
              onClick={() => onSelect(day.gregorian.display)}
              className={cn(
                "mx-auto h-8 w-8 text-xs",
                isSelected && "bg-[var(--accent)] text-black hover:bg-[var(--accent)] hover:text-black",
                !isSelected && day.isToday && "ring-1 ring-[var(--accent)]",
              )}
            >
              {day.ethiopian.display}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

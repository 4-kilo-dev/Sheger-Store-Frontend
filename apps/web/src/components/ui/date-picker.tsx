import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCalendarSystem, useDateFormatter } from "@/context/CalendarSystemContext";

interface DatePickerProps {
  /** Value in "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" format */
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Minimum selectable date (disables days before this) */
  minDate?: Date;
  /** Whether to show a time input alongside the calendar */
  showTime?: boolean;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date",
  minDate,
  showTime = false,
}: DatePickerProps) {
  const { calendarSystem } = useCalendarSystem();
  const { formatDate } = useDateFormatter();

  // Parse current value
  const { parsedDate, timeValue } = React.useMemo(() => {
    if (!value) return { parsedDate: undefined, timeValue: "12:00" };
    // Support both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm"
    const hasTime = value.includes("T");
    const datePart = hasTime ? value.split("T")[0] : value;
    const timePart = hasTime ? value.split("T")[1]?.slice(0, 5) : "12:00";
    const d = new Date(datePart);
    return {
      parsedDate: isNaN(d.getTime()) ? undefined : d,
      timeValue: timePart || "12:00",
    };
  }, [value]);

  const handleSelectDate = (date?: Date) => {
    if (!date) {
      onChange?.("");
      return;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    if (showTime) {
      onChange?.(`${yyyy}-${mm}-${dd}T${timeValue}`);
    } else {
      onChange?.(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (!parsedDate) {
      // If no date selected yet, just store the time preference
      return;
    }
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(parsedDate.getDate()).padStart(2, "0");
    onChange?.(`${yyyy}-${mm}-${dd}T${newTime}`);
  };

  // Disable dates before minDate
  const disabledDays = React.useMemo(() => {
    if (!minDate) return undefined;
    // Disable all days before minDate (set to start of day)
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return { before: min };
  }, [minDate]);

  const displayText = React.useMemo(() => {
    if (!parsedDate) return placeholder;
    let dateStr: string;
    if (calendarSystem === "ethiopic") {
      dateStr = formatDate(parsedDate);
    } else {
      dateStr = format(parsedDate, "PPP");
    }
    if (showTime && value?.includes("T")) {
      dateStr += ` · ${timeValue}`;
    }
    return dateStr;
  }, [parsedDate, calendarSystem, placeholder, formatDate, showTime, timeValue, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10 bg-[var(--surface-2)] border text-[13px]",
            !value && "text-muted-foreground",
            className
          )}
          style={{ borderColor: "var(--border)" }}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelectDate}
          disabled={disabledDays}
          initialFocus
        />
        {showTime && (
          <div
            className="flex items-center gap-2 border-t px-3 py-2.5"
            style={{ borderColor: "var(--border)" }}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>
              Time
            </span>
            <input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="ml-auto h-8 rounded-md border bg-[var(--surface-2)] px-2 text-[13px] outline-none focus:border-[var(--accent)]"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

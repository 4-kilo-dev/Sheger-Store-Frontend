import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCalendarSystem, useDateFormatter } from "@/context/CalendarSystemContext";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, className, placeholder = "Pick a date" }: DatePickerProps) {
  const { calendarSystem } = useCalendarSystem();
  const { formatDate } = useDateFormatter();
  
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const handleSelect = (date?: Date) => {
    if (!date) {
      onChange?.("");
      return;
    }
    // Format as YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange?.(`${yyyy}-${mm}-${dd}`);
  };

  const displayText = React.useMemo(() => {
    if (!parsedDate) return placeholder;
    if (calendarSystem === "ethiopic") {
      return formatDate(parsedDate);
    }
    return format(parsedDate, "PPP");
  }, [parsedDate, calendarSystem, placeholder, formatDate]);

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
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

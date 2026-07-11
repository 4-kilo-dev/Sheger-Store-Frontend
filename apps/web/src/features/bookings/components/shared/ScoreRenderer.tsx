import { Star, Check, X } from "lucide-react";

type ValueType = "boolean" | "rating_5" | "rating_10" | "percentage";

// ─── Display (Read-only) ───────────────────────────────────────────────

interface ScoreDisplayProps {
  valueType: ValueType;
  score: number;
}

/**
 * Read-only inline display of a score value.
 * Renders a pill (boolean), star icons (rating_5), or text (rating_10, percentage).
 */
export function ScoreDisplay({ valueType, score }: ScoreDisplayProps) {
  if (valueType === "boolean") {
    return (
      <span
        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
        style={{
          background:
            score === 1
              ? "rgba(48, 164, 108, 0.15)"
              : "rgba(229, 70, 102, 0.15)",
          color:
            score === 1 ? "var(--color-status-done)" : "var(--destructive)",
          border: `1px solid ${score === 1 ? "rgba(48, 164, 108, 0.3)" : "rgba(229, 70, 102, 0.3)"}`,
        }}
      >
        {score === 1 ? (
          <>
            <Check className="h-3 w-3" /> Met
          </>
        ) : (
          <>
            <X className="h-3 w-3" /> Not Met
          </>
        )}
      </span>
    );
  }

  if (valueType === "rating_5") {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              className="h-3.5 w-3.5"
              style={{
                fill:
                  idx < Math.round(score)
                    ? "var(--color-status-reserved)"
                    : "none",
                color:
                  idx < Math.round(score)
                    ? "var(--color-status-reserved)"
                    : "var(--border)",
              }}
            />
          ))}
        </div>
        <span
          className="font-data font-bold text-[11px] ml-1.5"
          style={{ color: "var(--text-2)" }}
        >
          {score} / 5
        </span>
      </div>
    );
  }

  if (valueType === "rating_10") {
    return (
      <span
        className="font-data font-bold text-[12px]"
        style={{ color: "var(--accent)" }}
      >
        {score} / 10
      </span>
    );
  }

  // percentage
  return (
    <span
      className="font-data font-bold text-[12px]"
      style={{ color: "var(--accent)" }}
    >
      {score}%
    </span>
  );
}

// ─── Label (Compact, for inline header badges) ─────────────────────────

interface ScoreLabelProps {
  valueType: ValueType;
  score: number;
}

/**
 * Compact text label for a score, shown in form headers alongside the input.
 * E.g. "5 / 5", "10 / 10", "100%", "Met" / "Not Met".
 */
export function ScoreLabel({ valueType, score }: ScoreLabelProps) {
  if (valueType === "boolean") {
    return null; // boolean uses the toggle button instead
  }

  if (valueType === "rating_5") {
    return (
      <span
        className="font-data text-[11px] font-bold"
        style={{ color: "var(--accent)" }}
      >
        {score} / 5
      </span>
    );
  }

  if (valueType === "rating_10") {
    return (
      <span
        className="font-data text-[11px] font-bold"
        style={{ color: "var(--accent)" }}
      >
        {score} / 10
      </span>
    );
  }

  return (
    <span
      className="font-data text-[11px] font-bold"
      style={{ color: "var(--accent)" }}
    >
      {score}%
    </span>
  );
}

// ─── Input (Editable) ──────────────────────────────────────────────────

interface ScoreInputProps {
  valueType: ValueType;
  score: number;
  onChange: (newScore: number) => void;
}

/**
 * Editable score input — renders:
 * - Toggle button for boolean
 * - Star selector for rating_5
 * - Range slider for rating_10 and percentage
 */
export function ScoreInput({ valueType, score, onChange }: ScoreInputProps) {
  if (valueType === "boolean") {
    return (
      <button
        type="button"
        onClick={() => onChange(score === 1 ? 0 : 1)}
        className="rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition"
        style={{
          background:
            score === 1 ? "var(--color-status-done)" : "var(--surface-2)",
          color: score === 1 ? "#fff" : "var(--text-2)",
        }}
      >
        {score === 1 ? "Met" : "Not Met"}
      </button>
    );
  }

  if (valueType === "rating_5") {
    return (
      <div className="flex items-center gap-1 mt-1 animate-in fade-in duration-200">
        {Array.from({ length: 5 }).map((_, idx) => {
          const starVal = idx + 1;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(starVal)}
              className="transition hover:scale-110"
            >
              <Star
                className="h-4.5 w-4.5"
                style={{
                  fill:
                    starVal <= score
                      ? "var(--color-status-reserved)"
                      : "none",
                  color:
                    starVal <= score
                      ? "var(--color-status-reserved)"
                      : "var(--border)",
                }}
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (valueType === "rating_10") {
    return (
      <div className="flex items-center gap-2 mt-1 animate-in fade-in duration-200">
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={score}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
        />
      </div>
    );
  }

  // percentage
  return (
    <div className="flex items-center gap-2 mt-1 animate-in fade-in duration-200">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={score}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );
}

// ─── Progress Bar (for client evaluation display) ──────────────────────

interface ScoreProgressBarProps {
  valueType: ValueType;
  score: number;
}

/**
 * Colored progress bar representation of a score.
 * Used in the client satisfaction review display.
 */
export function ScoreProgressBar({ valueType, score }: ScoreProgressBarProps) {
  // Determine color based on normalized score
  const colorScore = valueType === "rating_5" ? score * 2 : score;
  const scoreColor =
    colorScore >= 8
      ? "var(--color-status-done)"
      : colorScore >= 5
        ? "var(--color-status-reserved)"
        : "var(--destructive)";

  // Calculate progress width
  let progressWidth = "0%";
  if (valueType === "boolean") progressWidth = score === 1 ? "100%" : "0%";
  else if (valueType === "rating_5") progressWidth = `${score * 20}%`;
  else if (valueType === "percentage") progressWidth = `${score}%`;
  else progressWidth = `${score * 10}%`; // rating_10

  if (valueType === "rating_5") {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            className="h-4.5 w-4.5"
            style={{
              fill:
                idx < Math.round(score)
                  ? "var(--color-status-reserved)"
                  : "none",
              color:
                idx < Math.round(score)
                  ? "var(--color-status-reserved)"
                  : "var(--border)",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: progressWidth, background: scoreColor }}
      />
    </div>
  );
}

/**
 * Returns the formatted text representation of a score value.
 */
export function getScoreText(
  valueType: ValueType,
  score: number
): string {
  if (valueType === "boolean") return score === 1 ? "Met" : "Not Met";
  if (valueType === "rating_5") return `${score} / 5`;
  if (valueType === "percentage") return `${score}%`;
  return `${score} / 10`;
}

/**
 * Returns the color for a score based on its normalized value.
 */
export function getScoreColor(valueType: ValueType, score: number): string {
  const colorScore = valueType === "rating_5" ? score * 2 : score;
  if (colorScore >= 8) return "var(--color-status-done)";
  if (colorScore >= 5) return "var(--color-status-reserved)";
  return "var(--destructive)";
}

/**
 * Returns the default/perfect score for a given value type.
 */
export function getDefaultScore(valueType: ValueType): number {
  if (valueType === "boolean") return 1;
  if (valueType === "rating_5") return 5;
  if (valueType === "percentage") return 100;
  return 10;
}

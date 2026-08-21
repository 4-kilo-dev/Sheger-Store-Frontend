type ValueType = "rating_2";

interface ScoreProps {
  valueType: ValueType;
  score: number;
}

const scoreColor = (score: number) => {
  if (score >= 2) return "var(--color-status-done)";
  if (score >= 1) return "var(--color-status-reserved)";
  return "var(--destructive)";
};

export function ScoreDisplay({ score }: ScoreProps) {
  return (
    <span className="font-data text-[12px] font-bold" style={{ color: scoreColor(score) }}>
      {score} / 2
    </span>
  );
}

export function ScoreLabel({ score }: ScoreProps) {
  return (
    <span className="font-data text-[11px] font-bold" style={{ color: scoreColor(score) }}>
      {score} / 2
    </span>
  );
}

interface ScoreInputProps extends ScoreProps {
  onChange: (newScore: number) => void;
}

export function ScoreInput({ score, onChange }: ScoreInputProps) {
  return (
    <div className="mt-1 flex items-center gap-2 animate-in fade-in duration-200">
      <input
        type="range"
        min="0"
        max="2"
        step="1"
        value={score}
        onChange={(event) => onChange(parseInt(event.target.value, 10) || 0)}
        className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-[var(--border)] accent-[var(--accent)]"
      />
    </div>
  );
}

export function ScoreProgressBar({ score }: ScoreProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(score, 2)) * 50}%`, background: scoreColor(score) }}
      />
    </div>
  );
}

export function getScoreText(_valueType: ValueType, score: number): string {
  return `${score} / 2`;
}

export function getScoreColor(_valueType: ValueType, score: number): string {
  return scoreColor(score);
}

export function getDefaultScore(_valueType: ValueType): number {
  return 2;
}

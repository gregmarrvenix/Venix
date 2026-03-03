const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

function formatBuildTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-600">
      <span>Venix Time Tracker v{version}</span>
      <span className="mx-2">·</span>
      <span>Last Published: {formatBuildTime(buildTime)}</span>
    </footer>
  );
}

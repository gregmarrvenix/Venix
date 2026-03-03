const AEST_TIMEZONE = "Australia/Sydney";

export function nowAEST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: AEST_TIMEZONE })
  );
}

export function todayAEST(): string {
  return nowAEST().toISOString().split("T")[0];
}

export function currentTimeAEST(): string {
  const now = nowAEST();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

export function calculateHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

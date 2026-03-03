// Harvest API response types

export interface HarvestClient {
  id: number;
  name: string;
}

export interface HarvestProject {
  id: number;
  name: string;
}

export interface HarvestUser {
  id: number;
  name: string;
}

export interface HarvestTask {
  id: number;
  name: string;
}

export interface HarvestTimeEntry {
  id: number;
  spent_date: string;
  started_time: string | null;
  ended_time: string | null;
  hours: number;
  notes: string | null;
  client: HarvestClient;
  project: HarvestProject;
  user: HarvestUser;
  task: HarvestTask;
}

export interface HarvestTimeEntriesResponse {
  time_entries: HarvestTimeEntry[];
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  page: number;
}

// Mapping types for the import wizard

export interface ClientMapping {
  harvestId: number;
  harvestName: string;
  venixCustomerId: string | null; // null = "Create New"
}

export interface ProjectMapping {
  harvestId: number;
  harvestName: string;
  harvestClientId: number;
  venixProjectId: string | null; // null = "Create New"
}

export interface UserMapping {
  harvestId: number;
  harvestName: string;
  venixContractorId: string;
}

export interface ImportEntry {
  contractor_id: string;
  customer_id: string;
  project_id: string;
  entry_date: string;
  start_time: string;
  end_time: string;
  description: string;
}

/**
 * Parse Harvest time format ("8:00am", "10:30pm") to 24h format ("08:00", "22:30")
 */
export function parseHarvestTime(timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return "00:00";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toLowerCase();
  if (period === "am" && h === 12) h = 0;
  else if (period === "pm" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${m}`;
}

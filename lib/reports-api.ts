// Teacher report endpoints (docs/api/reports.md). A report's detail is the activity's
// teacher state: see `activitiesApi.teacherState`.
import { api, apiDownload, ApiError } from "./api";
import type { Report } from "./types";

type Options = { signal?: AbortSignal };

/** The browser's IANA time zone, so the CSV's times match what the teacher sees. */
function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Starts a browser download of `blob` as `filename`. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the URL after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const reportsApi = {
  /** ENDED activities, newest first. `roomId` limits them to one room (404 if not yours). */
  list: ({ roomId, ...options }: Options & { roomId?: number } = {}) =>
    api.get<Report[]>(roomId === undefined ? "/activities" : `/activities?room=${roomId}`, options),
  /** 409 `activity_live` while it's running. 404 once it's gone: treat that as done. */
  remove: (id: number) => api.delete<void>(`/activities/${id}`),
  /**
   * Fetches the report's CSV and saves it (PRD RP3). Times are in the browser's zone, or
   * UTC if the API doesn't know that zone.
   */
  async downloadCsv(report: { id: number; roomCode: string | null; startedAt: string }) {
    const path = `/activities/${report.id}/report.csv`;
    const tz = browserTimeZone();
    let file;
    try {
      file = await apiDownload(tz ? `${path}?tz=${encodeURIComponent(tz)}` : path, {
        accept: "text/csv",
      });
    } catch (error) {
      if (!(tz && error instanceof ApiError && error.fields.tz)) throw error;
      file = await apiDownload(path, { accept: "text/csv" });
    }
    // The same name the API sends, for when Content-Disposition isn't exposed to us.
    const day = new Date(report.startedAt).toISOString().slice(0, 10);
    const fallback = report.roomCode
      ? `report-${report.roomCode}-${day}-${report.id}.csv`
      : `report-${day}-${report.id}.csv`;
    saveBlob(file.blob, file.filename ?? fallback);
  },
};

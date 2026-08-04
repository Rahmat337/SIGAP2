/**
 * Utility functions for WITA (Asia/Makassar, UTC+8) timezone formatting.
 * School Location: MTsN 2 Bombana, Southeast Sulawesi.
 */

export const WITA_TIMEZONE = "Asia/Makassar";

/**
 * Returns today's date in YYYY-MM-DD format based on WITA (Asia/Makassar) timezone.
 */
export const getWitaISO = (d: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: WITA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
};

/**
 * Returns the Indonesian day name ("Minggu", "Senin", etc.) for a Date or date string in WITA timezone.
 */
export const getWitaDayName = (d: Date | string = new Date()): string => {
  try {
    let dateObj: Date;
    if (typeof d === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-").map(Number);
        dateObj = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
      } else {
        dateObj = new Date(d);
      }
    } else {
      dateObj = d;
    }
    const dayName = new Intl.DateTimeFormat("id-ID", {
      timeZone: WITA_TIMEZONE,
      weekday: "long",
    }).format(dateObj);

    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  } catch (e) {
    return "Senin";
  }
};

/**
 * Returns time string "HH:mm" in WITA timezone.
 */
export const getWitaTimeString = (d: Date = new Date()): string => {
  try {
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: WITA_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return parts.replace(".", ":").padStart(5, "0");
  } catch (e) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
};

/**
 * Backwards compatible getLocalISO
 */
export const getLocalISO = (): string => {
  return getWitaISO(new Date());
};

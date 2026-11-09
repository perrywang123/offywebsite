/** Node-only optional GeoLite2 Country reader. Credentials belong to the updater, not the app. */
import { readFileSync, statSync } from "node:fs";
import { Reader, type CountryResponse } from "maxmind";
import geoip from "geoip-lite";
import { normalizeMarketCountry } from "./market";
export function createCountryLookup(path: string) {
  let reader: Reader<CountryResponse> | undefined,
    lastChecked = -Infinity,
    fingerprint = "";
  return (ip: string): string | undefined => {
    if (path && Date.now() - lastChecked > 60_000) {
      lastChecked = Date.now();
      try {
        const stat = statSync(path),
          next = `${stat.mtimeMs}:${stat.size}`;
        if (next !== fingerprint) {
          // GeoIP Update replaces the file atomically. Fully validate before swapping readers.
          const candidate = new Reader<CountryResponse>(readFileSync(path));
          if (!/Country$/.test(candidate.metadata.databaseType))
            throw new Error("not_country_database");
          reader = candidate;
          fingerprint = next;
        }
      } catch {
        /* Missing/malformed updates never discard the last known-good IP database. */
      }
    }
    if (reader) {
      try {
        return normalizeMarketCountry(reader.get(ip)?.country?.iso_code);
      } catch {
        return undefined;
      }
    }
    try {
      return normalizeMarketCountry(geoip.lookup(ip)?.country);
    } catch {
      return undefined;
    }
  };
}

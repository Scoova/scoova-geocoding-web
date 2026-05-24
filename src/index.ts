/**
 * @scoova/geocoding
 *
 * Pelias-compatible client for `geocoding.scoo-va.info`. Forward search,
 * autocomplete, reverse, place lookup, structured search, and batch
 * (up to 100 mixed forward/reverse queries in one request).
 *
 *     const client = new GeocodingClient({
 *       apiKey: process.env.SCOOVA_API_KEY,
 *       locale: 'fr',
 *     });
 *
 *     const hit = await client.search('Tour Eiffel');
 *     const rev = await client.reverse(48.8584, 2.2945);
 *     const bat = await client.batch([
 *       { id: 'a', text: 'Times Square' },
 *       { id: 'b', lat: 40.748, lon: -73.985 },
 *     ]);
 */

export type GeoLayer =
  | 'venue' | 'address' | 'street' | 'neighbourhood' | 'borough'
  | 'localadmin' | 'locality' | 'county' | 'macrocounty' | 'region'
  | 'macroregion' | 'country' | 'coarse' | 'postalcode';

export type GeoSource = 'osm' | 'oa' | 'wof' | 'gn' | 'whosonfirst' | 'openstreetmap' | 'openaddresses' | 'geonames';

export interface SearchOptions {
  /** Bias results toward this point (lat, lon). */
  focusPoint?: { lat: number; lon: number };
  /** Restrict to a circle around (lat, lon, radiusKm). */
  boundaryCircle?: { lat: number; lon: number; radiusKm: number };
  /** Restrict to a country (ISO-3166 alpha-2 or alpha-3). */
  boundaryCountry?: string | string[];
  /** Bounding rect: [minLon, minLat, maxLon, maxLat]. */
  boundaryRect?: [number, number, number, number];
  /** Restrict to specific layers. */
  layers?: GeoLayer[];
  /** Restrict to specific data sources. */
  sources?: GeoSource[];
  /** Result count, 1-40. Default 10. */
  size?: number;
  /** Preferred language (e.g. 'en', 'ar', 'ar-EG'). Overrides client default. */
  lang?: string;
}

export interface ReverseOptions {
  /** Result count, 1-40. Default 10. */
  size?: number;
  /** Restrict to specific layers. */
  layers?: GeoLayer[];
  /** Restrict to specific data sources. */
  sources?: GeoSource[];
  /** Restrict to a circle. radius is in km. */
  boundaryCircleRadiusKm?: number;
  /** Restrict to a country. */
  boundaryCountry?: string | string[];
  lang?: string;
}

export interface AutocompleteOptions {
  focusPoint?: { lat: number; lon: number };
  boundaryCountry?: string | string[];
  layers?: GeoLayer[];
  sources?: GeoSource[];
  size?: number;
  lang?: string;
}

export interface StructuredQuery {
  address?: string;
  neighbourhood?: string;
  borough?: string;
  locality?: string;
  county?: string;
  region?: string;
  postalcode?: string;
  country?: string;
}

export interface PlaceId {
  source: string;
  layer: string;
  id: string;
}

/** Pelias result feature — minimal typed shape; full payload available via `properties`. */
export interface GeoFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id?: string;
    gid?: string;
    layer?: string;
    source?: string;
    name?: string;
    label?: string;
    country?: string;
    country_code?: string;
    region?: string;
    locality?: string;
    neighbourhood?: string;
    street?: string;
    housenumber?: string;
    postalcode?: string;
    confidence?: number;
    accuracy?: string;
    [key: string]: unknown;
  };
}

export interface GeoResponse {
  type: 'FeatureCollection';
  features: GeoFeature[];
  geocoding?: {
    version?: string;
    attribution?: string;
    query?: Record<string, unknown>;
    timestamp?: number;
  };
  bbox?: [number, number, number, number];
}

/** One item in a `batch()` request — either a forward query (`text`) or a
 *  reverse one (`lat` + `lon`). An optional `id` is echoed back unchanged so
 *  callers can join results to their own records. */
export interface BatchQuery {
  id?: string;
  text?: string;
  lat?: number;
  lon?: number;
}

export interface BatchResultRow {
  id: string | null;
  top?: GeoFeature | null;
  error?: string;
}

export interface BatchResponse {
  count: number;
  results: BatchResultRow[];
}

export class GeocodingError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GeocodingError';
  }
}

const DEFAULT_BASE = 'https://geocoding.scoo-va.info';

export interface ClientOptions {
  /**
   * Scoova API key. Sent as `X-API-Key`. Falls back to
   * `process.env.SCOOVA_API_KEY`, then to the public `demo` key. The demo
   * key is rate-limited; ship a real one for production traffic.
   */
  apiKey?: string;
  /** Override the gateway base (defaults to https://geocoding.scoo-va.info). */
  baseUrl?: string;
  /**
   * Default locale for every response that carries localised labels.
   * Accepted: `en`, `en-US`, `en-GB`, `fr`, `es`, `de`, `it`, `pt-BR`,
   * `nl`, `ar`, `ar-EG`, `ar-SA`, `ar-LB`, `ar-MA`, and regional variants.
   * Unsupported codes fall back to `en` server-side. Per-call `lang`
   * overrides this. Defaults to `en`.
   */
  locale?: string;
  /** Legacy alias for `locale`. If both are set, `locale` wins. */
  lang?: string;
  /** Identifier the gateway uses for key-restriction enforcement. */
  androidPackage?: string;
  iosBundleId?: string;
  /** Provide a `fetch` for environments where it isn't global (older Node). */
  fetch?: typeof fetch;
}

function resolveApiKey(supplied?: string): string {
  if (supplied) return supplied;
  // Pick up SCOOVA_API_KEY in node-ish environments without dragging in
  // @types/node — go through globalThis so this still compiles under DOM-only
  // `lib`. Browsers won't have it; they'll fall back to `demo`.
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.SCOOVA_API_KEY ?? 'demo';
}

export class GeocodingClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultLang: string;
  private fetchImpl: typeof fetch;
  private androidPackage?: string;
  private iosBundleId?: string;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.apiKey = resolveApiKey(opts.apiKey);
    // `locale` is the canonical option, but accept `lang` as a back-compat
    // alias since the 1.0 release used that name.
    this.defaultLang = opts.locale ?? opts.lang ?? 'en';
    this.androidPackage = opts.androidPackage;
    this.iosBundleId = opts.iosBundleId;
    const f = opts.fetch ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!f) throw new GeocodingError('GeocodingClient: no fetch available — pass one in options');
    // Bind globalThis fetch so it stays callable.
    this.fetchImpl = opts.fetch ?? f.bind(typeof globalThis !== 'undefined' ? globalThis : null);
  }

  /** Forward search — "Burj Khalifa" → list of features. */
  async search(text: string, options: SearchOptions = {}): Promise<GeoResponse> {
    const params: Record<string, string> = { text };
    this.applySearchParams(params, options);
    return this.get<GeoResponse>('/v1/search', params);
  }

  /** Autocomplete — partial-text suggestions for typeaheads. */
  async autocomplete(text: string, options: AutocompleteOptions = {}): Promise<GeoResponse> {
    const params: Record<string, string> = { text };
    this.applyAutocompleteParams(params, options);
    return this.get<GeoResponse>('/v1/autocomplete', params);
  }

  /** Reverse geocode — coordinates → list of nearby features. */
  async reverse(lat: number, lon: number, options: ReverseOptions = {}): Promise<GeoResponse> {
    const params: Record<string, string> = {
      'point.lat': String(lat),
      'point.lon': String(lon),
    };
    if (options.size !== undefined) params.size = String(options.size);
    if (options.layers?.length) params.layers = options.layers.join(',');
    if (options.sources?.length) params.sources = options.sources.join(',');
    if (options.boundaryCircleRadiusKm !== undefined) params['boundary.circle.radius'] = String(options.boundaryCircleRadiusKm);
    if (options.boundaryCountry) params['boundary.country'] = Array.isArray(options.boundaryCountry) ? options.boundaryCountry.join(',') : options.boundaryCountry;
    params.lang = options.lang ?? this.defaultLang;
    return this.get<GeoResponse>('/v1/reverse', params);
  }

  /** Lookup by Pelias gid (e.g. `whosonfirst:locality:101751119`). */
  async place(ids: string | string[]): Promise<GeoResponse> {
    const params: Record<string, string> = {
      ids: Array.isArray(ids) ? ids.join(',') : ids,
      lang: this.defaultLang,
    };
    return this.get<GeoResponse>('/v1/place', params);
  }

  /** Structured search — address, locality, country broken into fields. */
  async searchStructured(query: StructuredQuery, options: SearchOptions = {}): Promise<GeoResponse> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) if (v) params[k] = String(v);
    this.applySearchParams(params, options);
    return this.get<GeoResponse>('/v1/search/structured', params);
  }

  /**
   * Batch geocode — up to 100 mixed forward (`text`) or reverse
   * (`lat` + `lon`) queries in a single round-trip. Each result is
   * returned in input order with the supplied `id` echoed back.
   *
   * The server runs this synchronously: response time is roughly that
   * of the slowest individual query, not the sum.
   */
  async batch(queries: BatchQuery[]): Promise<BatchResponse> {
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new GeocodingError('batch: queries cannot be empty');
    }
    if (queries.length > 100) {
      throw new GeocodingError('batch: max 100 items per request');
    }
    const url = this.buildUrl('/v1/batch', { lang: this.defaultLang });
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ items: queries }),
    });
    const body = await res.text();
    if (!res.ok) throw new GeocodingError(body.slice(0, 200), res.status);
    let parsed: { success?: boolean; data?: BatchResponse } | BatchResponse;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      throw new GeocodingError(`batch: invalid JSON — ${(e as Error).message}`);
    }
    // The gateway wraps `{ success, data }`; if so, unwrap.
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed && parsed.data) {
      return parsed.data as BatchResponse;
    }
    return parsed as BatchResponse;
  }

  // ─── internals ─────────────────────────────────────────────────────

  private applySearchParams(params: Record<string, string>, o: SearchOptions): void {
    if (o.focusPoint) {
      params['focus.point.lat'] = String(o.focusPoint.lat);
      params['focus.point.lon'] = String(o.focusPoint.lon);
    }
    if (o.boundaryCircle) {
      params['boundary.circle.lat'] = String(o.boundaryCircle.lat);
      params['boundary.circle.lon'] = String(o.boundaryCircle.lon);
      params['boundary.circle.radius'] = String(o.boundaryCircle.radiusKm);
    }
    if (o.boundaryRect) {
      const [minLon, minLat, maxLon, maxLat] = o.boundaryRect;
      params['boundary.rect.min_lon'] = String(minLon);
      params['boundary.rect.min_lat'] = String(minLat);
      params['boundary.rect.max_lon'] = String(maxLon);
      params['boundary.rect.max_lat'] = String(maxLat);
    }
    if (o.boundaryCountry) params['boundary.country'] = Array.isArray(o.boundaryCountry) ? o.boundaryCountry.join(',') : o.boundaryCountry;
    if (o.layers?.length) params.layers = o.layers.join(',');
    if (o.sources?.length) params.sources = o.sources.join(',');
    if (o.size !== undefined) params.size = String(o.size);
    params.lang = o.lang ?? this.defaultLang;
  }

  private applyAutocompleteParams(params: Record<string, string>, o: AutocompleteOptions): void {
    if (o.focusPoint) {
      params['focus.point.lat'] = String(o.focusPoint.lat);
      params['focus.point.lon'] = String(o.focusPoint.lon);
    }
    if (o.boundaryCountry) params['boundary.country'] = Array.isArray(o.boundaryCountry) ? o.boundaryCountry.join(',') : o.boundaryCountry;
    if (o.layers?.length) params.layers = o.layers.join(',');
    if (o.sources?.length) params.sources = o.sources.join(',');
    if (o.size !== undefined) params.size = String(o.size);
    params.lang = o.lang ?? this.defaultLang;
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    // `locale=` rides alongside per-call `lang=`; the gateway honours the
    // first one it understands. Including both keeps SDK behaviour identical
    // when callers override `lang` on a single request.
    const merged: Record<string, string> = { locale: this.defaultLang, ...params };
    const qs = new URLSearchParams(merged).toString();
    return `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept-Language': this.defaultLang,
    };
    if (this.androidPackage) h['X-Android-Package'] = this.androidPackage;
    if (this.iosBundleId) h['X-Ios-Bundle-Identifier'] = this.iosBundleId;
    return h;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await this.fetchImpl(url, {
      headers: { ...this.authHeaders(), Accept: 'application/json' },
    });
    const body = await res.text();
    if (!res.ok) throw new GeocodingError(body.slice(0, 200), res.status);
    try {
      return JSON.parse(body) as T;
    } catch (e) {
      throw new GeocodingError(`Invalid JSON from ${url}: ${(e as Error).message}`);
    }
  }
}

/** Convenience: extract `[lon, lat]` from a feature. */
export function featureCoord(f: GeoFeature): [number, number] {
  return f.geometry.coordinates;
}

/** Convenience: extract the human label ("Cairo, Egypt") from a feature. */
export function featureLabel(f: GeoFeature): string {
  return (f.properties.label as string) ?? (f.properties.name as string) ?? '';
}

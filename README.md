# @scoova/geocoding

Geocoding geocoding client for `api.scoo-va.info/api/v1/geocoding` — forward
search, autocomplete, reverse, place lookup, structured search, and a
synchronous batch endpoint (up to 100 mixed forward/reverse queries per
request).

```sh
npm install @scoova/geocoding
```

```ts
import { GeocodingClient, featureLabel } from '@scoova/geocoding';

const client = new GeocodingClient({
  apiKey: process.env.SCOOVA_API_KEY, // falls back to 'demo' if omitted
  locale: 'fr',                       // default Accept-Language + ?locale=
});

// Forward search, biased to Cairo
const cairoCoffee = await client.search('coffee', {
  focusPoint: { lat: 30.04, lon: 31.24 },
  size: 10,
  lang: 'ar-EG', // per-call override
});

// Autocomplete
const suggestions = await client.autocomplete('Cair');

// Reverse
const nearby = await client.reverse(30.04, 31.24, { size: 1 });

// Place lookup
const place = await client.place('place data:locality:101751119');

// Batch — up to 100 items, one round-trip
const batch = await client.batch([
  { id: 'a', text: 'Times Square' },
  { id: 'b', lat: 40.7484, lon: -73.9857 }, // reverse
]);
for (const row of batch.results) {
  console.log(row.id, row.top ? featureLabel(row.top) : row.error);
}
```

## Client options

| option           | type     | default                            | notes                                  |
| ---------------- | -------- | ---------------------------------- | -------------------------------------- |
| `apiKey`         | `string` | `SCOOVA_API_KEY` env, then `demo`  | sent as `X-API-Key`                    |
| `baseUrl`        | `string` | `https://api.scoo-va.info/api/v1/geocoding` |                                   |
| `locale`         | `string` | `'en'`                             | `?locale=` + `Accept-Language`         |
| `lang`           | `string` | —                                  | legacy alias for `locale`              |
| `androidPackage` | `string` | —                                  | `X-Android-Package` for key restrict   |
| `iosBundleId`    | `string` | —                                  | `X-Ios-Bundle-Identifier`              |
| `fetch`          | `fetch`  | `globalThis.fetch`                 | for older Node                         |

## API

- `search(text, options)` — `/v1/search`
- `autocomplete(text, options)` — `/v1/autocomplete`
- `reverse(lat, lon, options)` — `/v1/reverse`
- `place(ids)` — `/v1/place`
- `searchStructured(query, options)` — `/v1/search/structured`
- `batch(queries)` — `/v1/batch` (POST, max 100 items)

## Tests

```
npm test
```

Covers URL construction, batch wire shape, locale + API-key headers, and
error wrapping.

## License

Apache-2.0 — see [LICENSE](./LICENSE).

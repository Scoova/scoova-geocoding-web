# @scoova/geocoding — Cross-platform Parity

Five SDKs, one API surface. All target the Geocoding endpoints at
`geocoding.scoo-va.info`.

| Platform     | Package / Path                                                  | Tests  |
|--------------|-----------------------------------------------------------------|--------|
| Web (TS)     | `@scoova/geocoding` — `/scoova-geocoding-web`                   | 8 ✅   |
| React Native | `@scoova/geocoding-react-native` — `/scoova-geocoding-react-native` | 7 ✅ |
| Flutter      | `scoova_geocoding` — `/scoova_geocoding_flutter`                | 7 ✅   |
| iOS Swift    | `ScoovaGeocodingKit` — `/ScoovaGeocodingKit`                    | 3 ✅   |
| Android JVM  | `info.scoo-va:scoova-geocoding` — `/scoova-geocoding-android`   | 6 ✅   |

## Common surface

```
GeocodingClient(baseUrl?)
  search(text, options?)             → GeoResponse { features }
  autocomplete(text, options?)       → GeoResponse
  reverse(lat, lon, options?)        → GeoResponse
  place(ids)                         → GeoResponse
  searchStructured(query, options?)  → GeoResponse
```

Common option fields: `focusPoint`, `boundaryCircle`, `boundaryRect`,
`boundaryCountry`, `layers`, `sources`, `size`, `lang`. Defaults match the Scoova geocoding service —
no layer or source restrictions, default `size=10`, language falls back to `en`.

## Parity table after this session

| Domain      | iOS  | Android | RN   | Flutter | Web  |
|-------------|------|---------|------|---------|------|
| Navigation  | ✅   | ✅      | ✅   | ✅      | ✅   |
| Weather     | ✅   | ✅      | ✅   | ✅      | ✅   |
| Routing     | ✅   | ✅      | ✅   | ✅      | ✅   |
| Geocoding   | ✅   | ✅      | ✅   | ✅      | ✅   |
| Maps        | partial | partial | ❌ | ❌      | partial |

# V32 multipage + product map

## Purpose

V32 separates destination intelligence from commercial stay inventory:

- `/ai-map` + `/en/ai-map`: destination-level AI ranking.
- `/stays-map` + `/en/stays-map`: real accommodation/product markers from `stay_places` + `stay_offers`.

The stay map never invents products, coordinates, prices, ratings or availability.

## Map engine

The client uses Google Maps when this public browser key is configured at build time:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Restrict the key in Google Cloud to the production web origins and the Maps JavaScript API. Do not use a server or unrestricted key.

If the key is missing or Google Maps fails to load, V32 automatically falls back to Leaflet + OpenStreetMap. The existing optional tile override remains supported:

```env
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

## Product data

The public Next.js endpoint `/api/stay-map` calls the Supabase Edge Function `stay-product-map-v32`. The edge function reads server-side with the Supabase service role but returns only a safe product projection:

- product/place IDs
- property name and location/address
- latitude/longitude
- category/image
- price/full price/discount/currency
- sale/availability truth/valid-to
- demand ordering signal
- affiliate tracking URL

No Supabase service-role key or provider API secret is sent to the browser.

Optional server override:

```env
SUPABASE_STAY_PRODUCT_MAP_V32_URL=https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/stay-product-map-v32
```

## Availability truth

Current supplier rows commonly have `in_stock = null`. V32 therefore does not interpret `null` as unavailable. It excludes explicit `in_stock = false` and expired `valid_to` rows. Unknown stock is labelled `valid-window-stock-unknown`, and users are told to confirm price and availability on the partner page.

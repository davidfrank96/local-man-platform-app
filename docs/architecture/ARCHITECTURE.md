## Title
The Local Man — Architecture Overview

## Architecture Goal
Provide a stable, maintainable, and AI-friendly architecture for a map-based local vendor discovery platform.

## Chosen Stack
### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- App Router

### Backend Services
- Supabase PostgreSQL
- Supabase Auth for admin users only
- Supabase Storage for vendor images

### Maps
- Google Maps deep link for directions
- lightweight internal reverse geocoding route for human-readable public location labels
- real Google Maps JavaScript integration remains optional future work, not a current dependency

### Deployment
- DigitalOcean App Platform for the deployed app
- local development and smoke testing use `http://localhost:3000`
- Supabase managed backend

## Why This Stack
- fast MVP delivery
- easy for AI agents to reason about
- typed and maintainable
- avoids excessive backend boilerplate
- strong ecosystem support

## System Components
### Public App
Handles:
- geolocation
- reverse location label display
- lightweight map rendering
- nearby vendors query
- search and filter UI
- selected vendor preview and selected-card highlight
- vendor detail pages
- call and directions actions
- browser-back and `Back to map` state restoration

### Admin App
Handles:
- admin authentication
- vendor creation and editing
- image uploads
- hours updates
- category and dish management
- visibility control

### Database
Stores:
- vendors
- vendor hours
- categories
- dishes
- images
- ratings
- admin users
- audit logs

## Architecture Principles
1. Keep the public app read-heavy and simple.
2. Keep admin workflows explicit and controlled.
3. Avoid microservices.
4. Prefer server-side validation for writes.
5. Use docs as the source of truth.
6. Build for Abuja pilot before scale.

## Public App Flow
1. User opens app
2. App requests or detects location
3. App fetches nearby vendors
4. Vendors render on map and list
5. User opens vendor detail
6. User calls vendor or opens directions

## User Location Handling

The public app determines the user location before nearby vendor search.

Primary method:
- Browser/device geolocation through the Web Geolocation API.
- If allowed, use precise `lat` and `lng` with `location_source = precise`.
- Request high accuracy from the browser with a 10 second timeout and a low maximum age to avoid stale positions.
- Wait up to 10 seconds for the browser geolocation request before falling back.
- Show `Using your current location` with a compact `High accuracy` trust label.
- Display a human-readable area label when reverse lookup succeeds; otherwise fall back to rounded coordinates.

Fallback method:
- IP-based approximation when browser geolocation is denied or unavailable.
- If available, use approximate `lat` and `lng` with `location_source = approximate`.
- Treat this as low accuracy and avoid implying exact proximity.
- Show `Using approximate location` and tell the user to turn on location for exact nearby results.

Default city fallback:
- If precise and approximate coordinates are unavailable, use the Abuja default city view.
- Default coordinates are the Abuja city center approximation.
- Use `location_source = default_city`.
- Show `Showing Abuja` and explain that enabling location improves nearby results.

Location handling rules:
- Distance is calculated from the resolved search location, not persisted.
- Precise and approximate coordinates use the same nearby vendor query path.
- Missing coordinates are handled gracefully by falling back to Abuja.
- Partial coordinates, such as only `lat` or only `lng`, are invalid.
- Denied or unavailable precise location should fall back to IP approximation first, then the Abuja default city view if approximation is unavailable.

Implementation interface:
- `lib/location/acquisition.ts` owns the acquisition sequence and provider interfaces.
- `hooks/use-user-location.ts` is the active public UI hook for location acquisition and retry.
- `app/api/location/reverse/route.ts` and `lib/location/reverse-geocode.ts` format human-readable area labels without blocking vendor loading.
- IP approximation is represented as an injectable provider; a concrete vendor endpoint is not selected yet.

## Admin Flow
1. Admin logs in
2. Admin adds or edits vendor
3. Admin uploads images and dishes
4. Admin sets vendor hours and categories
5. Admin saves changes
6. System logs action in audit log

## Vendor Image Storage

Uploaded vendor images are stored in the Supabase `vendor-images` bucket.

Implementation rules:
- the admin route uploads the file after validating type and size
- the database stores both the public `image_url` and the `storage_object_path`
- the public app renders `image_url`
- the admin app removes images by deleting the storage object first and then the database row
- seed or legacy URLs may leave `storage_object_path` null, but uploaded images should not

## Core Product Logic
### Open Now
Supports:
- same-day hours
- overnight hours
- manual override

### Distance
Based on user location and vendor coordinates.

## Distance Calculation

Distance between user and vendor is calculated dynamically using coordinates.

Preferred method:
- Haversine formula or database-level geospatial query

Distance is returned in kilometers and rounded for display.

Distance is never stored in the database.

Current implementation:
- API validates user `lat` and `lng`.
- Supabase candidate query uses a latitude/longitude bounding box to reduce scanned rows.
- Application logic calculates exact Haversine distance for each candidate.
- Application logic applies radius filtering and sorts vendors nearest first.
- Default nearby radius is 10 km when `radius_km` is not provided.
- Missing user coordinates resolve to the Abuja default city view before the nearby query runs.

### Directions
Use Google Maps deep links using vendor coordinates.

### Call
Use clickable phone links.

## Security Principles
- admin-only auth
- role-based access for admin operations
- strict input validation
- upload restrictions
- safe environment variable handling
- audit logging for changes

## Non-Functional Requirements
- mobile-first responsiveness
- fast page loads
- graceful fallback if maps fail
- graceful fallback if location permission denied
- image optimization
- clean error handling
- time-based visual theming that does not compromise vendor card readability

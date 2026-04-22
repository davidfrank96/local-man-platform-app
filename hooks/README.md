# Hooks

Shared React hooks belong here after they are needed by more than one component or feature.

- `use-user-location.ts` resolves user location for the public discovery flow:
  browser/device geolocation first, IP approximation second, Abuja default city
  fallback last.

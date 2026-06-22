# Area Governance

Area governance is a data-quality layer for Abuja vendor onboarding. It is separate from public discovery areas.

## Governance Areas

Governance areas are canonical high-level Abuja districts used for:

- manual vendor creation
- CSV normalization and warnings
- reporting
- analytics
- future data cleanup

Governance areas do not control discovery results directly.

### Core

- Wuse
- Jabi
- Utako
- Garki
- Maitama
- Asokoro
- Guzape
- Gwarinpa
- Lugbe
- Kubwa

### Important

- Wuye
- Apo
- Katampe
- Kado
- Life Camp
- Lokogoma
- Durumi
- Gudu
- Galadimawa
- Dawaki

### Growth

- Jahi
- Mabushi
- Dape
- Karsana
- Mpape
- Kaura
- Dakibiyu
- Dei-Dei
- Zuba
- Idu

### Satellite

- Karu
- Nyanya
- Mararaba
- Masaka
- Gwagwalada
- Kuje
- Airport Road Corridor

## Discovery Areas

Discovery areas are curated browsing origins used when GPS is unavailable or a user chooses to browse by area.

Current discovery areas:

- Wuse
- Gwarinpa
- Jabi
- Utako
- Maitama
- Asokoro
- Garki
- Kubwa
- Lugbe

Discovery areas include coordinates. Governance areas do not.

## Normalization

Governance normalization is:

- case insensitive
- whitespace tolerant
- alias aware

Examples:

- `wuse` -> `Wuse`
- `WUSE` -> `Wuse`
- `jabi` -> `Jabi`
- `garki` -> `Garki`

Area aliases include canonical name, lowercase name, uppercase name, and generated id.

## Manual Admin Creation

Manual vendor creation uses a controlled area selector backed by the governance list.

Manual creation blocks arbitrary free-text areas. Agents must select an approved area. Address remains a separate detailed field.

Example:

- Area: `Wuse`
- Address: `Zone 2, Aminu Kano Crescent`

## CSV Intake

CSV intake normalizes known areas and warns on unknown areas.

Known area:

- input: `wuse`
- stored: `Wuse`

Unknown area:

- input: `Wuse Zone 2`
- result: warning
- import: continues

CSV does not reject unknown areas. This avoids import friction while still surfacing data-quality issues.

## Guidance For Production Imports

Use high-level district names in the `area` column. Put streets, markets, zones, plaza names, and landmarks in `address`.

Do not use zone or micro-area values as canonical governance areas.

Examples that should remain address details:

- Wuse Zone 2
- Jabi Bitikuwe Street
- Utako Market
- Arab Junction
- Area 1
- Zone 5

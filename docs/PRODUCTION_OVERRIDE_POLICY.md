# Localman Production Override Policy

This policy defines how approved manual production changes become part of the certified Localman Production Data baseline.

Production is now the operational source of truth for Localman marketplace data. Original onboarding workbooks remain historical source documents. Production overrides do not erase the original source; they provide the approval trail that explains why the certified production baseline may intentionally differ from historical collection data.

## Scope

This policy applies to production vendor data that may legitimately change after onboarding:

- vendor display name
- slug
- phone number
- address
- governance area
- latitude and longitude
- categories
- featured dishes
- vendor descriptions
- dish descriptions
- operating hours

This policy does not authorize silent production edits, import behavior changes, discovery changes, search changes, or ranking changes.

## Source Model

Localman uses this source model after Production Data v1.0:

1. Original onboarding workbooks are historical source evidence.
2. Production database values are the operational source of truth.
3. Approved production overrides are the bridge between historical source evidence and intentional production state.
4. Future certifications pass when production matches either the historical source or an approved override.
5. Future certifications fail only on `UNEXPECTED_CHANGE`, missing approval evidence, or unresolved manual review.

## Classification Model

Future production integrity certifications must classify every checked field as one of:

| Classification | Meaning | Certification Impact |
| --- | --- | --- |
| `SOURCE_MATCH` | Production matches the original source workbook after approved normalization rules. | Pass |
| `APPROVED_PRODUCTION_OVERRIDE` | Production differs from the original source, but the difference is recorded in `docs/PRODUCTION_CHANGELOG.md` with approval evidence. | Pass |
| `UNEXPECTED_CHANGE` | Production differs from both the original source and approved production override records. | Fail |

Production integrity passes only when every checked field is either `SOURCE_MATCH` or `APPROVED_PRODUCTION_OVERRIDE`.

## Approved Production Override

`APPROVED_PRODUCTION_OVERRIDE` is a permanent certification status for a production value that intentionally differs from the original source workbook.

Valid examples include:

- vendor requested a new business name
- vendor changed phone number
- vendor relocated
- vendor changed operating hours
- product owner corrected branding
- content quality improvement
- verified coordinate correction after field review
- featured dishes updated after source or vendor confirmation
- category updated after product/governance review
- governance area corrected after area policy approval
- slug changed for deterministic uniqueness or approved identity correction

## Required Approval Evidence

Every override must be recorded before it can be accepted by certification.

Required fields:

- override ID
- approval date
- approver
- vendor ID or slug
- affected field
- previous value
- approved value
- reason
- evidence source
- status

Allowed statuses:

- `APPROVED`
- `SUPERSEDED`
- `REJECTED`
- `PENDING_REVIEW`

Only `APPROVED` overrides may be used by certification.

## Certification Lookup Order

For each production field, certification must compare values in this order:

1. Original source workbook value.
2. Approved production override in `docs/PRODUCTION_CHANGELOG.md`.
3. Current production value.

Result rules:

- If production equals the source value, classify `SOURCE_MATCH`.
- If production differs from source but equals an approved override value, classify `APPROVED_PRODUCTION_OVERRIDE`.
- If production differs from both, classify `UNEXPECTED_CHANGE`.

## Safety Rules

- Do not infer approval from production state.
- Do not infer approval from generated CSVs alone.
- Do not treat a dashboard or UI value as approval evidence.
- Do not mark an override approved without an approver and evidence source.
- Do not use `PENDING_REVIEW` rows to pass certification.
- Do not use rejected or superseded rows to pass certification.

## Future Audit Rules

Future audits and Codex work must follow these rules:

1. Never treat production differences as automatic errors.
2. Always investigate before correcting.
3. Never overwrite phone, coordinates, governance, vendor identity, or hours without verification.
4. If production differs from workbook, determine whether the cause is `SOURCE_ERROR`, `APPROVED_OVERRIDE`, or `UNEXPECTED_CHANGE`.
5. Never guess vendor identity, phone values, coordinates, hours, local food names, categories, or descriptions.

## Permanent Manual Review Items

Manual review items must remain certification blockers unless they are either:

- corrected in production through an approved operation, or
- recorded as an `APPROVED_PRODUCTION_OVERRIDE`.

Current known manual review item:

- `natures-delight-natural-drink`: display-name and duplicate featured-dish review remains open until approved or corrected.

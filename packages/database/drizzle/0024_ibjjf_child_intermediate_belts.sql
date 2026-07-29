-- Complete the IBJJF children's hierarchy for every existing academy.
-- Existing belt records and student assignments remain untouched.

-- `grey` was used by the development seed before `gray` became canonical.
-- Rename it first so the backfill neither creates duplicate child belts nor loses references.
WITH legacy_slug_map ("legacy_slug", "canonical_slug") AS (
  VALUES
    ('child-grey', 'child-gray'),
    ('child-grey-white', 'child-gray-white'),
    ('child-grey-black', 'child-gray-black')
)
UPDATE "belts" AS legacy
SET "slug" = legacy_slug_map."canonical_slug"
FROM legacy_slug_map
WHERE legacy."slug" = legacy_slug_map."legacy_slug"
  AND NOT EXISTS (
    SELECT 1
    FROM "belts" AS canonical
    WHERE canonical."organization_id" = legacy."organization_id"
      AND canonical."slug" = legacy_slug_map."canonical_slug"
  );

UPDATE "belts"
SET "position" = CASE "slug"
  WHEN 'child-white' THEN 0
  WHEN 'child-gray' THEN 2
  WHEN 'child-yellow' THEN 5
  WHEN 'child-orange' THEN 8
  WHEN 'child-green' THEN 11
  ELSE "position"
END
WHERE "slug" IN ('child-white', 'child-gray', 'child-yellow', 'child-orange', 'child-green');

WITH child_belts ("slug", "name", "position") AS (
  VALUES
    ('child-white', 'Branca', 0),
    ('child-gray-white', 'Cinza / Branca', 1),
    ('child-gray', 'Cinza', 2),
    ('child-gray-black', 'Cinza / Preta', 3),
    ('child-yellow-white', 'Amarela / Branca', 4),
    ('child-yellow', 'Amarela', 5),
    ('child-yellow-black', 'Amarela / Preta', 6),
    ('child-orange-white', 'Laranja / Branca', 7),
    ('child-orange', 'Laranja', 8),
    ('child-orange-black', 'Laranja / Preta', 9),
    ('child-green-white', 'Verde / Branca', 10),
    ('child-green', 'Verde', 11),
    ('child-green-black', 'Verde / Preta', 12)
)
INSERT INTO "belts" (
  "id",
  "organization_id",
  "name",
  "slug",
  "path",
  "position",
  "max_degrees",
  "min_months_for_next_degree",
  "min_attendances_for_next_degree",
  "min_months_for_next_belt",
  "min_attendances_for_next_belt"
)
SELECT
  'ibjjf-' || "organization"."id" || '-' || child_belts."slug",
  "organization"."id",
  child_belts."name",
  child_belts."slug",
  'child',
  child_belts."position",
  4,
  4,
  30,
  12,
  120
FROM "organization"
CROSS JOIN child_belts
ON CONFLICT ("organization_id", "slug") DO NOTHING;

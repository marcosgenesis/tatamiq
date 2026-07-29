-- Complete the IBJJF children's hierarchy for every existing academy.
-- Existing belt records and student assignments remain untouched.

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

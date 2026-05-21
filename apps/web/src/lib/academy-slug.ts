const defaultSuffixFactory = () => Math.random().toString(36).slice(2, 6);

export function createAcademySlug(
  academyName: string,
  suffixFactory: () => string = defaultSuffixFactory,
) {
  const normalized = academyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return `${normalized || "academia"}-${suffixFactory()}`;
}

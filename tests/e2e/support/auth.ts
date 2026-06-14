import path from "node:path";

export const E2E_AUTH_DIR = path.resolve("tests/e2e/.auth");
export const INSTRUCTOR_STORAGE_STATE = path.join(E2E_AUTH_DIR, "instructor.json");

export const INSTRUCTOR_CREDENTIALS = {
  email: "dev@tatamiq.local",
  password: "tatamiq123",
} as const;

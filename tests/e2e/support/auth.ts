import path from "node:path";

export const E2E_AUTH_DIR = path.resolve("tests/e2e/.auth");
export const INSTRUCTOR_STORAGE_STATE = path.join(E2E_AUTH_DIR, "instructor.json");
export const ADMIN_STORAGE_STATE = path.join(E2E_AUTH_DIR, "admin.json");
export const STUDENT_STORAGE_STATE = path.join(E2E_AUTH_DIR, "student.json");

export const INSTRUCTOR_CREDENTIALS = {
  email: "dev@tatamiq.local",
  password: "tatamiq123",
} as const;

export const ADMIN_CREDENTIALS = {
  email: "marcosgenesisof@gmail.com",
  password: "tatamiq123",
} as const;

export const STUDENT_CREDENTIALS = {
  email: "aluno@tatamiq.local",
  password: "tatamiq123",
} as const;

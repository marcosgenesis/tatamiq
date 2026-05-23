CREATE UNIQUE INDEX "attendances_one_valid_per_session_student" ON "attendances" ("class_session_id", "student_id") WHERE invalidated_at IS NULL;

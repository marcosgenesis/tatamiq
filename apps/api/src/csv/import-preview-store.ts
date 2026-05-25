import { Injectable } from "@nestjs/common";

export type ImportPreviewData = {
  organizationId: string;
  rows: ParsedStudentRow[];
};

export type ParsedStudentRow = {
  line: number;
  name: string;
  birthDate: string;
  enrollmentDate: string;
  status: string;
  email: string;
  phone: string;
  beltName: string;
  degree: number;
  monthlyAmount: number | null;
  monthlyDueDay: number | null;
  errors: string[];
  warnings: string[];
};

@Injectable()
export class ImportPreviewStore {
  private readonly previews = new Map<string, ImportPreviewData>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  save(token: string, data: ImportPreviewData, ttlMs = 30 * 60 * 1000): void {
    this.previews.set(token, data);
    const timer = setTimeout(() => this.delete(token), ttlMs);
    this.timers.set(token, timer);
  }

  get(token: string): ImportPreviewData | undefined {
    return this.previews.get(token);
  }

  delete(token: string): void {
    this.previews.delete(token);
    const timer = this.timers.get(token);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(token);
    }
  }
}

import { BadRequestException } from "@nestjs/common";

type ScheduleInput = {
  weekday: number;
  startTime: string;
};

type ClassGroupRuleInput = {
  schedules: ScheduleInput[];
  tags?: string[] | null;
};

export function normalizeClassGroupInput<T extends ClassGroupRuleInput>(
  input: T,
): T & { tags: string[] } {
  if (input.schedules.length === 0) {
    throw new BadRequestException("Turma precisa ter pelo menos um horário semanal.");
  }

  const seenSchedules = new Set<string>();
  for (const schedule of input.schedules) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.startTime)) {
      throw new BadRequestException("Horário da turma precisa estar no formato HH:mm.");
    }
    const scheduleKey = `${schedule.weekday}-${schedule.startTime}`;
    if (seenSchedules.has(scheduleKey)) {
      throw new BadRequestException("Remova horários duplicados da turma.");
    }
    seenSchedules.add(scheduleKey);
  }

  return {
    ...input,
    tags: normalizeTags(input.tags ?? []),
  };
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const normalized = tag.trim().replace(/\s+/g, " ");
    const key = normalized.toLocaleLowerCase("pt-BR");
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    normalizedTags.push(normalized);
  }

  return normalizedTags;
}

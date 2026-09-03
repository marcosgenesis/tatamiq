import type {
  StudentAttendancesResponse,
  StudentDailyFeesResponse,
  StudentGraduationResponse,
  StudentMeResponse,
  StudentMonthlyFeesResponse,
  StudentNextClassResponse,
} from "@appdosensei/contracts";
import { useQueries } from "@tanstack/react-query";

import { api } from "@/api";

import type { StudentHomeData } from "./home-data";

const queryOptions = {
  staleTime: 30_000,
  retry: 1,
};

async function fetchStudentMe(): Promise<StudentMeResponse> {
  const { data, error } = await api.GET("/student/me");
  if (error || !data) throw new Error("Não foi possível carregar os dados do aluno.");
  return data;
}

async function fetchStudentNextClass(): Promise<StudentNextClassResponse> {
  const { data, error } = await api.GET("/student/next-class");
  if (error || !data) throw new Error("Não foi possível carregar a próxima aula.");
  return data;
}

async function fetchStudentGraduation(): Promise<StudentGraduationResponse> {
  const { data, error } = await api.GET("/student/graduation");
  if (error || !data) throw new Error("Não foi possível carregar a graduação.");
  return data;
}

async function fetchStudentAttendances(): Promise<StudentAttendancesResponse> {
  const { data, error } = await api.GET("/student/attendances");
  if (error || !data) throw new Error("Não foi possível carregar as presenças.");
  return data;
}

async function fetchStudentMonthlyFees(): Promise<StudentMonthlyFeesResponse> {
  const { data, error } = await api.GET("/student/monthly-fees");
  if (error || !data) throw new Error("Não foi possível carregar as mensalidades.");
  return data;
}

async function fetchStudentDailyFees(): Promise<StudentDailyFeesResponse> {
  const { data, error } = await api.GET("/student/daily-fees");
  if (error || !data) throw new Error("Não foi possível carregar as cobranças diárias.");
  return data;
}

export function useStudentHome(userId: string | undefined) {
  const results = useQueries({
    queries: [
      {
        ...queryOptions,
        enabled: Boolean(userId),
        queryKey: ["student", userId, "me"],
        queryFn: fetchStudentMe,
      },
      {
        ...queryOptions,
        enabled: Boolean(userId),
        queryKey: ["student", userId, "next-class"],
        queryFn: fetchStudentNextClass,
      },
      {
        ...queryOptions,
        enabled: Boolean(userId),
        queryKey: ["student", userId, "graduation"],
        queryFn: fetchStudentGraduation,
      },
      {
        ...queryOptions,
        enabled: Boolean(userId),
        queryKey: ["student", userId, "attendances"],
        queryFn: fetchStudentAttendances,
      },
      {
        ...queryOptions,
        enabled: Boolean(userId),
        queryKey: ["student", userId, "monthly-fees"],
        queryFn: fetchStudentMonthlyFees,
      },
      {
        ...queryOptions,
        enabled: Boolean(userId),
        queryKey: ["student", userId, "daily-fees"],
        queryFn: fetchStudentDailyFees,
      },
    ] as const,
  });

  const [me, nextClass, graduation, attendances, monthlyFees, dailyFees] = results;
  const data: StudentHomeData | undefined =
    me.data &&
    nextClass.data &&
    graduation.data &&
    attendances.data &&
    monthlyFees.data &&
    dailyFees.data
      ? {
          me: me.data,
          nextClass: nextClass.data,
          graduation: graduation.data,
          attendances: attendances.data,
          monthlyFees: monthlyFees.data,
          dailyFees: dailyFees.data,
        }
      : undefined;

  return {
    data,
    isLoading: results.some((query) => query.isPending),
    error: results.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(results.map((query) => query.refetch())),
  };
}

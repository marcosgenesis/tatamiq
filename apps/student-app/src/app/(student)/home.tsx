import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { GraduationSummaryCard } from "@/features/student-home/components/graduation-summary-card";
import { HomeHeader } from "@/features/student-home/components/home-header";
import { HomeStatCard } from "@/features/student-home/components/home-stat-card";
import { NextClassCard } from "@/features/student-home/components/next-class-card";
import { RecentActivityCard } from "@/features/student-home/components/recent-activity-card";
import {
  buildRecentActivity,
  countAttendancesThisMonth,
  deriveFeeSummary,
} from "@/features/student-home/home-data";
import { useStudentHome } from "@/features/student-home/use-student-home";
import { authClient } from "@/lib/auth-client";

export default function HomeScreen() {
  const router = useRouter();
  const session = authClient.useSession();
  const home = useStudentHome(session.data?.user.id);

  if (session.isPending || home.isLoading) return <HomeLoading />;

  if (home.error || !home.data) {
    return <HomeError onRetry={() => void home.refetch()} />;
  }

  const { me, nextClass, graduation, attendances, monthlyFees, dailyFees } = home.data;
  const feeSummary = deriveFeeSummary(monthlyFees, dailyFees);
  const activities = buildRecentActivity(home.data);

  return (
    <Screen>
      <View className="-mx-2 gap-3.5">
        <HomeHeader academyName={me.academy.name} studentName={me.student.name} />

        <NextClassCard nextClass={nextClass.nextClass} onCheckIn={() => router.push("/check-in")} />

        <GraduationSummaryCard graduation={graduation} onPress={() => router.push("/graduacao")} />

        <Card className="h-[72px] flex-row items-center px-4 py-2.5">
          <HomeStatCard
            icon="flame"
            value={String(countAttendancesThisMonth(attendances.attendances))}
            label="Presenças este mês"
            color="#F4531C"
            backgroundClassName="bg-brand-soft"
          />
          <View className="h-10 w-px bg-border" />
          <HomeStatCard
            icon="wallet"
            value={feeSummary.value}
            label={feeSummary.label}
            color={feeSummary.color}
            backgroundClassName={feeSummary.backgroundClassName}
          />
        </Card>

        <RecentActivityCard activities={activities} />
      </View>
    </Screen>
  );
}

function HomeLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color="#F4531C" />
      <Text className="mt-3 text-sm text-muted-ink">Carregando sua Home...</Text>
    </View>
  );
}

function HomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-canvas px-8">
      <Text className="text-center text-lg font-bold text-ink">
        Não foi possível carregar sua Home.
      </Text>
      <Text className="mt-2 text-center text-sm text-muted-ink">
        Verifique sua conexão e tente novamente.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="mt-5 rounded-full bg-brand px-6 py-3"
      >
        <Text className="font-bold text-white">Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

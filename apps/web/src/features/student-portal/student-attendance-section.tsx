import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";

export function StudentAttendanceSection() {
  const query = useQuery({
    queryKey: ["student", "attendances"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.GET as any)("/student/attendances");
      if (error) throw new Error("Não foi possível carregar presenças.");
      return data as {
        attendances: Array<{
          id: string;
          classGroupName: string;
          source: string;
          isOutOfGroup: boolean;
          invalidatedAt: string | null;
          createdAt: string;
        }>;
      };
    },
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando presenças...</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Erro ao carregar presenças.</p>;
  }

  const { attendances } = query.data;

  if (attendances.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma presença registrada.</p>;
  }

  const grouped = groupByMonth(attendances);

  return (
    <div className="space-y-6">
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <h3 className="mb-2 text-sm font-medium capitalize text-muted-foreground">{label}</h3>
          <div className="space-y-2">
            {items.map((att) => (
              <div
                key={att.id}
                className={`flex items-center justify-between rounded-2xl border border-border p-3 text-sm ${
                  att.invalidatedAt ? "opacity-50 line-through" : ""
                }`}
              >
                <div>
                  <strong>{att.classGroupName}</strong>
                  <p className="text-muted-foreground">{formatDateTime(att.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {att.isOutOfGroup && <Badge variant="muted">Fora da turma</Badge>}
                  {att.invalidatedAt && <Badge variant="muted">Invalidada</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type Attendance = {
  id: string;
  classGroupName: string;
  source: string;
  isOutOfGroup: boolean;
  invalidatedAt: string | null;
  createdAt: string;
};

function groupByMonth(attendances: Attendance[]): Array<{ label: string; items: Attendance[] }> {
  const map = new Map<string, { label: string; items: Attendance[] }>();
  for (const att of attendances) {
    const d = new Date(att.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) {
      const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
      map.set(key, { label, items: [] });
    }
    map.get(key)?.items.push(att);
  }
  return Array.from(map.values());
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

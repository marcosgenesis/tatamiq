import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirstAccessPage } from "./first-access-page";

let preview: {
  status: "valid" | "invalid" | "expired" | "consumed";
  hasPassword?: boolean;
  academyName?: string | null;
  studentName?: string | null;
} = { status: "valid", hasPassword: false, academyName: "Tatame Central", studentName: "Aluno" };

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: preview, isLoading: false, isError: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: string; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

describe("FirstAccessPage", () => {
  beforeEach(() => {
    preview = {
      status: "valid",
      hasPassword: false,
      academyName: "Tatame Central",
      studentName: "Aluno Teste",
    };
  });

  it("shows password setup fields for valid first access without an existing password", () => {
    const html = renderToStaticMarkup(<FirstAccessPage token="token-1" />);

    expect(html).toContain("Criar senha");
    expect(html).toContain("Confirmar senha");
    expect(html).toContain("Definir senha e acessar");
  });

  it("hides password fields for existing-account first access", () => {
    preview = {
      status: "valid",
      hasPassword: true,
      academyName: "Tatame Central",
      studentName: "Aluno Existente",
    };

    const html = renderToStaticMarkup(<FirstAccessPage token="token-2" />);

    expect(html).toContain("Sua conta já possui senha");
    expect(html).toContain("Ativar acesso");
    expect(html).not.toContain("Criar senha");
    expect(html).not.toContain("Confirmar senha");
  });

  it("shows a login link for consumed first-access tokens", () => {
    preview = { status: "consumed" };

    const html = renderToStaticMarkup(<FirstAccessPage token="token-3" />);

    expect(html).toContain("Este link já foi utilizado");
    expect(html).toContain("Ir para login");
    expect(html).toContain('href="/sign-in"');
  });
});

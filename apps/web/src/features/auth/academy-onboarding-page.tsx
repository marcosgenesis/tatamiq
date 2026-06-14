import { Navigate, useNavigate } from "@tanstack/react-router";
import type { AcademyConfirmLogoInput } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ImageUploadIcon,
  LocationUpdate01Icon,
  UserIcon,
} from "hugeicons-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { DecorIcon } from "../../components/decor-icon";
import { LogoIcon } from "../../components/logo";
import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { formatBytes, useFileUpload } from "../../hooks/use-file-upload";
import { createAcademySlug } from "../../lib/academy-slug";
import { authClient } from "../../lib/auth-client";
import { cn } from "../../lib/utils";

type UpdateAcademyInput = components["schemas"]["UpdateAcademyDto"];

type OnboardingData = {
  academyName: string;
  organizationId: string | null;
  logoFile: File | null;
  address: string;
  phone: string;
  instagram: string;
};

const TOTAL_STEPS = 3;

export function AcademyOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    academyName: "",
    organizationId: null,
    logoFile: null,
    address: "",
    phone: "",
    instagram: "",
  });

  const organizations = authClient.useListOrganizations();
  if (!started && !organizations.isPending && (organizations.data?.length ?? 0) > 0) {
    return <Navigate to="/" />;
  }

  async function createAcademy() {
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.organization.create({
      name: data.academyName,
      slug: createAcademySlug(data.academyName),
    });

    if (result.error || !result.data) {
      setIsSubmitting(false);
      setError("Não foi possível criar sua academia. Tente novamente.");
      return;
    }

    const activeResult = await authClient.organization.setActive({
      organizationId: result.data.id,
    });

    setIsSubmitting(false);

    if (activeResult.error) {
      setError("Academia criada, mas não foi possível ativá-la. Tente entrar novamente.");
      return;
    }

    setStarted(true);
    setData((prev) => ({ ...prev, organizationId: result.data?.id ?? null }));
    setStep(1);
  }

  async function uploadLogo() {
    if (!data.logoFile) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: uploadData, error: uploadError } = await api.POST("/academy/logo/upload-url");
      if (uploadError || !uploadData) throw new Error();

      const uploadRes = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        body: data.logoFile,
        headers: { "Content-Type": data.logoFile.type },
      });
      if (!uploadRes.ok) throw new Error();

      const { error: confirmError } = await api.POST("/academy/logo/confirm", {
        body: { fileKey: uploadData.fileKey } satisfies AcademyConfirmLogoInput,
      });
      if (confirmError) throw new Error();
    } catch {
      toast.error("Não foi possível enviar o logo, mas você pode fazer isso depois.");
    } finally {
      setIsSubmitting(false);
      setStep(2);
    }
  }

  async function saveDetailsAndFinish() {
    setIsSubmitting(true);
    try {
      const payload = {
        ...(data.address.trim() ? { address: data.address.trim() } : {}),
        ...(data.phone.trim() ? { phone: data.phone.trim() } : {}),
        ...(data.instagram.trim() ? { instagram: data.instagram.trim() } : {}),
      } satisfies UpdateAcademyInput;

      if (Object.keys(payload).length > 0) {
        await api.PATCH("/academy", { body: payload });
      }
    } catch {
      toast.error("Não foi possível salvar os detalhes, mas você pode editar nas configurações.");
    } finally {
      setIsSubmitting(false);
      await navigate({ to: "/" });
    }
  }

  async function handleNext() {
    if (step === 0) {
      await createAcademy();
    } else if (step === 1) {
      await uploadLogo();
    } else {
      await saveDetailsAndFinish();
    }
  }

  function handleSkip() {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      void navigate({ to: "/" });
    }
  }

  const canAdvance =
    step === 0 ? data.academyName.trim().length > 0 : step === 1 ? !!data.logoFile : true;

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 md:px-8">
      <div className="relative flex w-full max-w-md flex-col p-6 md:p-8">
        <div className="absolute -inset-y-6 -left-px w-px bg-border" />
        <div className="absolute -inset-y-6 -right-px w-px bg-border" />
        <div className="absolute -inset-x-6 -top-px h-px bg-border" />
        <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
        <DecorIcon position="top-left" />
        <DecorIcon position="bottom-right" />

        <div className="w-full animate-in space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoIcon className="size-10" />
              <div>
                <p className="text-lg font-semibold leading-none tracking-tight">Tatamiq</p>
                <p className="mt-1 text-xs text-muted-foreground">Gestão para o tatame</p>
              </div>
            </div>
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>

          <StepContent
            step={step}
            data={data}
            error={error}
            isSubmitting={isSubmitting}
            onDataChange={setData}
            onNext={handleNext}
            onSkip={handleSkip}
            canAdvance={canAdvance}
          />
        </div>
      </div>
    </main>
  );
}

const STEP_KEYS = ["name", "logo", "details"] as const;

function StepIndicator(props: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_KEYS.slice(0, props.total).map((key, i) => (
        <div
          key={key}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === props.current
              ? "w-6 bg-primary"
              : i < props.current
                ? "w-1.5 bg-primary/60"
                : "w-1.5 bg-muted-foreground/20",
          )}
        />
      ))}
    </div>
  );
}

function StepContent(props: {
  step: number;
  data: OnboardingData;
  error: string | null;
  isSubmitting: boolean;
  onDataChange: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onSkip: () => void;
  canAdvance: boolean;
}) {
  if (props.step === 0) {
    return (
      <NameStep
        data={props.data}
        error={props.error}
        isSubmitting={props.isSubmitting}
        onDataChange={props.onDataChange}
        onNext={props.onNext}
        canAdvance={props.canAdvance}
      />
    );
  }

  if (props.step === 1) {
    return (
      <LogoStep
        data={props.data}
        isSubmitting={props.isSubmitting}
        onDataChange={props.onDataChange}
        onNext={props.onNext}
        onSkip={props.onSkip}
        canAdvance={props.canAdvance}
      />
    );
  }

  return (
    <DetailsStep
      data={props.data}
      isSubmitting={props.isSubmitting}
      onDataChange={props.onDataChange}
      onNext={props.onNext}
      onSkip={props.onSkip}
    />
  );
}

function NameStep(props: {
  data: OnboardingData;
  error: string | null;
  isSubmitting: boolean;
  onDataChange: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  canAdvance: boolean;
}) {
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        props.onNext();
      }}
    >
      <div className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/50">
          <UserIcon className="size-5 text-primary" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Como se chama sua academia?</h1>
        <p className="text-sm text-muted-foreground">
          Este é o nome que seus alunos e instrutores vão ver.
        </p>
      </div>

      {props.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {props.error}
        </p>
      )}

      <Field>
        <FieldLabel>Nome da academia</FieldLabel>
        <Input
          placeholder="Ex: Arte Suave BJJ"
          value={props.data.academyName}
          onChange={(e) => props.onDataChange((prev) => ({ ...prev, academyName: e.target.value }))}
          required
        />
      </Field>

      <Button className="w-full" type="submit" disabled={props.isSubmitting || !props.canAdvance}>
        {props.isSubmitting ? (
          "Criando..."
        ) : (
          <>
            Continuar
            <ArrowRight01Icon className="ml-2 size-4" />
          </>
        )}
      </Button>
    </form>
  );
}

function LogoStep(props: {
  data: OnboardingData;
  isSubmitting: boolean;
  onDataChange: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onSkip: () => void;
  canAdvance: boolean;
}) {
  const maxSize = 2 * 1024 * 1024;
  const [
    { files, isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept: "image/*",
    multiple: false,
    onFilesAdded: (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (file instanceof File) {
        props.onDataChange((prev) => ({ ...prev, logoFile: file }));
      }
    },
  });

  const currentFile = files[0];
  const previewUrl = currentFile?.preview ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/50">
          <ImageUploadIcon className="size-5 text-primary" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Adicione o logo da academia</h1>
        <p className="text-sm text-muted-foreground">
          Ele aparece no app dos alunos e nos relatórios. Pode adicionar depois se preferir.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <button
            type="button"
            className={cn(
              "group relative h-28 w-28 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : previewUrl
                  ? "border-solid border-border"
                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input {...getInputProps()} className="sr-only" />
            {previewUrl ? (
              <img src={previewUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <ImageUploadIcon className="size-6 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">Clique ou arraste</span>
              </div>
            )}
          </button>

          {currentFile && (
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() => {
                removeFile(currentFile.id);
                props.onDataChange((prev) => ({ ...prev, logoFile: null }));
              }}
              className="absolute -right-2 -top-2 z-10 size-6 rounded-full"
              aria-label="Remover logo"
            >
              <Cancel01Icon className="size-3.5" strokeWidth={2} />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">PNG, JPG ou WebP até {formatBytes(maxSize)}</p>

        {errors.length > 0 && <p className="text-sm text-destructive">{errors[0]}</p>}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={props.onSkip}>
          Pular
        </Button>
        <Button
          className="flex-1"
          onClick={props.onNext}
          disabled={props.isSubmitting || !props.canAdvance}
        >
          {props.isSubmitting ? (
            "Enviando..."
          ) : (
            <>
              Continuar
              <ArrowRight01Icon className="ml-2 size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function DetailsStep(props: {
  data: OnboardingData;
  isSubmitting: boolean;
  onDataChange: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        props.onNext();
      }}
    >
      <div className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/50">
          <LocationUpdate01Icon className="size-5 text-primary" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Detalhes da academia</h1>
        <p className="text-sm text-muted-foreground">
          Informações de contato e localização. Tudo pode ser editado depois nas configurações.
        </p>
      </div>

      <div className="space-y-4">
        <Field>
          <FieldLabel>Endereço</FieldLabel>
          <Input
            placeholder="Rua, número, bairro — cidade/UF"
            value={props.data.address}
            onChange={(e) => props.onDataChange((prev) => ({ ...prev, address: e.target.value }))}
          />
        </Field>

        <Field>
          <FieldLabel>Telefone / WhatsApp</FieldLabel>
          <Input
            placeholder="(11) 99999-9999"
            value={props.data.phone}
            onChange={(e) => props.onDataChange((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </Field>

        <Field>
          <FieldLabel>Instagram</FieldLabel>
          <Input
            placeholder="@suaacademia"
            value={props.data.instagram}
            onChange={(e) => props.onDataChange((prev) => ({ ...prev, instagram: e.target.value }))}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" type="button" onClick={props.onSkip}>
          Pular
        </Button>
        <Button className="flex-1" type="submit" disabled={props.isSubmitting}>
          {props.isSubmitting ? (
            "Salvando..."
          ) : (
            <>
              <CheckmarkCircle02Icon className="mr-2 size-4" />
              Começar a usar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

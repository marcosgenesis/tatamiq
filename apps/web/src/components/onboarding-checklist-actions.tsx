import { useNavigate } from "@tanstack/react-router";
import { PlusSignIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";

export type OnboardingChecklistActionKey = "turmaCreated";

type OnboardingChecklistActionProps = {
  step: OnboardingChecklistActionKey;
  isActive: boolean;
};

const actionCopy: Record<OnboardingChecklistActionKey, { label: string; ariaLabel: string }> = {
  turmaCreated: {
    label: "Criar Turma",
    ariaLabel: "Criar primeira turma",
  },
};

export function OnboardingChecklistAction(props: OnboardingChecklistActionProps) {
  const navigate = useNavigate();

  if (!props.isActive) return null;

  const copy = actionCopy[props.step];

  return (
    <Button
      type="button"
      className="mt-4 w-fit"
      aria-label={copy.ariaLabel}
      onClick={() => void navigate({ to: "/class-groups", search: { create: "turma" } })}
    >
      <PlusSignIcon className="size-4" /> {copy.label}
    </Button>
  );
}

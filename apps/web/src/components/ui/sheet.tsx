import * as Dialog from "@radix-ui/react-dialog";
import { Cancel01Icon } from "hugeicons-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  ...props
}: Dialog.DialogContentProps & { className?: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-background/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-80 max-w-[86vw] border-l border-sidebar-border bg-sidebar p-5 text-sidebar-foreground shadow-2xl outline-none",
          className,
        )}
        {...props}
      >
        <Dialog.Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 text-sidebar-foreground/70"
            aria-label="Fechar navegação"
          >
            <Cancel01Icon className="size-5" />
          </Button>
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export const SheetTitle = Dialog.Title;

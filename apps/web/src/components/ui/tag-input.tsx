"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Badge, BadgeButton } from "@/components/ui/badge";
import { Button, ButtonArrow } from "@/components/ui/button";
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Adicione etiquetas",
  searchPlaceholder = "Buscar etiqueta...",
  emptyMessage = "Nenhuma etiqueta encontrada.",
  createLabel = "Criar",
  label,
  id,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  createLabel?: string;
  label?: string;
  id?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const tag of [...suggestions, ...value]) {
      const normalized = tag.trim().replace(/\s+/g, " ");
      const key = normalized.toLocaleLowerCase("pt-BR");
      if (!normalized || seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
    }

    return result;
  }, [suggestions, value]);

  const trimmedQuery = query.trim().replace(/\s+/g, " ");
  const canCreate =
    trimmedQuery.length > 0 &&
    !options.some(
      (option) => option.toLocaleLowerCase("pt-BR") === trimmedQuery.toLocaleLowerCase("pt-BR"),
    );
  const items: Array<{ value: string; creatable?: string }> = [
    ...options.map((option) => ({ value: option })),
    ...(canCreate ? [{ value: `${createLabel} "${trimmedQuery}"`, creatable: trimmedQuery }] : []),
  ];

  function toggleSelection(nextValue: string) {
    const existingValue = value.find(
      (tag) => tag.toLocaleLowerCase("pt-BR") === nextValue.toLocaleLowerCase("pt-BR"),
    );

    onChange(existingValue ? value.filter((tag) => tag !== existingValue) : [...value, nextValue]);
    setQuery("");
  }

  function createSelection(nextValue: string) {
    const existingValue = value.find(
      (tag) => tag.toLocaleLowerCase("pt-BR") === nextValue.toLocaleLowerCase("pt-BR"),
    );

    if (existingValue) {
      if (!value.includes(existingValue)) onChange([...value, existingValue]);
      setQuery("");
      return;
    }

    onChange([...value, nextValue]);
    setQuery("");
  }

  function removeSelection(removedValue: string) {
    onChange(value.filter((tag) => tag !== removedValue));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setPortalContainer(
        rootRef.current?.closest<HTMLElement>('[data-slot="drawer-content"]') ?? null,
      );
    }
    setOpen(nextOpen);
  }

  return (
    <div ref={rootRef} className="space-y-2 text-sm font-medium">
      {label ? (
        <label htmlFor={fieldId} className="block">
          {label}
        </label>
      ) : null}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id={fieldId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              autoHeight
              mode="input"
              placeholder={value.length === 0}
              className="relative min-h-11 w-full p-1 pr-9"
            >
              <div className="flex flex-wrap items-center gap-1.5 pr-2.5">
                {value.length > 0 ? (
                  value.map((tag) => (
                    <Badge key={tag} variant="outline" size="md" className="max-w-full">
                      <span className="truncate">{tag}</span>
                      <BadgeButton
                        aria-label={`Remover ${tag}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          removeSelection(tag);
                        }}
                      >
                        <XIcon />
                      </BadgeButton>
                    </Badge>
                  ))
                ) : (
                  <span className="px-2.5 py-1.5 text-muted-foreground">{placeholder}</span>
                )}
              </div>
              <ButtonArrow className="absolute top-3 right-3" />
            </Button>
          }
        />
        <PopoverContent
          className="w-(--anchor-width) p-0"
          align="start"
          container={portalContainer ?? undefined}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {items.map((item) => {
                  const selected = value.some(
                    (tag) =>
                      tag.toLocaleLowerCase("pt-BR") === item.value.toLocaleLowerCase("pt-BR"),
                  );

                  if (item.creatable) {
                    return (
                      <CommandItem
                        key={`create:${item.creatable.toLocaleLowerCase("pt-BR")}`}
                        value={item.value}
                        onSelect={() => createSelection(item.creatable ?? "")}
                      >
                        <PlusIcon className="size-3 text-muted-foreground" />
                        <span className="truncate">
                          {createLabel} <span className="font-medium">“{item.creatable}”</span>
                        </span>
                      </CommandItem>
                    );
                  }

                  return (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={() => toggleSelection(item.value)}
                    >
                      <span className="truncate">{item.value}</span>
                      {selected ? <CommandCheck /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

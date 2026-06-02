"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Cancel01Icon, Tick02Icon } from "hugeicons-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Adicione etiquetas",
  label,
  id,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  id?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of [...suggestions, ...value]) {
      const key = tag.toLowerCase();
      if (tag && !seen.has(key)) {
        seen.add(key);
        result.push(tag);
      }
    }
    return result;
  }, [suggestions, value]);

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 &&
    !options.some((option) => option.toLowerCase() === trimmedQuery.toLowerCase());
  const items = canCreate ? [trimmedQuery, ...options] : options;
  console.log("[TagInput] render value=", JSON.stringify(value), "items=", JSON.stringify(items));

  return (
    <div className="space-y-2 text-sm font-medium">
      {label ? (
        <label htmlFor={fieldId} className="block">
          {label}
        </label>
      ) : null}
      <Combobox.Root
        multiple
        items={items}
        value={value}
        onValueChange={(next) => {
          console.log("[TagInput] onValueChange", next);
          onChange(next);
          setQuery("");
        }}
        inputValue={query}
        onInputValueChange={setQuery}
      >
        <Combobox.Chips
          className={cn(
            "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background px-2 py-1.5",
            "transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          )}
        >
          {value.map((tag) => (
            <Combobox.Chip
              key={tag}
              className="flex items-center gap-1 rounded-xl bg-primary/10 py-1 pr-1 pl-2.5 text-xs font-medium text-foreground"
            >
              {tag}
              <Combobox.ChipRemove
                aria-label={`Remover ${tag}`}
                className="grid size-4 place-items-center rounded-md text-muted-foreground transition hover:bg-primary/20 hover:text-foreground"
              >
                <Cancel01Icon className="size-3" />
              </Combobox.ChipRemove>
            </Combobox.Chip>
          ))}
          <Combobox.Input
            id={fieldId}
            placeholder={value.length === 0 ? placeholder : ""}
            className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Combobox.Chips>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} className="isolate z-50 outline-none">
            <Combobox.Popup className="max-h-64 w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-2xl bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
                Digite para criar uma etiqueta.
              </Combobox.Empty>
              <Combobox.List>
                {(item: string) => {
                  const isCreate = canCreate && item.toLowerCase() === trimmedQuery.toLowerCase();
                  return (
                    <Combobox.Item
                      key={item}
                      value={item}
                      className="relative flex cursor-default items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    >
                      {isCreate ? (
                        <span>
                          Criar <span className="font-medium">“{item}”</span>
                        </span>
                      ) : (
                        <span>{item}</span>
                      )}
                      <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                        <Tick02Icon className="size-4" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}

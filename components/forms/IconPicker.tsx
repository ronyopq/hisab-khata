"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ICON_NAMES = Object.keys(LucideIcons).filter((k) => /^[A-Z]/.test(k)).slice(0, 200);
type IconComp = React.ComponentType<{ className?: string }>;
const icons = LucideIcons as unknown as Record<string, IconComp>;

export function IconPicker({ value, onChange, children }: { value?: string; onChange: (icon: string) => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = value ? icons[value] : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" className="w-full justify-start gap-2">
            {SelectedIcon ? <SelectedIcon className="h-5 w-5" /> : <LucideIcons.Smile className="h-5 w-5" />}
            {value ?? "Select icon"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Choose Icon</DialogTitle></DialogHeader>
        <Command>
          <CommandInput placeholder="Search icons..." />
          <CommandList>
            <CommandEmpty>No icon found.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-6 gap-1 p-1">
                {ICON_NAMES.map((name) => {
                  const Icon = icons[name];
                  if (!Icon) return null;
                  return (
                    <CommandItem key={name} value={name} onSelect={() => { onChange(name); setOpen(false); }} className="flex flex-col items-center gap-1 rounded-xl p-2">
                      <Icon className="h-6 w-6" />
                      <span className="text-[9px] leading-tight text-center">{name}</span>
                    </CommandItem>
                  );
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function DynamicIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name ? icons[name] : undefined;
  if (!Icon) return <LucideIcons.Tag className={className} />;
  return <Icon className={className} />;
}

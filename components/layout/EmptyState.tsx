"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  actionSlot,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Link target for the CTA (e.g. a page that hosts the create form). */
  actionHref?: string;
  /** Any trigger element, e.g. a DialogTrigger wrapping the create button. */
  actionSlot?: ReactNode;
}) {
  // Only render a CTA that can actually do something — the old version showed a
  // button on every empty state and most of them had no handler at all.
  const cta = actionSlot ?? (
    actionHref && actionLabel ? (
      <Button className="mt-5" asChild>
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    ) : onAction && actionLabel ? (
      <Button className="mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed py-16 px-6 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Inbox className="h-8 w-8" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {cta && <div className="mt-5">{cta}</div>}
    </motion.div>
  );
}

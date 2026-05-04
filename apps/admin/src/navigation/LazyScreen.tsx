import { Suspense, type ComponentType } from "react";

type LazyScreenProps = {
  component: ComponentType;
};

export function LazyScreen({ component: Component }: LazyScreenProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
          Loading module...
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

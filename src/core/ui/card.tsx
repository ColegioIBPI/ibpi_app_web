import { cn } from "@/core/lib/cn";

interface CardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Card({
  title,
  description,
  action,
  className,
  children,
}: CardProps) {
  return (
    <section
      data-cartao
      className={cn(
        "rounded-card border-line bg-surface border p-4 sm:p-6",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-ink text-base font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-ink-muted mt-1 text-sm">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

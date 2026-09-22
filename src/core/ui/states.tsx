import {
  AlertTriangle,
  Inbox,
  Loader2,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/lib/cn";

/**
 * Os quatro estados que toda tela precisa tratar explicitamente.
 *
 * Padronizados aqui para que "carregando" e "deu erro" não fiquem diferentes
 * em cada módulo — e para que ninguém esqueça o estado vazio, que é o mais
 * esquecido e o mais comum no começo do ano letivo.
 */

interface StateProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

function StateShell({
  icon: Icon,
  iconClassName,
  title,
  description,
  className,
  children,
}: StateProps & { icon: LucideIcon; iconClassName?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-12 text-center",
        className,
      )}
    >
      <Icon
        className={cn("text-ink-muted size-6", iconClassName)}
        aria-hidden
      />
      <p className="text-ink text-sm font-medium">{title}</p>
      {description && (
        <p className="text-ink-muted max-w-prose text-sm">{description}</p>
      )}
      {children}
    </div>
  );
}

export function LoadingState({
  title = "Carregando…",
  ...props
}: Partial<StateProps>) {
  return (
    <div role="status" aria-live="polite">
      <StateShell
        icon={Loader2}
        iconClassName="animate-spin text-brand-600"
        title={title}
        {...props}
      />
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateShell icon={Inbox} {...props} />;
}

export function ErrorState({
  onRetry,
  title = "Não foi possível carregar",
  description = "Tente novamente. Se continuar, avise a secretaria.",
  ...props
}: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <div role="alert">
      <StateShell
        icon={AlertTriangle}
        iconClassName="text-danger"
        title={title}
        description={description}
        {...props}
      >
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </StateShell>
    </div>
  );
}

export function ForbiddenState({
  title = "Você não tem acesso a esta área",
  description = "Se isso parece errado, fale com a secretaria para revisar seu perfil.",
  ...props
}: Partial<StateProps>) {
  return (
    <StateShell
      icon={ShieldOff}
      title={title}
      description={description}
      {...props}
    />
  );
}

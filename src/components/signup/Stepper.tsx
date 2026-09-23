import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '../../lib/cn';

const STEPS = [
  { id: 1, label: 'Your account' },
  { id: 2, label: 'Organisation profile' },
  { id: 3, label: 'Choose plan' },
] as const;

type StepperProps = {
  currentStep: 1 | 2 | 3;
};

export function Stepper({ currentStep }: StepperProps) {
  return (
    <nav aria-label="Create account steps" className="w-full">
      <ol className="no-scrollbar flex items-center justify-start gap-2 overflow-x-auto pb-1 sm:justify-center sm:gap-3">
        {STEPS.map((step, index) => {
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-3">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition sm:px-4',
                  isComplete && 'border-transparent bg-transparent text-ink',
                  isCurrent && 'border-transparent bg-transparent text-ink',
                  !isComplete && !isCurrent && 'border-transparent bg-transparent text-mute'
                )}
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-xs font-semibold',
                    isComplete && 'bg-primary text-white',
                    isCurrent && 'bg-primary text-white',
                    !isComplete && !isCurrent && 'border border-line bg-white text-mute'
                  )}
                >
                  {isComplete ? (
                    <HugeiconsIcon icon={Tick02Icon} size={14} color="currentColor" strokeWidth={2.2} />
                  ) : (
                    step.id
                  )}
                </span>
                <span className="pr-0.5">{step.label}</span>
              </div>

              {index < STEPS.length - 1 ? (
                <span className="h-px w-4 bg-line sm:w-10" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

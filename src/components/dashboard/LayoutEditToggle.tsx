import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutGrid, Check, RotateCcw } from 'lucide-react';

interface LayoutEditToggleProps {
  isEditing: boolean;
  onToggle: () => void;
  onReset: () => void;
}

/**
 * Compact button cluster used in a SectionHeader action slot to toggle layout
 * editing on/off and reset to defaults. Hidden in print.
 */
export function LayoutEditToggle({ isEditing, onToggle, onReset }: LayoutEditToggleProps) {
  const label = isEditing ? 'Done' : 'Edit Layout';
  return (
    <div className="flex items-center gap-1.5 print:hidden">
      {isEditing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5 xl:mr-1" />
              <span className="hidden xl:inline">Reset</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="xl:hidden">Reset</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={onToggle}
            className="h-8 px-2 xl:px-2.5 text-xs"
            aria-label={label}
          >
            {isEditing ? (
              <>
                <Check className="h-3.5 w-3.5 xl:mr-1" />
                <span className="hidden xl:inline">Done</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5 xl:mr-1" />
                <span className="hidden xl:inline">Edit Layout</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="xl:hidden">{label}</TooltipContent>
      </Tooltip>
    </div>
  );
}

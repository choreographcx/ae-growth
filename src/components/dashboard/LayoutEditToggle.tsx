import { Button } from '@/components/ui/button';
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
  return (
    <div className="flex items-center gap-1.5 print:hidden">
      {isEditing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      )}
      <Button
        type="button"
        variant={isEditing ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="h-8 px-2.5 text-xs"
      >
        {isEditing ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1" />
            Done
          </>
        ) : (
          <>
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            Edit layout
          </>
        )}
      </Button>
    </div>
  );
}

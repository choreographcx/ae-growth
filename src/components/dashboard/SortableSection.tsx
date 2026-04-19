import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableSectionProps {
  id: string;
  isEditing: boolean;
  children: ReactNode;
  /** Optional accessible label for the drag handle. */
  label?: string;
}

/**
 * Wraps a dashboard section with dnd-kit sortable behavior.
 * Drag handle is only active when `isEditing` is true to prevent accidental drags.
 */
export function SortableSection({ id, isEditing, children, label }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isEditing && 'rounded-lg border border-dashed border-border/70 p-2 -m-2 transition-shadow',
        isDragging && 'opacity-60 z-10 shadow-lg'
      )}
    >
      {isEditing && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={label ? `Drag to reorder ${label}` : 'Drag to reorder section'}
          className={cn(
            'absolute -top-2 right-2 z-20 inline-flex items-center justify-center',
            'h-7 w-7 rounded-md bg-background border border-border shadow-sm',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            'cursor-grab active:cursor-grabbing touch-none print:hidden'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useGa4Sources } from '@/hooks/useGa4Sources';
import { cn } from '@/lib/utils';

/**
 * Admin UI for managing one or many GA4 properties for the singleton client.
 * Mirrors the "Add Mapping / Add User" admin patterns: list + inline add row.
 */
export function Ga4PropertiesManager() {
  const { sources, loading, saving, addSource, updateSource, removeSource } = useGa4Sources();
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = async () => {
    if (!newPropertyId.trim()) return;
    const ok = await addSource(newPropertyId, newLabel);
    if (ok) {
      setNewPropertyId('');
      setNewLabel('');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider">GA4 Properties</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add one or many GA4 properties. Dashboard metrics aggregate across all enabled properties.
          </p>
        </div>
        {sources.length > 0 && (
          <Badge variant="secondary" className="text-[10px] text-primary-foreground">
            {sources.filter((s) => s.is_enabled).length} active
          </Badge>
        )}
      </div>

      {/* Existing rows */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : sources.length === 0 ? (
          <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-4 py-6 text-center">
            No GA4 properties yet. Add one below.
          </div>
        ) : (
          sources.map((source) => (
            <Ga4Row
              key={source.id}
              source={source}
              disabled={saving}
              onUpdate={(patch) => updateSource(source.id, patch)}
              onRemove={() => removeSource(source.id)}
            />
          ))
        )}
      </div>

      {/* Add new row */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Add GA4 Property</Label>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 mt-2">
          <Input
            value={newPropertyId}
            onChange={(e) => setNewPropertyId(e.target.value)}
            placeholder="123456789"
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. AESA Main Site)"
            className="h-9 text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={saving || !newPropertyId.trim()}
            size="sm"
            className="h-9 gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  source: { id: string; property_id: string; label: string; is_enabled: boolean };
  disabled: boolean;
  onUpdate: (patch: { property_id?: string; label?: string; is_enabled?: boolean }) => void;
  onRemove: () => void;
}

function Ga4Row({ source, disabled, onUpdate, onRemove }: RowProps) {
  const [propertyId, setPropertyId] = useState(source.property_id);
  const [label, setLabel] = useState(source.label);
  const dirty = propertyId !== source.property_id || label !== source.label;

  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-[160px_1fr_auto_auto_auto] gap-2 items-center p-2.5 rounded-lg border border-border bg-card',
      !source.is_enabled && 'opacity-60'
    )}>
      <Input
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        onBlur={() => dirty && propertyId !== source.property_id && onUpdate({ property_id: propertyId })}
        className="h-8 text-sm tabular-nums"
        inputMode="numeric"
      />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => dirty && label !== source.label && onUpdate({ label })}
        placeholder="Label"
        className="h-8 text-sm"
      />
      <div className="flex items-center gap-2 px-2">
        <Switch
          checked={source.is_enabled}
          onCheckedChange={(v) => onUpdate({ is_enabled: v })}
          disabled={disabled}
        />
        <span className="text-[10px] text-muted-foreground uppercase">
          {source.is_enabled ? 'Active' : 'Off'}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove GA4 property"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

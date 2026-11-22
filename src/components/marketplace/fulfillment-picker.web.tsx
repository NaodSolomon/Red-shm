import { useState } from 'react';
import { View } from 'react-native';

import { color } from '@/constants/marketplace';
import { addisNow, friendlyTime, normalizeTime, validDay } from '@/lib/fulfillment-time';
import type { PickerProps } from './fulfillment-picker';
import { FormAction } from './listing-form';
import { PrimaryButton } from './primitives';

export function FulfillmentPicker({ mode, value, minimumDay, disabled, onChange }: PickerProps) {
  const [draft, setDraft] = useState<string>();
  const dateMode = mode === 'date';
  const label = dateMode ? 'Choose another date' : value ? `Choose time · ${friendlyTime(value)}` : 'Choose time';
  const valid = draft && (dateMode ? validDay(draft) && draft >= minimumDay : normalizeTime(draft));
  return <View style={{ gap: 8 }}>
    <FormAction label={label} onPress={() => setDraft(dateMode ? (value >= minimumDay ? value : minimumDay) : (value || addisNow().time))}
      disabled={disabled} />
    {draft !== undefined ? <>
      <input type={mode} aria-label={dateMode ? 'Calendar date' : 'Clock time'} value={draft} disabled={disabled}
        min={dateMode ? minimumDay : undefined} step={dateMode ? undefined : 60}
        onChange={(event) => setDraft(event.target.value)}
        style={{ boxSizing: 'border-box', width: '100%', minHeight: 46, borderRadius: 9,
          border: `1px solid ${color.line}`, background: color.white, color: color.ink, padding: 10, fontSize: 16 }} />
      <PrimaryButton label={dateMode ? 'Use date' : 'Use time'} disabled={!valid || disabled}
        onPress={() => { if (valid) { onChange(dateMode ? draft : normalizeTime(draft)!); setDraft(undefined); } }} />
      <FormAction label="Cancel picker" onPress={() => setDraft(undefined)} disabled={disabled} />
    </> : null}
  </View>;
}

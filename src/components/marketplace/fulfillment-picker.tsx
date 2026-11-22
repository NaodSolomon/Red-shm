import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

import { addisNow, friendlyTime } from '@/lib/fulfillment-time';
import { Choices, FormAction } from './listing-form';
import { PrimaryButton } from './primitives';

export interface PickerProps {
  mode: 'date' | 'time';
  value: string;
  minimumDay: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function FulfillmentPicker({ mode, value, minimumDay, disabled, onChange }: PickerProps) {
  const [draft, setDraft] = useState<Date>();
  const dateMode = mode === 'date';
  const label = dateMode ? 'Choose another date' : value ? `Choose time · ${friendlyTime(value)}` : 'Choose time';
  const minimum = new Date(`${minimumDay}T00:00:00Z`);

  function apply(date: Date) {
    onChange(dateMode ? date.toISOString().slice(0, 10) : date.toISOString().slice(11, 16));
    setDraft(undefined);
  }

  function open() {
    Keyboard.dismiss();
    const selected = dateMode
      ? new Date(`${value > minimumDay ? value : minimumDay}T00:00:00Z`)
      : new Date(`2000-01-01T${value || addisNow().time}:00Z`);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode, value: selected, timeZoneName: 'UTC', display: dateMode ? 'calendar' : 'clock',
        ...(dateMode ? { minimumDate: minimum } : { is24Hour: false }),
        onValueChange: (_, date) => apply(date),
      });
    } else {
      setDraft(selected);
    }
  }

  return <View style={{ gap: 8 }}>
    <FormAction label={label} onPress={open} disabled={disabled} />
    {draft ? <>
      <DateTimePicker mode={mode} value={draft} timeZoneName="UTC" locale="en-US"
        display={dateMode ? 'inline' : 'spinner'}
        minimumDate={dateMode ? minimum : undefined} onValueChange={(_, date) => setDraft(date)} />
      {dateMode ? null : <Choices label="Time period" options={['AM', 'PM']}
        value={draft.getUTCHours() < 12 ? 'AM' : 'PM'} onChange={(period) => {
          const next = new Date(draft);
          next.setUTCHours(draft.getUTCHours() % 12 + (period === 'PM' ? 12 : 0));
          setDraft(next);
        }} />}
      <PrimaryButton label={dateMode ? 'Use date' : 'Use time'} onPress={() => apply(draft)} disabled={disabled} />
      <FormAction label="Cancel picker" onPress={() => setDraft(undefined)} disabled={disabled} />
    </> : null}
  </View>;
}

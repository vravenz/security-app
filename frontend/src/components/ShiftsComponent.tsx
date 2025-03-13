import React, { useState, ChangeEvent } from 'react';
import InputField from '../components/InputField'; // Adjust import path as needed
import DateInput from '../components/DateInput';
import Button from './Button';

export interface ShiftRecord {
  shift_date: string;  // "YYYY-MM-DD"
  start_time: string;  // "HH:mm"
  end_time: string;    // "HH:mm"
  break_time: string;  // e.g. "00:15:00" or "00:30:00"
}

interface Props {
  onShiftsChange: (shifts: ShiftRecord[]) => void;
  // Optional initial shifts passed from parent (for edit mode)
  shifts?: ShiftRecord[];
  disableDateEditing?: boolean;
  disableShiftAddition?: boolean;
}

const ShiftsComponent: React.FC<Props> = ({
  onShiftsChange,
  shifts: initialShifts,
  disableDateEditing = false,
  disableShiftAddition = false,
}) => {
  // If initial shifts are provided, force "different" mode
  const initialMode: 'same' | 'different' =
    initialShifts && initialShifts.length > 0 ? 'different' : 'same';
  const [shiftType, setShiftType] = useState<'same' | 'different'>(initialMode);

  // For "Same Multiple Shifts" mode
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakTime, setBreakTime] = useState('');

  // For "Different Multiple Shifts" mode
  const [differentShifts, setDifferentShifts] = useState<ShiftRecord[]>(
    initialShifts && initialShifts.length > 0
      ? initialShifts
      : [{ shift_date: '', start_time: '', end_time: '', break_time: '' }]
  );

  const breakTimeOptions = [
    { label: '15 min', value: '00:15:00' },
    { label: '30 min', value: '00:30:00' },
    { label: '45 min', value: '00:45:00' },
    { label: '1 hour', value: '01:00:00' },
  ];

  const handleShiftTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setShiftType(e.target.value as 'same' | 'different');
  };

  const generateShiftData = () => {
    if (shiftType === 'same') {
      if (!startDate || !endDate) return [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const shifts: ShiftRecord[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const isoDate = new Date(d).toISOString().split('T')[0];
        shifts.push({
          shift_date: isoDate,
          start_time: startTime || '',
          end_time: endTime || '',
          break_time: breakTime || '',
        });
      }
      return shifts;
    } else {
      return differentShifts;
    }
  };

  const handleAddShiftRow = () => {
    setDifferentShifts((prev) => [
      ...prev,
      { shift_date: '', start_time: '', end_time: '', break_time: '' },
    ]);
  };

  const handleChangeShiftRow = (
    index: number,
    field: keyof ShiftRecord,
    value: string
  ) => {
    setDifferentShifts((prev) => {
      const newShifts = [...prev];
      newShifts[index] = { ...newShifts[index], [field]: value };
      return newShifts;
    });
  };

  // Whenever any input changes, recalculate the shifts and pass to parent
  React.useEffect(() => {
    const newShifts = generateShiftData();
    onShiftsChange(newShifts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftType, startDate, endDate, startTime, endTime, breakTime, differentShifts]);

  return (
    <div className="p-4 border dark:border-zinc-700 rounded">
      <h3 className="text-lg font-semibold mb-2">Shift Details</h3>

      {/* Render radio buttons only if initial shifts are not provided */}
      {!initialShifts && (
        <div className="mb-2">
          <label className="mr-4">
            <input
              type="radio"
              name="shiftType"
              value="same"
              className="mr-2"
              checked={shiftType === 'same'}
              onChange={handleShiftTypeChange}
            />
            Same Multiple Shifts
          </label>
          <label>
            <input
              type="radio"
              name="shiftType"
              value="different"
              className="mr-2"
              checked={shiftType === 'different'}
              onChange={handleShiftTypeChange}
            />
            Different Multiple Shifts
          </label>
        </div>
      )}

      {shiftType === 'same' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date:</label>
            <DateInput
              date={startDate ? new Date(startDate) : null}
              onChange={(date) => {
                if (!disableDateEditing && date) {
                  setStartDate(date.toISOString().split('T')[0]);
                }
              }}
              disabled={disableDateEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date:</label>
            <DateInput
              date={endDate ? new Date(endDate) : null}
              onChange={(date) => {
                if (!disableDateEditing && date) {
                  setEndDate(date.toISOString().split('T')[0]);
                }
              }}
              disabled={disableDateEditing}
            />
          </div>
          <div>
            <InputField
              type="time"
              name="startTime"
              label="Start Time:"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <InputField
              type="time"
              name="endTime"
              label="End Time:"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Break Time:</label>
            <InputField
              type="select"
              name="breakTime"
              value={breakTime}
              onChange={(e) => setBreakTime(e.target.value)}
              options={[
                { label: 'No Break', value: '' },
                ...breakTimeOptions,
              ]}
            />
          </div>
        </div>
      )}

      {shiftType === 'different' && (
        <>
          {differentShifts.map((shift, index) => (
            <div key={index} className="grid grid-cols-4 gap-4 mb-2 p-2">
              <div>
                <label className="block text-sm font-medium mb-1">Shift Date:</label>
                <DateInput
                  date={shift.shift_date ? new Date(shift.shift_date) : null}
                  onChange={(date) => {
                    if (!disableDateEditing && date) {
                      handleChangeShiftRow(
                        index,
                        'shift_date',
                        date.toISOString().split('T')[0]
                      );
                    }
                  }}
                  disabled={disableDateEditing}
                />
              </div>
              <div>
                <InputField
                  type="time"
                  name={`startTime-${index}`}
                  label="Start Time:"
                  value={shift.start_time}
                  onChange={(e) =>
                    handleChangeShiftRow(index, 'start_time', e.target.value)
                  }
                />
              </div>
              <div>
                <InputField
                  type="time"
                  name={`endTime-${index}`}
                  label="End Time:"
                  value={shift.end_time}
                  onChange={(e) =>
                    handleChangeShiftRow(index, 'end_time', e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Break Time:</label>
                <InputField
                  type="select"
                  name={`breakTime-${index}`}
                  value={shift.break_time}
                  onChange={(e) =>
                    handleChangeShiftRow(index, 'break_time', e.target.value)
                  }
                  options={[
                    { label: 'No Break', value: '' },
                    ...breakTimeOptions,
                  ]}
                />
              </div>
            </div>
          ))}

          {!disableShiftAddition && (
            <Button
              type="button"
              onClick={handleAddShiftRow}
              size="small"
              variant="outline"
              icon="plus"
              className="mt-3"
              marginRight="5px"
            >
              Add Another Shift
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default ShiftsComponent;

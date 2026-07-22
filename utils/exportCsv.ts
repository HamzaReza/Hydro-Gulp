import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDrinkById } from '../constants/drinks';
import type { HydrationLog } from '../store/slices/hydrationSlice';
import { formatTime } from './dateUtils';

/** Wraps a field in quotes (doubling inner quotes) when it needs escaping. */
const escapeCsvField = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Builds a CSV export of hydration logs for the given dates (empty days are
 * skipped). Amounts are always in ml; `unit` records the user's display unit.
 */
export const buildCsv = (
  logs: Record<string, HydrationLog[]>,
  dates: string[],
  unit: 'ml' | 'oz'
): string => {
  const rows: string[] = ['date,time,drink,amount_ml,hydration_ml,unit'];

  for (const date of dates) {
    const dayLogs = logs[date];
    if (!dayLogs || dayLogs.length === 0) continue;

    [...dayLogs]
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((log) => {
        rows.push(
          [
            date,
            formatTime(log.timestamp),
            getDrinkById(log.type).label,
            String(log.amount),
            String(log.hydrationValue),
            unit,
          ]
            .map(escapeCsvField)
            .join(',')
        );
      });
  }

  return rows.join('\n');
};

/** Writes the CSV to the cache directory and opens the native share sheet. */
export const exportAndShareCsv = async (
  csv: string,
  filename: string
): Promise<void> => {
  // expo-file-system SDK 55 main entry: File/Paths API with synchronous write
  const file = new File(Paths.cache, filename);
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export hydration data',
    });
  }
};

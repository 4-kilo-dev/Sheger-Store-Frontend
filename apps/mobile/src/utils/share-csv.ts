import { Alert, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => {
          const value = String(row[header] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function shareCsv(filename: string, csv: string): Promise<void> {
  if (!csv.trim()) {
    Alert.alert("Nothing to export", "This report has no rows yet.");
    return;
  }

  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  try {
    const directory = FileSystem.cacheDirectory;
    if (!directory) {
      throw new Error("No cache directory");
    }
    const uri = `${directory}${safeName}`;
    await FileSystem.writeAsStringAsync(uri, `\uFEFF${csv}`, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "text/csv",
        dialogTitle: safeName,
        UTI: "public.comma-separated-values-text",
      });
      return;
    }

    await Share.share({ message: csv, title: safeName });
  } catch (error) {
    Alert.alert(
      "Export failed",
      error instanceof Error ? error.message : "Could not share the CSV file.",
    );
  }
}

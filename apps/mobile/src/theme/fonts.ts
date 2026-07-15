import { useFonts } from "expo-font";
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold_Italic,
} from "@expo-google-fonts/fraunces";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";

export const fontFamily = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  displayItalic: "Fraunces_600SemiBold_Italic",
  displayItalicLight: "Fraunces_500Medium_Italic",
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansBold: "DMSans_700Bold",
  sansExtraBold: "DMSans_800ExtraBold",
  data: "Menlo",
} as const;

export function useAppFonts() {
  return useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
}

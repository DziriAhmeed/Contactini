/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

const tintColorLight = "#80BAFF"; // Updated to match auth buttons
const tintColorDark = "#fff";

// Common colors used across the app
const commonColors = {
  primary: "#80BAFF", // Main blue color used in buttons
  danger: "#FF4444", // Red color used in sign out
  border: "#CDD1D7", // Input borders
  inputText: "#666666", // Input text and icons
  white: "#FFFFFF", // Button text and backgrounds
};

export const Colors = {
  common: commonColors, // Add common colors
  light: {
    text: "#11181C",
    background: commonColors.white,
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    inputBorder: commonColors.border,
    inputText: commonColors.inputText,
  },
  dark: {
    text: commonColors.white,
    background: "#151718",
    tint: tintColorDark,
    icon: commonColors.white,
    tabIconDefault: "#B8BABBFF",
    tabIconSelected: tintColorDark,
    inputBorder: "#7D7F80FF",
    inputText: "#D2D4D6FF",
  },
};

import { ButtonProps } from "@/types/types";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]): ViewStyle => {
  switch (variant) {
    case "secondary":
      return styles.bgSecondary;
    case "danger":
      return styles.bgDanger;
    case "success":
      return styles.bgSuccess;
    case "outline":
      return { ...styles.bgTransparent, ...styles.borderOutline };
    default:
      return styles.bgPrimary;
  }
};

const getTextVariantStyle = (
  variant: ButtonProps["textVariant"]
): TextStyle => {
  switch (variant) {
    case "primary":
      return styles.textPrimary;
    case "secondary":
      return styles.textSecondary;
    case "danger":
      return styles.textDanger;
    case "success":
      return styles.textSuccess;
    default:
      return styles.textDefault;
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className, // You can ignore this if not needed
  ...props
}: ButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.button, getBgVariantStyle(bgVariant)]}
    {...props}
  >
    {IconLeft && <IconLeft />}
    <Text style={[styles.text, getTextVariantStyle(textVariant)]}>{title}</Text>
    {IconRight && <IconRight />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    width: "100%",
    borderRadius: 9999, // Full rounded
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  bgPrimary: { backgroundColor: "#0286ff" },
  bgSecondary: { backgroundColor: "#6b7280" }, // gray-500
  bgDanger: { backgroundColor: "#ef4444" }, // red-500
  bgSuccess: { backgroundColor: "#10b981" }, // green-500
  bgTransparent: { backgroundColor: "transparent" },
  borderOutline: { borderWidth: 0.5, borderColor: "#737373" }, // neutral-500
  text: {
    fontSize: 18, // text-lg
    fontWeight: "600", // font-semibold
  },
  textDefault: { color: "#ffffff" }, // white
  textPrimary: { color: "#000000" }, // black
  textSecondary: { color: "#f3f4f6" }, // gray-100
  textDanger: { color: "#fee2e2" }, // red-100
  textSuccess: { color: "#d1fae5" }, // green-100
});

export default CustomButton;

import { useTheme } from "@react-navigation/native";
import type { Theme } from "@react-navigation/native";

interface ExtendedTheme extends Theme {
  colors: Theme["colors"] & {
    inputBorder: string;
    inputText: string;
  };
}

import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextStyle,
  ViewStyle,
  TextInputProps,
  TouchableOpacityProps,
  TextProps,
} from "react-native";
import { Colors } from "@/constants/Colors";

type ThemedTextProps = TextProps & {
  style?: TextStyle | TextStyle[];
};

type ThemedInputProps = TextInputProps & {
  style?: ViewStyle | ViewStyle[];
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
};

type ThemedButtonProps = TouchableOpacityProps & {
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  children: React.ReactNode;
  variant?: "primary" | "danger";
};

export const ThemedText: React.FC<ThemedTextProps> = ({ style, ...props }) => {
  const { colors } = useTheme();
  return <Text style={[{ color: colors.text }, style]} {...props} />;
};

export const ThemedInput: React.FC<ThemedInputProps> = ({
  style,
  containerStyle,
  rightIcon,
  ...props
}) => {
  const { colors } = useTheme() as ExtendedTheme;

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.inputText}
        {...props}
      />
      {rightIcon}
    </View>
  );
};

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  style,
  textStyle,
  children,
  variant = "primary",
  ...props
}) => {
  const backgroundColor =
    variant === "primary" ? Colors.common.primary : Colors.common.danger;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      {...props}
    >
      <Text
        style={[styles.buttonText, { color: Colors.common.white }, textStyle]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: Colors.common.border,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 45,
    paddingLeft: 10,
    fontSize: 16,
    marginBottom: 0,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

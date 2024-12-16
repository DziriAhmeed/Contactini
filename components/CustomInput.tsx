import {
  KeyboardAvoidingView,
  Text,
  TouchableWithoutFeedback,
  View,
  Image,
  TextInput,
  Platform,
  Keyboard,
  StyleSheet,
  TextStyle,
  ViewStyle,
  ImageStyle,
} from "react-native";

const CustomInput = ({
  label,
  labelStyle,
  icon,
  secureTextEntery = false,
  containerStyle,
  inputStyle,
  iconStyle,
  className, // This can be ignored if not used
  ...props
}) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={styles.keyboardAvoidingView}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.inputWrapper}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <View style={[styles.container, containerStyle]}>
          {icon && <Image source={icon} style={[styles.icon, iconStyle]} />}
          <TextInput
            style={[styles.input, inputStyle]}
            secureTextEntery={secureTextEntery}
            {...props}
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  inputWrapper: {
    marginVertical: 8, // "my-2"
  },
  label: {
    fontSize: 18, // "text-lg"
    fontFamily: "JakartaSemiBold", // "font-JakartaSemiBold"
    marginBottom: 12, // "mb-3"
  },
  container: {
    flexDirection: "row", // "flex-row"
    justifyContent: "flex-start", // "justify-start"
    alignItems: "center", // "items-center"
    // position: "relative", // "relative"
    backgroundColor: "#f3f4f6", // "bg-neutral-100"
    borderBottomWidth: 1, // Bottom border only
    borderColor: "#737373", // Neutral color for border
  },
  icon: {
    width: 24, // "w-6"
    height: 24, // "h-6"
    marginLeft: 16, // "ml-4"
  },
  input: {
    paddingVertical: 12, // Adjust for comfortable input height
    paddingHorizontal: 8,
    fontFamily: "JakartaSemiBold", // "font-JakartaSemiBold"
    fontSize: 15, // "text-[15px]"
    flex: 1, // "flex-1"
    textAlign: "left", // "text-left"
  },
});

export default CustomInput;

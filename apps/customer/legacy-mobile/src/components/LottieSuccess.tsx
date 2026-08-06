import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";

export function LottieSuccess() {
  return (
    <View style={styles.wrap}>
      <LottieView
        source={require("../../assets/lottie/success.json")}
        autoPlay
        loop={false}
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  animation: {
    width: 220,
    height: 220,
  },
});




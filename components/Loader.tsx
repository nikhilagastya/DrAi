import { Image, Modal, StyleSheet, View } from "react-native";
import React from "react";

export default function Loader({ isOpen }: { isOpen: boolean }) {
  return (
    <Modal visible={isOpen} animationType="fade" transparent={true}>
      <View style={styles.container}>
        <Image
          source={require(`/Users/nikhilagastya/Desktop/nik/general/healthcare-app-complete/HealthcareApp/assets/favicon.png`)}
          style={styles.image}
        />
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
  },
  image: {
    height: 144,
    width: 144,
  },
});

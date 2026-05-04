import React from "react";
import { View, Text } from "react-native";
import Button from "../../components/ui/Button";

export default function DocumentUploadScreen({ navigation }: any) {
  return (
    <View style={{ padding: 20 }}>
      <Text>Upload Aadhaar</Text>
      <Button title="Upload Aadhaar" onPress={() => {}} />

      <Text>Upload Photo</Text>
      <Button title="Upload Photo" onPress={() => {}} />

      <Button title="Next" onPress={() => navigation.navigate("BankDetails")} />
    </View>
  );
}
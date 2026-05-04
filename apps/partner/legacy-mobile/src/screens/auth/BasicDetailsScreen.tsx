import React, { useState } from "react";
import { View } from "react-native";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function BasicDetailsScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [service, setService] = useState("Cook");

  return (
    <View style={{ padding: 20 }}>
      <Input placeholder="Full Name" value={name} onChangeText={setName} />

      <Input
        placeholder="Service (Cook/Cleaning)"
        value={service}
        onChangeText={setService}
      />

      <Button title="Next" onPress={() => navigation.navigate("DocumentUpload")} />
    </View>
  );
}
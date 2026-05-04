import React, { useState } from "react";
import { View } from "react-native";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export default function BankDetailsScreen({ navigation }: any) {
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");

  return (
    <View style={{ padding: 20 }}>
      <Input placeholder="Account Number" value={account} onChangeText={setAccount} />
      <Input placeholder="IFSC Code" value={ifsc} onChangeText={setIfsc} />

      <Button title="Submit" onPress={() => navigation.navigate("Status")} />
    </View>
  );
}
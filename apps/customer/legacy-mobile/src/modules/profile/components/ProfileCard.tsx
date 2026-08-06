import { memo, ReactNode } from "react";
import { StyleSheet, View } from "react-native";


import { COLORS } from '../../../theme/colors';

type Props = {
  children: ReactNode;
};

export const ProfileCard = memo(function ProfileCard({ children }: Props) {
  return <View style={styles.card}>{children}</View>;
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.navyDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    padding: 14,
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});







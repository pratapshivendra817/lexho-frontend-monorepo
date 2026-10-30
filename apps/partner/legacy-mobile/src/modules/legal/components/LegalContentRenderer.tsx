import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../../constants/colors";
import { parseLegalContent } from "../utils/parseLegalContent";

export default function LegalContentRenderer({ content }: { content: string }) {
  const blocks = parseLegalContent(content);

  return (
    <View style={styles.blocksWrap}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "h1") {
          return (
            <Text key={key} style={styles.h1}>
              {block.text}
            </Text>
          );
        }
        if (block.type === "h2") {
          return (
            <Text key={key} style={styles.h2}>
              {block.text}
            </Text>
          );
        }
        if (block.type === "li") {
          return (
            <Text key={key} style={styles.body}>
              <Text style={styles.marker}>- </Text>
              {block.text}
            </Text>
          );
        }
        if (block.type === "num") {
          return (
            <Text key={key} style={styles.body}>
              <Text style={styles.marker}>{`${index + 1}. `}</Text>
              {block.text}
            </Text>
          );
        }
        if (block.type === "quote") {
          return (
            <Text key={key} style={styles.quote}>
              {block.text}
            </Text>
          );
        }
        return (
          <Text key={key} style={styles.body}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocksWrap: {
    gap: 10,
  },
  h1: {
    color: COLORS.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    marginBottom: 4,
  },
  h2: {
    color: COLORS.accent,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  marker: {
    color: COLORS.accent,
    fontWeight: "800",
  },
  quote: {
    color: COLORS.textPrimary,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    paddingLeft: 10,
    fontSize: 15,
    lineHeight: 24,
  },
});

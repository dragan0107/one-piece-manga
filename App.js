import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import MangaReader from "./components/MangaReader";
import ChapterList from "./components/ChapterList";

const Stack = createNativeStackNavigator();

// One Piece Treasure Gold Theme
const THEME = {
  background: "#0D0D0F",
  surface: "#16161A",
  gold: "#E6A54A",
  textPrimary: "#FAFAFA",
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="ChapterList"
        screenOptions={{
          headerStyle: {
            backgroundColor: THEME.surface,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(230, 165, 74, 0.15)",
          },
          headerTintColor: THEME.gold,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: THEME.background,
          },
        }}
      >
        <Stack.Screen
          name="ChapterList"
          component={ChapterList}
          options={{
            title: "One Piece",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="MangaReader"
          component={MangaReader}
          options={{
            title: "Reading",
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

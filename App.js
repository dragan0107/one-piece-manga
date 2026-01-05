import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import MangaReader from "./components/MangaReader";
import ChapterList from "./components/ChapterList";

const Stack = createNativeStackNavigator();

// One Piece Crimson Theme
const THEME = {
  background: "#0A0A0C",
  surface: "#121214",
  red: "#DC3545",
  textPrimary: "#F5F5F5",
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
            borderBottomColor: "rgba(255, 255, 255, 0.08)",
          },
          headerTintColor: THEME.red,
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

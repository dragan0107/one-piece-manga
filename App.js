import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import MangaReader from "./components/MangaReader";
import ChapterList from "./components/ChapterList";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="ChapterList"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#1a1a1a",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="ChapterList"
          component={ChapterList}
          options={{ title: "One Piece Manga" }}
        />
        <Stack.Screen
          name="MangaReader"
          component={MangaReader}
          options={{ title: "Reading..." }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

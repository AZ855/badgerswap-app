import { Stack } from "expo-router";

export default function ConversationLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,   // hide header for ALL screens inside /conversation
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="[threadId]" options={{ headerShown: false }} />
        </Stack>
    );
}
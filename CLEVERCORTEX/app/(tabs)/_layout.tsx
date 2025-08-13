import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ActivityIndicator, View } from "react-native";

export default function TabsLayout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || !userDoc.data()?.hasTakenTest) {
          router.replace("/auth/OnboardingTest");
          return;
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="HomeScreen" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
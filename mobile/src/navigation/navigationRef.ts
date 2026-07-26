import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigateFromNotification(screen: "Meds" | "Vitals") {
  if (navigationRef.isReady()) {
    // @ts-ignore - tab screens live under the Main stack route
    navigationRef.navigate("Main", { screen });
  }
}

import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "../navigation/navigationRef";

export function openConditionEducationAfterSave(navigation: any, condition: string) {
  const action = CommonActions.navigate({
    name: "ConditionEducation",
    params: { condition },
  });

  setTimeout(() => {
    try {
      navigation?.dispatch?.(action);
      navigation?.navigate?.("ConditionEducation", { condition });
    } catch {
      // Fall back to the root navigation ref below.
    }

    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(action);
      }
    }, 120);
  }, 650);
}

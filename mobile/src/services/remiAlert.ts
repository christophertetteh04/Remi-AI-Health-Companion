import type { AlertButton, AlertOptions } from "react-native";

type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

let showAlert: ((payload: AlertPayload) => void) | null = null;
let originalAlert: ((title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void) | null = null;

export function registerRemiAlertHost(handler: (payload: AlertPayload) => void) {
  showAlert = handler;
  return () => {
    if (showAlert === handler) showAlert = null;
  };
}

export function installRemiAlert(AlertModule: { alert: (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void }) {
  if (originalAlert) return;
  originalAlert = AlertModule.alert.bind(AlertModule);
  AlertModule.alert = (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    if (showAlert) showAlert({ title, message, buttons, options });
    else originalAlert?.(title, message, buttons, options);
  };
}

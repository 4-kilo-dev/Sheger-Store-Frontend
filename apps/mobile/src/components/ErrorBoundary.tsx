import { Component, type ReactNode } from "react";
import { View } from "react-native";
import { AppText, Button, Screen } from "@/components/ui";
import { colors } from "@/theme/tokens";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level crash guard. Without this, any uncaught render error (a bad API
 * response shape, a null-dereference in a screen) takes down the whole app
 * with no recovery path — the user is stuck on a native red/white-screen
 * crash until they force-quit and relaunch.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled error caught by ErrorBoundary:", error);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Screen>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <AppText variant="title" style={{ textAlign: "center" }}>
              Something went wrong
            </AppText>
            <AppText variant="subtitle" color={colors.text2} style={{ textAlign: "center" }}>
              This screen hit an unexpected error. Your other data is safe — try reloading.
            </AppText>
            <Button onPress={this.reset}>Try Again</Button>
          </View>
        </Screen>
      );
    }
    return this.props.children;
  }
}

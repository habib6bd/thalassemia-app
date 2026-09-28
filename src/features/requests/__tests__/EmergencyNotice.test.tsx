import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { PaperProvider } from "react-native-paper";

import {
  EmergencyBadge,
  EmergencyNotice,
} from "@/features/requests/components/EmergencyNotice";
import "@/lib/i18n";

describe("EmergencyNotice", () => {
  it("says the app is not an emergency service and offers to call 999", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await render(
      <PaperProvider>
        <EmergencyNotice />
      </PaperProvider>,
    );

    expect(screen.getByText(/এই অ্যাপ কোনো জরুরি সেবা নয়|not an emergency service/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/999/));
    expect(openURL).toHaveBeenCalledWith("tel:999");
  });

  it("can hide the call button", async () => {
    await render(
      <PaperProvider>
        <EmergencyNotice showCallButton={false} />
      </PaperProvider>,
    );
    expect(screen.queryByLabelText(/999/)).toBeNull();
  });
});

describe("EmergencyBadge", () => {
  it("labels emergencies with text, not colour alone", async () => {
    await render(
      <PaperProvider>
        <EmergencyBadge />
      </PaperProvider>,
    );
    expect(screen.getByText(/^(জরুরি|Emergency)$/)).toBeTruthy();
  });
});

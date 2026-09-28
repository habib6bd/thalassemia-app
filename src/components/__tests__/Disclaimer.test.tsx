import { render, screen } from "@testing-library/react-native";

import { Disclaimer } from "@/components/Disclaimer";
import "@/lib/i18n";

describe("Disclaimer", () => {
  it("renders the generic disclaimer text by default", async () => {
    await render(<Disclaimer />);
    expect(screen.getByText(/দাতার যোগ্যতা|donor eligibility/i)).toBeTruthy();
  });

  it("renders a screen-specific disclaimer when given a textKey", async () => {
    await render(<Disclaimer textKey="donorProfile.eligibilityDisclaimer" />);
    expect(screen.getByText(/ব্লাড ব্যাংক|blood bank/i)).toBeTruthy();
  });
});

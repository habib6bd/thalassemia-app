import { render, screen } from "@testing-library/react-native";

import { ErrorText } from "@/components/ErrorText";

describe("ErrorText", () => {
  it("renders the given message", async () => {
    await render(<ErrorText message="Something went wrong." />);
    expect(screen.getByText("Something went wrong.")).toBeTruthy();
  });
});

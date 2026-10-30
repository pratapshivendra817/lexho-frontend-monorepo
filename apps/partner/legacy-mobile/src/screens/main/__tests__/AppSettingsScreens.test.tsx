import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AppSettingsScreen from "../AppSettingsScreen";
import LanguageSelectionScreen from "../LanguageSelectionScreen";
import { getAvailableAppLanguages, getCurrentAppLanguage, getSelectedAppLanguage, saveSelectedAppLanguage } from "../../../services/appSettingsService";

const mockToast = jest.fn();

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    refreshLanguage: jest.fn().mockResolvedValue(undefined),
    t: (key: string) => ({ "settings.title": "App Settings", "settings.language": "Language", "settings.change_language": "Select Language", "settings.terms_conditions": "Terms & Conditions", "settings.visit_centre": "Visit Centre" }[key] ?? key),
  }),
}));

jest.mock("../../../services/appSettingsService", () => ({
  getAvailableAppLanguages: jest.fn(),
  getCurrentAppLanguage: jest.fn(),
  getSelectedAppLanguage: jest.fn(),
  saveSelectedAppLanguage: jest.fn(),
}));

describe("App settings language flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentAppLanguage as jest.Mock).mockResolvedValue({ code: "hi", label: "Hindi" });
    (getAvailableAppLanguages as jest.Mock).mockReturnValue([{ code: "en", label: "English" }, { code: "hi", label: "Hindi" }]);
    (getSelectedAppLanguage as jest.Mock).mockResolvedValue("hi");
    (saveSelectedAppLanguage as jest.Mock).mockResolvedValue(undefined);
  });

  it("opens language selection from App Settings", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<AppSettingsScreen navigation={navigation} />);

    expect(await view.findByText("Hindi")).toBeTruthy();
    fireEvent.press(view.getByTestId("app-settings-language-button"));
    expect(navigation.navigate).toHaveBeenCalledWith("LanguageSelection");
  });

  it("opens the legal document screen from App Settings", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<AppSettingsScreen navigation={navigation} />);

    expect(await view.findByText("Terms & Conditions")).toBeTruthy();
    fireEvent.press(view.getByTestId("app-settings-terms-button"));
    expect(navigation.navigate).toHaveBeenCalledWith("LegalDocument", {
      slug: "terms-and-conditions",
      title: "Terms & Conditions",
    });
  });

  it("opens the screening centre screen from App Settings", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<AppSettingsScreen navigation={navigation} />);

    expect(await view.findByText("Visit Centre")).toBeTruthy();
    fireEvent.press(view.getByTestId("app-settings-screening-centre-button"));
    expect(navigation.navigate).toHaveBeenCalledWith("ScreeningCentre");
  });

  it("persists a dynamically supplied language option", async () => {
    const navigation = { goBack: jest.fn() };
    const view = await render(<LanguageSelectionScreen navigation={navigation} />);

    expect(await view.findByText("English")).toBeTruthy();
    fireEvent.press(view.getByTestId("language-option-en"));
    await waitFor(() => {
      expect(saveSelectedAppLanguage).toHaveBeenCalledWith("en");
    });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});

import React from "react";
import { Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import SupportScreen from "../SupportScreen";
import { APP_CONFIG } from "../../../constants/app";

const mockToast = jest.fn();
const mockFetchPartnerSupportTickets = jest.fn();
const mockFetchPartnerSupportTicketDetail = jest.fn();
const mockCreatePartnerSupportTicket = jest.fn();

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../services/supportService", () => ({
  fetchPartnerSupportTickets: (...args: any[]) => mockFetchPartnerSupportTickets(...args),
  fetchPartnerSupportTicketDetail: (...args: any[]) => mockFetchPartnerSupportTicketDetail(...args),
  createPartnerSupportTicket: (...args: any[]) => mockCreatePartnerSupportTicket(...args),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (key: string) =>
      ({
        "support.title": "Support",
        "support.faq_title": "FAQ",
        "support.raise_ticket_title": "Raise Ticket",
        "support.contact_us": "Contact Us",
        "support.call_support": "Call Support",
        "support.email_support": "Email Support",
        "support.new_ticket_title": "New Ticket",
        "support.subject": "Subject",
        "support.description": "Description",
        "support.create_ticket": "Create Ticket",
        "support.ticket_created": "Support ticket created",
        "support.ticket_history_title": "Ticket History",
        "support.ticket_detail_title": "Ticket Detail",
      }[key] ?? key),
  }),
}));

describe("SupportScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    mockFetchPartnerSupportTickets.mockResolvedValue({
      tickets: [
        {
          id: "TKT-1",
          subject: "Payment issue",
          status: "OPEN",
          priority: "HIGH",
          categoryId: "PAYOUT",
          bookingId: "BK-1",
        },
      ],
    });
    mockFetchPartnerSupportTicketDetail.mockResolvedValue({
      id: "TKT-1",
      subject: "Payment issue",
      status: "IN_PROGRESS",
      priority: "HIGH",
      messages: [
        { id: "MSG-1", sender: "PARTNER", message: "Payout delayed", createdAt: "2026-07-20T17:40:00" },
        { id: "MSG-2", sender: "SUPPORT", message: "We are checking this.", createdAt: "2026-07-20T17:45:00" },
      ],
    });
    mockCreatePartnerSupportTicket.mockResolvedValue({
      id: "TKT-2",
      subject: "Need help",
      status: "OPEN",
      priority: "MEDIUM",
      messages: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders support content, loads tickets, creates a ticket, and handles support contact actions", async () => {
    const successView = await render(<SupportScreen />);

    expect(successView.getByText("Support")).toBeTruthy();
    expect(successView.getByText("FAQ")).toBeTruthy();
    expect(successView.getByText("Raise Ticket")).toBeTruthy();
    await waitFor(() => expect(mockFetchPartnerSupportTickets).toHaveBeenCalled());
    await waitFor(() => expect(successView.getAllByText("Payment issue").length).toBeGreaterThan(0));
    fireEvent.press(successView.getAllByText("Payment issue")[0]!);
    await waitFor(() => expect(mockFetchPartnerSupportTicketDetail).toHaveBeenCalledWith("TKT-1"));
    await waitFor(() => expect(successView.getByText("We are checking this.")).toBeTruthy());
    expect(successView.queryByText("Warnings")).toBeNull();
    expect(successView.queryByText("Performance Dashboard")).toBeNull();
    expect(successView.queryByText("Leave Management")).toBeNull();
    expect(successView.queryByText("Logout")).toBeNull();
    expect(successView.getByPlaceholderText("Subject")).toBeTruthy();
    expect(successView.getByPlaceholderText("Description")).toBeTruthy();

    fireEvent.changeText(successView.getByTestId("support-subject-input"), "Need help");
    fireEvent.changeText(successView.getByTestId("support-message-input"), "App is stuck");
    await waitFor(() => expect(successView.getByDisplayValue("Need help")).toBeTruthy());
    await waitFor(() => expect(successView.getByDisplayValue("App is stuck")).toBeTruthy());
    expect(successView.getByText("Create Ticket")).toBeTruthy();
    fireEvent.press(successView.getByTestId("support-submit-button"));
    await waitFor(() =>
      expect(mockCreatePartnerSupportTicket).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "Need help", message: "App is stuck", priority: "MEDIUM" }),
      ),
    );
    expect(mockToast).toHaveBeenCalledWith("Support ticket created");

    fireEvent.press(successView.getByText("Call Support"));
    fireEvent.press(successView.getByText("Email Support"));

    expect(Linking.openURL).toHaveBeenNthCalledWith(1, `tel:${APP_CONFIG.supportPhone.replace(/\s+/g, "")}`);
    expect(Linking.openURL).toHaveBeenNthCalledWith(2, `mailto:${APP_CONFIG.supportEmail}`);
  }, 10000);
});

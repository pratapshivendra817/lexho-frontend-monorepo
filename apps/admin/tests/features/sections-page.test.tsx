import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSectionsQuery: vi.fn(),
  useSectionsMutations: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
}));

vi.mock("@/features/sections/hooks/useSections", () => ({
  useSectionsQuery: mocks.useSectionsQuery,
  useSectionsMutations: mocks.useSectionsMutations,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("@/components/admin", () => ({
  DataState: ({
    isLoading,
    isError,
    isEmpty,
    loadingText,
    errorText,
    emptyText,
    onRetry,
    children,
  }: any) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    if (isEmpty) return <div>{emptyText}</div>;
    return <div>{children}</div>;
  },
  DataTable: ({ rows, columns }: any) => (
    <table>
      <thead>
        <tr>{columns.map((column: any) => <th key={column.key}>{column.header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row: any) => (
          <tr key={row.id}>
            {columns.map((column: any) => <td key={column.key}>{column.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  ModalFormLayout: ({ open, title, onClose, submitLabel, isSubmitting, children, formId }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        <button onClick={onClose}>close-modal</button>
        {children}
        <button form={formId} type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </div>
    ) : null,
}));

import SectionsPage from "@/features/sections/pages/SectionsPage";

function changeInput(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

const sectionRows = [
  {
    id: 1,
    type: "STATS",
    title: "Stats Section",
    subtitle: "Summary",
    icon: "shield",
    color: "#111",
    borderColor: "#222",
    backgroundColor: "#333",
    iconColor: "#444",
    priority: 2,
    active: true,
    items: [
      {
        id: 10,
        title: "Orders",
        subtitle: "Done",
        value: "12",
        icon: "box",
        color: "#555",
        borderColor: "#666",
        backgroundColor: "#777",
        iconColor: "#888",
        priority: 1,
        active: true,
      },
    ],
  },
  {
    id: 2,
    type: "TRUST",
    title: "Trust Section",
    subtitle: null,
    icon: null,
    color: null,
    borderColor: null,
    backgroundColor: null,
    iconColor: null,
    priority: 1,
    active: false,
    items: [],
  },
];

function createMutation(name: string) {
  return {
    isPending: false,
    mutate: vi.fn((_payload: unknown, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      if (name.includes("error")) {
        options?.onError?.({ response: { status: 500 } });
        return;
      }
      options?.onSuccess?.();
    }),
    mutateAsync: vi.fn(async () => undefined),
  };
}

describe("SectionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractApiError.mockReturnValue("mapped error");
    mocks.useSectionsQuery.mockReturnValue({
      data: sectionRows,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useSectionsMutations.mockReturnValue({
      createSectionMutation: createMutation("create"),
      updateSectionMutation: createMutation("update"),
      updateSectionStatusMutation: createMutation("status"),
      reorderSectionsMutation: createMutation("reorder"),
      addSectionItemsMutation: createMutation("add-items"),
      updateSectionItemMutation: createMutation("update-item"),
      updateSectionItemStatusMutation: createMutation("item-status"),
      deleteSectionItemMutation: createMutation("delete-item"),
      reorderSectionItemsMutation: createMutation("reorder-items"),
    });
  });

  it("renders sections, saves reorder, creates a section, edits a section, and toggles section status", async () => {
    const user = userEvent.setup();
    const mutations = mocks.useSectionsMutations.mock.results[0]?.value ?? mocks.useSectionsMutations();
    mocks.useSectionsMutations.mockReturnValue(mutations);

    render(<SectionsPage />);

    expect(screen.getByText("Homepage Sections")).toBeInTheDocument();
    expect(screen.getByText("Stats Section")).toBeInTheDocument();
    expect(screen.getByText("Trust Section")).toBeInTheDocument();

    const priorityInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(priorityInputs[1], { target: { value: "4" } });
    await user.click(screen.getByRole("button", { name: "Save Reorder" }));
    expect(mutations.reorderSectionsMutation.mutate).toHaveBeenCalledWith(
      [
        { id: 2, priority: 1 },
        { id: 1, priority: 4 },
      ],
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Section order updated");

    await user.click(screen.getByRole("button", { name: "+ Create Section" }));
    expect(screen.getByText("Create Section")).toBeInTheDocument();
    const createFields = screen.getAllByRole("textbox");
    await user.type(createFields[0], " New Section ");
    await user.type(createFields[1], " Subtitle ");
    await user.type(createFields[2], " star ");
    await user.click(screen.getByRole("checkbox", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mutations.createSectionMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Section",
        subtitle: "Subtitle",
        icon: "star",
        isActive: false,
      }),
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Section created");

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByText("Edit Section")).toBeInTheDocument();
    const editTitle = screen.getAllByRole("textbox")[0];
    await user.clear(editTitle);
    await user.type(editTitle, " Edited Section ");
    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(mutations.updateSectionMutation.mutate).toHaveBeenCalledWith(
      {
        id: 2,
        payload: expect.objectContaining({ title: "Edited Section" }),
      },
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Section updated");

    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(mutations.updateSectionStatusMutation.mutate).toHaveBeenCalledWith(
      { id: 1, isActive: false },
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Section deactivated");

    await user.click(screen.getByRole("button", { name: "Activate" }));
    expect(mutations.updateSectionStatusMutation.mutate).toHaveBeenCalledWith(
      { id: 2, isActive: true },
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Section activated");
  });

  it("covers loading, retry, empty state, section validation, and section mutation errors", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useSectionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });
    const loadingView = render(<SectionsPage />);
    expect(screen.getByText("Loading sections...")).toBeInTheDocument();

    loadingView.unmount();
    mocks.useSectionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    const errorView = render(<SectionsPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load sections" }));
    expect(refetch).toHaveBeenCalled();

    errorView.unmount();
    mocks.useSectionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch,
    });
    const emptyView = render(<SectionsPage />);
    expect(screen.getByText("No sections found")).toBeInTheDocument();

    emptyView.unmount();
    const createErrorMutations = {
      ...mocks.useSectionsMutations(),
      createSectionMutation: createMutation("create-error"),
      updateSectionMutation: createMutation("update-error"),
      reorderSectionsMutation: createMutation("reorder-error"),
      updateSectionStatusMutation: createMutation("status-error"),
    };
    mocks.useSectionsQuery.mockReturnValue({
      data: sectionRows,
      isLoading: false,
      isError: false,
      refetch,
    });
    mocks.useSectionsMutations.mockReturnValue(createErrorMutations);
    render(<SectionsPage />);

    await user.click(screen.getByRole("button", { name: "+ Create Section" }));
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Title is required");

    const titleInput = screen.getAllByRole("textbox")[0];
    await user.type(titleInput, "Valid");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");

    await user.click(screen.getByRole("button", { name: "close-modal" }));
    await user.click(screen.getByRole("button", { name: "Save Reorder" }));
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");

    await user.click(screen.getAllByRole("button", { name: "Deactivate" })[0]);
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");
  });

  it("manages item rows, saves existing/new items, toggles local and remote item status, and deletes rows", async () => {
    const user = userEvent.setup();
    const mutations = {
      ...mocks.useSectionsMutations(),
      addSectionItemsMutation: { ...createMutation("add-items"), mutateAsync: vi.fn(async () => undefined) },
      updateSectionItemMutation: { ...createMutation("update-item"), mutateAsync: vi.fn(async () => undefined) },
      reorderSectionItemsMutation: { ...createMutation("reorder-items"), mutateAsync: vi.fn(async () => undefined) },
      updateSectionItemStatusMutation: createMutation("item-status"),
      deleteSectionItemMutation: createMutation("delete-item"),
    };
    mocks.useSectionsMutations.mockReturnValue(mutations);

    render(<SectionsPage />);

    await user.click(screen.getAllByRole("button", { name: "Manage Items" })[1]);
    expect(screen.getByText("Manage Items: Stats Section")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Orders")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Add Item Row" }));
    expect(screen.getAllByPlaceholderText("Title")).toHaveLength(2);

    const titles = screen.getAllByPlaceholderText("Title");
    await user.type(titles[1], " New Item ");
    const icons = screen.getAllByPlaceholderText("Icon");
    await user.type(icons[1], " bell ");

    const activeButtons = screen.getAllByRole("button", { name: /active|inactive/i });
    await user.click(activeButtons[1]);
    expect(screen.getByRole("button", { name: "Inactive" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save Items" }));
    await waitFor(() => {
      expect(mutations.updateSectionItemMutation.mutateAsync).toHaveBeenCalledWith({
        sectionId: 1,
        itemId: 10,
        payload: expect.objectContaining({ title: "Orders", icon: "box" }),
      });
    });
    expect(mutations.addSectionItemsMutation.mutateAsync).toHaveBeenCalledWith({
      id: 1,
      items: [expect.objectContaining({ title: "New Item", icon: "bell" })],
    });
    expect(mutations.reorderSectionItemsMutation.mutateAsync).toHaveBeenCalledWith({
      sectionId: 1,
      rows: [{ id: 10, priority: 1 }],
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Section items saved");

    await user.click(screen.getAllByRole("button", { name: "Manage Items" })[1]);
    await user.click(screen.getByRole("button", { name: "Active" }));
    expect(mutations.updateSectionItemStatusMutation.mutate).toHaveBeenCalledWith(
      { sectionId: 1, itemId: 10, isActive: false },
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Item deactivated");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(mutations.deleteSectionItemMutation.mutate).toHaveBeenCalledWith(
      { sectionId: 1, itemId: 10 },
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Item deleted");

    await user.click(screen.getAllByRole("button", { name: "Manage Items" })[1]);
    expect(screen.getAllByPlaceholderText("Title")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByPlaceholderText("Title")).not.toBeInTheDocument();
  });

  it("shows item validation and item mutation errors", async () => {
    const user = userEvent.setup();
    const failingMutations = {
      ...mocks.useSectionsMutations(),
      addSectionItemsMutation: { ...createMutation("add-items"), mutateAsync: vi.fn(async () => { throw { response: { status: 500 } }; }) },
      updateSectionItemMutation: { ...createMutation("update-item"), mutateAsync: vi.fn(async () => undefined) },
      reorderSectionItemsMutation: { ...createMutation("reorder-items"), mutateAsync: vi.fn(async () => undefined) },
      updateSectionItemStatusMutation: createMutation("item-status-error"),
      deleteSectionItemMutation: createMutation("delete-item-error"),
    };
    mocks.useSectionsMutations.mockReturnValue(failingMutations);

    render(<SectionsPage />);

    await user.click(screen.getAllByRole("button", { name: "Manage Items" })[1]);
    const titleInput = screen.getByDisplayValue("Orders");
    await user.clear(titleInput);
    await user.click(screen.getByRole("button", { name: "Save Items" }));
    expect(mocks.toastError).toHaveBeenCalledWith("Title required for item #1");

    await user.type(titleInput, "Orders");
    await user.click(screen.getByRole("button", { name: "+ Add Item Row" }));
    await user.type(screen.getAllByPlaceholderText("Title")[1], "Bad row");
    await user.type(screen.getAllByPlaceholderText("Icon")[1], "icon");
    await user.click(screen.getByRole("button", { name: "Save Items" }));
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("mapped error");
    });

    await user.click(screen.getAllByRole("button", { name: "Active" })[0]);
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");
  });

  it("covers section form field handlers and local item editing branches for empty sections", async () => {
    const user = userEvent.setup();

    render(<SectionsPage />);

    await user.click(screen.getByRole("button", { name: "+ Create Section" }));
    const typeSelect = screen.getByRole("combobox");
    await user.selectOptions(typeSelect, "HIGHLIGHTS");
    expect(typeSelect).toHaveValue("HIGHLIGHTS");

    const sectionNumberFields = screen.getAllByRole("spinbutton");
    fireEvent.change(sectionNumberFields[0], { target: { value: "0" } });

    const sectionInputs = screen.getAllByRole("textbox");
    changeInput(sectionInputs[0], " Highlight title ");
    changeInput(sectionInputs[1], " Highlight subtitle ");
    changeInput(sectionInputs[2], " sparkle ");
    changeInput(sectionInputs[3], " #123456 ");
    changeInput(sectionInputs[4], " #654321 ");
    changeInput(sectionInputs[5], " #abcdef ");
    changeInput(sectionInputs[6], " #fedcba ");
    await user.click(screen.getByRole("checkbox", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    const mutations = mocks.useSectionsMutations.mock.results[0]?.value ?? mocks.useSectionsMutations();
    expect(mutations.createSectionMutation.mutate).toHaveBeenCalledWith(
      {
        type: "HIGHLIGHTS",
        title: "Highlight title",
        subtitle: "Highlight subtitle",
        icon: "sparkle",
        color: "#123456",
        borderColor: "#654321",
        backgroundColor: "#abcdef",
        iconColor: "#fedcba",
        priority: 1,
        isActive: false,
      },
      expect.any(Object),
    );

    await user.click(screen.getAllByRole("button", { name: "Manage Items" })[0]);
    expect(screen.getByText("Manage Items: Trust Section")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Priority")).toHaveValue(1);

    const itemInputs = screen.getAllByRole("textbox");
    changeInput(itemInputs[0], " Trust item ");
    changeInput(itemInputs[1], " Optional subtitle ");
    changeInput(itemInputs[2], " 50 ");
    changeInput(itemInputs[3], " hand ");
    changeInput(itemInputs[4], " #111111 ");
    changeInput(itemInputs[5], " #222222 ");
    changeInput(itemInputs[6], " #333333 ");
    changeInput(itemInputs[7], " #444444 ");

    fireEvent.change(screen.getByPlaceholderText("Priority"), { target: { value: "0" } });
    await user.click(screen.getByRole("button", { name: "Active" }));
    expect(screen.getByRole("button", { name: "Inactive" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Add Item Row" }));
    expect(screen.getAllByPlaceholderText("Title")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    expect(screen.getAllByPlaceholderText("Title")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Save Items" }));
    await waitFor(() => {
      expect(mutations.addSectionItemsMutation.mutateAsync).toHaveBeenCalledWith({
        id: 2,
        items: [
          {
            title: "Trust item",
            subtitle: "Optional subtitle",
            value: "50",
            icon: "hand",
            color: "#111111",
            borderColor: "#222222",
            backgroundColor: "#333333",
            iconColor: "#444444",
            priority: 1,
            isActive: false,
          },
        ],
      });
    });
  }, 10000);

  it("covers null-fallback rendering and activating an existing inactive item", async () => {
    const user = userEvent.setup();
    const mutations = {
      ...mocks.useSectionsMutations(),
      updateSectionItemMutation: { ...createMutation("update-item"), mutateAsync: vi.fn(async () => undefined) },
      reorderSectionItemsMutation: { ...createMutation("reorder-items"), mutateAsync: vi.fn(async () => undefined) },
      updateSectionItemStatusMutation: createMutation("item-status"),
    };

    mocks.useSectionsQuery.mockReturnValue({
      data: [
        {
          id: 3,
          type: "TAGLINE",
          title: null,
          subtitle: null,
          icon: null,
          color: null,
          borderColor: null,
          backgroundColor: null,
          iconColor: null,
          priority: 3,
          active: false,
          items: [
            {
              id: 20,
              title: "Badge",
              subtitle: null,
              value: null,
              icon: "",
              color: null,
              borderColor: null,
              backgroundColor: null,
              iconColor: null,
              priority: 2,
              active: false,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useSectionsMutations.mockReturnValue(mutations);

    render(<SectionsPage />);

    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const editFields = screen.getAllByRole("textbox");
    expect(editFields[0]).toHaveValue("");
    expect(editFields[1]).toHaveValue("");
    expect(editFields[2]).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "close-modal" }));
    await user.click(screen.getAllByRole("button", { name: "Manage Items" })[0]);
    expect(screen.getByText("Manage Items: TAGLINE")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Subtitle")).toHaveValue("");
    expect(screen.getByPlaceholderText("Value")).toHaveValue("");
    expect(screen.getByPlaceholderText("Icon")).toHaveValue("");
    expect(screen.getByPlaceholderText("Text #")).toHaveValue("");
    expect(screen.getByPlaceholderText("Border #")).toHaveValue("");
    expect(screen.getByPlaceholderText("Bg #")).toHaveValue("");
    expect(screen.getByPlaceholderText("Icon #")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Inactive" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inactive" }));
    expect(mutations.updateSectionItemStatusMutation.mutate).toHaveBeenCalledWith(
      { sectionId: 3, itemId: 20, isActive: true },
      expect.any(Object),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Item activated");

    await user.click(screen.getByRole("button", { name: "Save Items" }));
    await waitFor(() => {
      expect(mutations.updateSectionItemMutation.mutateAsync).toHaveBeenCalledWith({
        sectionId: 3,
        itemId: 20,
        payload: {
          title: "Badge",
          subtitle: null,
          value: null,
          icon: "",
          color: null,
          borderColor: null,
          backgroundColor: null,
          iconColor: null,
          priority: 2,
          isActive: true,
        },
      });
    });
    expect(mutations.reorderSectionItemsMutation.mutateAsync).toHaveBeenCalledWith({
      sectionId: 3,
      rows: [{ id: 20, priority: 2 }],
    });
  });

  it("covers undefined priority and optional-field fallbacks for section and item payloads", async () => {
    const user = userEvent.setup();
    const mutations = {
      ...mocks.useSectionsMutations(),
      updateSectionMutation: createMutation("update"),
      reorderSectionsMutation: createMutation("reorder"),
      updateSectionItemMutation: { ...createMutation("update-item"), mutateAsync: vi.fn(async () => undefined) },
      reorderSectionItemsMutation: { ...createMutation("reorder-items"), mutateAsync: vi.fn(async () => undefined) },
    };

    mocks.useSectionsQuery.mockReturnValue({
      data: [
        {
          id: 9,
          type: "HIGHLIGHTS",
          title: "  Hero Stats  ",
          subtitle: undefined,
          icon: undefined,
          color: undefined,
          borderColor: undefined,
          backgroundColor: undefined,
          iconColor: undefined,
          priority: undefined,
          active: true,
          items: [
            {
              id: 21,
              title: " Item badge ",
              subtitle: undefined,
              value: undefined,
              icon: undefined,
              color: undefined,
              borderColor: undefined,
              backgroundColor: undefined,
              iconColor: undefined,
              priority: undefined,
              active: true,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useSectionsMutations.mockReturnValue(mutations);

    render(<SectionsPage />);

    await user.click(screen.getByRole("button", { name: "Save Reorder" }));
    expect(mutations.reorderSectionsMutation.mutate).toHaveBeenCalledWith(
      [{ id: 9, priority: 1 }],
      expect.any(Object),
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const editFields = screen.getAllByRole("textbox");
    expect(editFields[1]).toHaveValue("");
    expect(editFields[2]).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(mutations.updateSectionMutation.mutate).toHaveBeenCalledWith(
      {
        id: 9,
        payload: {
          type: "HIGHLIGHTS",
          title: "Hero Stats",
          subtitle: null,
          icon: null,
          color: null,
          borderColor: null,
          backgroundColor: null,
          iconColor: null,
          priority: 1,
          isActive: true,
        },
      },
      expect.any(Object),
    );

    await user.click(screen.getByRole("button", { name: "Manage Items" }));
    expect(screen.getByText("Manage Items: Hero Stats")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Icon")).toHaveValue("");
    expect(screen.getByPlaceholderText("Subtitle")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Save Items" }));
    await waitFor(() => {
      expect(mutations.updateSectionItemMutation.mutateAsync).toHaveBeenCalledWith({
        sectionId: 9,
        itemId: 21,
        payload: {
          title: "Item badge",
          subtitle: null,
          value: null,
          icon: "",
          color: null,
          borderColor: null,
          backgroundColor: null,
          iconColor: null,
          priority: 1,
          isActive: true,
        },
      });
    });
    expect(mutations.reorderSectionItemsMutation.mutateAsync).toHaveBeenCalledWith({
      sectionId: 9,
      rows: [{ id: 21, priority: 1 }],
    });
  });
});

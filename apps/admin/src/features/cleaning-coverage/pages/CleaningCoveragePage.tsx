import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { ConfirmDialog, DataState, DataTable, ModalFormLayout } from "@/components/admin";
import { getServices } from "@/services/lexhoAdminApi";
import type { ServiceItem } from "@/types/adminCatalog";
import { extractApiError } from "@/utils/apiError";

import {
  createAdminCleaningCoverage,
  createAdminCookCoverage,
  deleteAdminCleaningCoverage,
  deleteAdminCookCoverage,
  getAdminCleaningCoverage,
  getAdminCookCoverage,
  updateAdminCleaningCoverage,
  updateAdminCookCoverage,
} from "../api/cleaningCoverageApi";
import {
  createAdminCookSubscriptionPricing,
  createAdminSubscriptionPricing,
  deleteAdminCookSubscriptionPricing,
  deleteAdminSubscriptionPricing,
  getAdminCookSubscriptionPricing,
  getAdminSubscriptionPricing,
  updateAdminCookSubscriptionPricing,
  updateAdminSubscriptionPricing,
} from "../../subscriptions/api/subscriptionPricingApi";
import type {
  AdminCookSubscriptionPricing,
  AdminCookSubscriptionPricingPayload,
  AdminSubscriptionPricing,
  AdminSubscriptionPricingPayload,
} from "../../subscriptions/pricingTypes";
import type {
  AdminCleaningCoverage,
  AdminCleaningCoveragePayload,
  AdminCleaningCoverageTask,
  AdminCookCoverage,
  AdminCookCoverageItem,
  AdminCookCoveragePayload,
  CookFamilySize,
} from "../types";

type CoverageMode = "CLEANING" | "COOK";
type CleaningFormState = {
  durationHours: string;
  reference: string;
  sortOrder: string;
  active: boolean;
  tasks: Array<AdminCleaningCoverageTask & { localId: string }>;
};
type CookFormState = {
  serviceId: string;
  familySize: CookFamilySize;
  members: string;
  familySizeLabel: string;
  reference: string;
  sortOrder: string;
  active: boolean;
  items: Array<AdminCookCoverageItem & { localId: string }>;
};
type CleaningPriceFormState = {
  serviceId: string;
  durationHours: string;
  perVisitPrice: string;
  active: boolean;
};
type CookPriceFormState = {
  serviceId: string;
  familySize: CookFamilySize;
  pricePerVisit: string;
  active: boolean;
};

type CleaningPriceValidationContext = {
  rows: AdminSubscriptionPricing[];
  editingId?: number;
};

type CookCoverageValidationContext = {
  requireRoti: boolean;
};

const cleaningIconOptions = ["bathroom", "utensils", "balcony", "fan", "dusting", "mopping", "window", "kitchen"];
const cookIconOptions = ["dal", "rice", "sabzi", "roti", "salad", "meal-prep", "chef-hat", "poha", "idli", "dosa", "paratha", "omelette", "tea"];
const familySizeOptions: Array<{ value: CookFamilySize; members: string; label: string }> = [
  { value: "SMALL", members: "1-2", label: "1-2 Members" },
  { value: "MEDIUM", members: "3-4", label: "3-4 Members" },
  { value: "LARGE", members: "5-6", label: "5-6 Members" },
  { value: "XLARGE", members: "6-8", label: "6-8 Members" },
];

function normalizeSearch(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

type CookServiceOption = Pick<ServiceItem, "id" | "name" | "categoryName" | "serviceType">;

function isCookFoodService(service: CookServiceOption) {
  const normalizedName = normalizeSearch(service.name);
  const normalizedCategory = normalizeSearch(service.categoryName ?? "");
  const normalizedServiceType = normalizeSearch(service.serviceType ?? "");

  if (normalizedServiceType.includes("cook") || normalizedServiceType.includes("breakfast")) return true;
  if (normalizedCategory.includes("cook at home") || normalizedCategory.includes("breakfast at home")) return true;

  return normalizedName.includes("cook")
    || normalizedName.includes("chef")
    || normalizedName.includes("breakfast")
    || normalizedName.includes("meal")
    || normalizedName.includes("kitchen")
    || normalizedName.includes("veg")
    || normalizedName.includes("party");
}

function isBreakfastService(service: CookServiceOption | null | undefined) {
  return normalizeSearch(`${service?.name ?? ""} ${service?.categoryName ?? ""} ${service?.serviceType ?? ""}`).includes("breakfast");
}

let nextCoverageLocalId = 0;
const makeCoverageLocalId = () => {
  nextCoverageLocalId += 1;
  return `coverage-${Date.now()}-${nextCoverageLocalId}`;
};

const newTask = (): CleaningFormState["tasks"][number] => ({
  localId: makeCoverageLocalId(),
  name: "",
  estimatedMinutes: 10,
  icon: "bathroom",
  sortOrder: 1,
});

const newCookItem = (): CookFormState["items"][number] => ({
  localId: makeCoverageLocalId(),
  name: "",
  icon: "dal",
  sortOrder: 1,
  quantity: 1,
});

const defaultCleaningForm: CleaningFormState = {
  durationHours: "1",
  reference: "2BHK",
  sortOrder: "100",
  active: true,
  tasks: [newTask()],
};

const defaultCookForm: CookFormState = {
  serviceId: "",
  familySize: "MEDIUM",
  members: "3-4",
  familySizeLabel: "3-4 Members",
  reference: "Standard home cooking",
  sortOrder: "20",
  active: true,
  items: [newCookItem()],
};
const defaultCleaningPriceForm: CleaningPriceFormState = {
  serviceId: "",
  durationHours: "1",
  perVisitPrice: "",
  active: true,
};
const defaultCookPriceForm: CookPriceFormState = {
  serviceId: "",
  familySize: "MEDIUM",
  pricePerVisit: "",
  active: true,
};

function toCleaningForm(row: AdminCleaningCoverage): CleaningFormState {
  return {
    durationHours: String(row.durationHours),
    reference: row.reference || "2BHK",
    sortOrder: String(row.sortOrder || Math.round(Number(row.durationHours || 0) * 100)),
    active: row.active,
    tasks:
      row.tasks.length > 0
        ? row.tasks.map((task, index) => ({
            ...task,
            localId: `${task.id ?? "task"}-${index}`,
            sortOrder: task.sortOrder ?? index + 1,
          }))
        : [newTask()],
  };
}

function toCookForm(row: AdminCookCoverage): CookFormState {
  return {
    serviceId: row.serviceId == null ? "" : String(row.serviceId),
    familySize: row.familySize,
    members: row.members,
    familySizeLabel: row.familySizeLabel,
    reference: row.reference || "Standard home cooking",
    sortOrder: String(row.sortOrder || 20),
    active: row.active,
    items:
      row.items.length > 0
        ? row.items.map((item, index) => ({
            ...item,
            localId: `${item.id ?? "item"}-${index}`,
            sortOrder: item.sortOrder ?? index + 1,
            quantity: item.quantity ?? 1,
          }))
        : [newCookItem()],
  };
}

function toCleaningPriceForm(row: AdminSubscriptionPricing): CleaningPriceFormState {
  return {
    serviceId: row.serviceId == null ? "" : String(row.serviceId),
    durationHours: String(row.durationHours),
    perVisitPrice: String(row.perVisitPrice),
    active: row.active,
  };
}

function toCookPriceForm(row: AdminCookSubscriptionPricing): CookPriceFormState {
  return {
    serviceId: row.serviceId == null ? "" : String(row.serviceId),
    familySize: row.familySize as CookFamilySize,
    pricePerVisit: String(row.pricePerVisit),
    active: row.active,
  };
}

function toCleaningPayload(form: CleaningFormState): AdminCleaningCoveragePayload {
  return {
    durationHours: Number(form.durationHours),
    reference: form.reference.trim(),
    sortOrder: Number(form.sortOrder || 0),
    active: form.active,
    tasks: form.tasks
      .map((task, index) => ({
        id: task.id,
        name: task.name.trim(),
        estimatedMinutes: Number(task.estimatedMinutes),
        icon: task.icon.trim(),
        sortOrder: Number(task.sortOrder ?? index + 1),
      }))
      .filter((task) => task.name && task.icon && task.estimatedMinutes > 0),
  };
}

function toCookPayload(form: CookFormState): AdminCookCoveragePayload {
  const serviceId = Number(form.serviceId);
  return {
    serviceId,
    familySize: form.familySize,
    members: form.members.trim(),
    familySizeLabel: form.familySizeLabel.trim(),
    reference: form.reference.trim(),
    sortOrder: Number(form.sortOrder || 0),
    active: form.active,
    items: form.items
      .map((item, index) => ({
        id: item.id,
        name: item.name.trim(),
        icon: item.icon.trim(),
        sortOrder: Number(item.sortOrder ?? index + 1),
        quantity: Number(item.quantity ?? 0),
      }))
      .filter((item) => item.name && item.icon),
  };
}

function toCleaningPricePayload(form: CleaningPriceFormState): AdminSubscriptionPricingPayload {
  const serviceId = Number(form.serviceId);
  return {
    serviceId: form.serviceId.trim() ? (Number.isFinite(serviceId) && serviceId > 0 ? serviceId : null) : null,
    durationHours: Number(form.durationHours),
    perVisitPrice: Number(form.perVisitPrice),
    active: form.active,
  };
}

function toCookPricePayload(form: CookPriceFormState): AdminCookSubscriptionPricingPayload {
  const serviceId = Number(form.serviceId);
  return {
    serviceId: form.serviceId.trim() ? (Number.isFinite(serviceId) && serviceId > 0 ? serviceId : null) : null,
    familySize: form.familySize,
    pricePerVisit: Number(form.pricePerVisit),
    active: form.active,
  };
}

function validateCleaningPayload(payload: AdminCleaningCoveragePayload) {
  if (!Number.isFinite(payload.durationHours) || payload.durationHours <= 0) return "Duration is required";
  if (!payload.reference) return "Reference is required";
  if (payload.tasks.length === 0) return "At least one task is required";
  return "";
}

function validateCookPayload(payload: AdminCookCoveragePayload, context: CookCoverageValidationContext) {
  if (!Number.isFinite(payload.serviceId) || payload.serviceId <= 0) return "Service ID is required";
  if (!payload.familySize) return "Family size is required";
  if (!payload.members) return "Members label is required";
  if (!payload.familySizeLabel) return "Family size label is required";
  if (payload.items.length === 0) return "At least one item is required";
  if (context.requireRoti) {
    const rotiItem = payload.items.find((item) => normalizeSearch(item.name).includes("roti"));
    if (!rotiItem || !Number.isFinite(rotiItem.quantity) || Number(rotiItem.quantity) <= 0) return "Roti quantity is required";
  }
  if (payload.items.some((item) => !Number.isFinite(item.quantity) || Number(item.quantity) <= 0)) return "Item quantity is required";
  return "";
}

function validateCleaningPricePayload(payload: AdminSubscriptionPricingPayload) {
  if (!Number.isFinite(payload.durationHours) || payload.durationHours <= 0) return "Duration is required";
  if (!Number.isFinite(payload.perVisitPrice) || payload.perVisitPrice <= 0) return "Per visit price is required";
  return "";
}

function validateCleaningPriceMonotonicity(
  payload: AdminSubscriptionPricingPayload,
  context: CleaningPriceValidationContext,
) {
  const comparableRows = context.rows
    .filter((row) => row.active)
    .filter((row) => row.id !== context.editingId)
    .filter((row) => row.serviceId === payload.serviceId);

  const lowerDurationRows = comparableRows.filter((row) => row.durationHours < payload.durationHours);
  const higherDurationRows = comparableRows.filter((row) => row.durationHours > payload.durationHours);

  const nearestLower = lowerDurationRows.reduce<AdminSubscriptionPricing | null>(
    (best, row) => (!best || row.durationHours > best.durationHours ? row : best),
    null,
  );
  if (nearestLower && payload.perVisitPrice <= nearestLower.perVisitPrice) {
    return `Price must be greater than Rs. ${nearestLower.perVisitPrice} because ${payload.durationHours} hr is longer than ${nearestLower.durationHours} hr`;
  }

  const nearestHigher = higherDurationRows.reduce<AdminSubscriptionPricing | null>(
    (best, row) => (!best || row.durationHours < best.durationHours ? row : best),
    null,
  );
  if (nearestHigher && payload.perVisitPrice >= nearestHigher.perVisitPrice) {
    return `Price must be less than Rs. ${nearestHigher.perVisitPrice} because ${payload.durationHours} hr is shorter than ${nearestHigher.durationHours} hr`;
  }

  return "";
}

function validateCookPricePayload(payload: AdminCookSubscriptionPricingPayload) {
  if (!payload.familySize) return "Family size is required";
  if (!Number.isFinite(payload.pricePerVisit) || payload.pricePerVisit <= 0) return "Per visit price is required";
  return "";
}

function validateCookCoverageDuplicate(
  payload: AdminCookCoveragePayload,
  rows: AdminCookCoverage[],
  editingId?: number,
) {
  const existing = rows.find(
    (row) =>
      row.active
      && row.id !== editingId
      && Number(row.serviceId) === Number(payload.serviceId)
      && row.familySize === payload.familySize,
  );

  if (!existing) return "";
  return "Cook coverage already exists for this service and family size. Please edit the existing record.";
}

export default function CleaningCoveragePage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CoverageMode>("CLEANING");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCleaning, setEditingCleaning] = useState<AdminCleaningCoverage | null>(null);
  const [editingCook, setEditingCook] = useState<AdminCookCoverage | null>(null);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [editingCleaningPrice, setEditingCleaningPrice] = useState<AdminSubscriptionPricing | null>(null);
  const [editingCookPrice, setEditingCookPrice] = useState<AdminCookSubscriptionPricing | null>(null);
  const [deactivateCleaningTarget, setDeactivateCleaningTarget] = useState<AdminCleaningCoverage | null>(null);
  const [deactivateCookTarget, setDeactivateCookTarget] = useState<AdminCookCoverage | null>(null);
  const [deleteCleaningTarget, setDeleteCleaningTarget] = useState<AdminCleaningCoverage | null>(null);
  const [deleteCookTarget, setDeleteCookTarget] = useState<AdminCookCoverage | null>(null);
  const [deleteCleaningPriceTarget, setDeleteCleaningPriceTarget] = useState<AdminSubscriptionPricing | null>(null);
  const [deleteCookPriceTarget, setDeleteCookPriceTarget] = useState<AdminCookSubscriptionPricing | null>(null);
  const [cleaningForm, setCleaningForm] = useState<CleaningFormState>(defaultCleaningForm);
  const [cookForm, setCookForm] = useState<CookFormState>(defaultCookForm);
  const [cleaningPriceForm, setCleaningPriceForm] = useState<CleaningPriceFormState>(defaultCleaningPriceForm);
  const [cookPriceForm, setCookPriceForm] = useState<CookPriceFormState>(defaultCookPriceForm);

  const cleaningQuery = useQuery({
    queryKey: ["admin-cleaning-coverage"],
    queryFn: getAdminCleaningCoverage,
    retry: false,
  });
  const cookQuery = useQuery({
    queryKey: ["admin-cook-coverage"],
    queryFn: getAdminCookCoverage,
    retry: false,
  });
  const cleaningPricingQuery = useQuery({
    queryKey: ["admin-subscription-pricing"],
    queryFn: getAdminSubscriptionPricing,
    retry: false,
  });
  const cookPricingQuery = useQuery({
    queryKey: ["admin-cook-subscription-pricing"],
    queryFn: getAdminCookSubscriptionPricing,
    retry: false,
  });
  const serviceOptionsQuery = useQuery({
    queryKey: ["admin-services-for-cook-coverage"],
    queryFn: async () => {
      const response = await getServices({ page: 1, limit: 500 });
      return response.items;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const createCleaningMutation = useMutation({
    mutationFn: createAdminCleaningCoverage,
    onSuccess: async () => {
      toast.success("Cleaning coverage created");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cleaning-coverage"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create cleaning coverage")),
  });
  const updateCleaningMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCleaningCoveragePayload }) =>
      updateAdminCleaningCoverage(id, payload),
    onSuccess: async () => {
      toast.success("Cleaning coverage updated");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cleaning-coverage"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update cleaning coverage")),
  });
  const deactivateCleaningMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCleaningCoveragePayload }) =>
      updateAdminCleaningCoverage(id, { ...payload, active: false }),
    onSuccess: async () => {
      toast.success("Cleaning coverage deactivated");
      setDeactivateCleaningTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-cleaning-coverage"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to deactivate cleaning coverage")),
  });
  const deleteCleaningMutation = useMutation({
    mutationFn: deleteAdminCleaningCoverage,
    onSuccess: async () => {
      toast.success("Cleaning coverage deleted");
      queryClient.setQueryData<AdminCleaningCoverage[]>(["admin-cleaning-coverage"], (current) =>
        (current ?? []).filter((row) => row.id !== deleteCleaningTarget?.id),
      );
      setDeleteCleaningTarget(null);
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete cleaning coverage")),
  });

  const createCookMutation = useMutation({
    mutationFn: createAdminCookCoverage,
    onSuccess: async () => {
      toast.success("Cook coverage created");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-coverage"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create cook coverage")),
  });
  const updateCookMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCookCoveragePayload }) => updateAdminCookCoverage(id, payload),
    onSuccess: async () => {
      toast.success("Cook coverage updated");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-coverage"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update cook coverage")),
  });
  const deactivateCookMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCookCoveragePayload }) =>
      updateAdminCookCoverage(id, { ...payload, active: false }),
    onSuccess: async () => {
      toast.success("Cook coverage deactivated");
      setDeactivateCookTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-coverage"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to deactivate cook coverage")),
  });
  const deleteCookMutation = useMutation({
    mutationFn: deleteAdminCookCoverage,
    onSuccess: async () => {
      toast.success("Cook coverage deleted");
      queryClient.setQueryData<AdminCookCoverage[]>(["admin-cook-coverage"], (current) =>
        (current ?? []).filter((row) => row.id !== deleteCookTarget?.id),
      );
      setDeleteCookTarget(null);
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to delete cook coverage")),
  });

  const createCleaningPriceMutation = useMutation({
    mutationFn: createAdminSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Subscription price created");
      closePricingModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create subscription price")),
  });
  const updateCleaningPriceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminSubscriptionPricingPayload }) => updateAdminSubscriptionPricing(id, payload),
    onSuccess: async () => {
      toast.success("Subscription price updated");
      closePricingModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update subscription price")),
  });
  const deleteCleaningPriceMutation = useMutation({
    mutationFn: deleteAdminSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Subscription price deactivated");
      setDeleteCleaningPriceTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to deactivate subscription price")),
  });
  const createCookPriceMutation = useMutation({
    mutationFn: createAdminCookSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Cook subscription price created");
      closePricingModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to create cook subscription price")),
  });
  const updateCookPriceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminCookSubscriptionPricingPayload }) => updateAdminCookSubscriptionPricing(id, payload),
    onSuccess: async () => {
      toast.success("Cook subscription price updated");
      closePricingModal();
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to update cook subscription price")),
  });
  const deleteCookPriceMutation = useMutation({
    mutationFn: deleteAdminCookSubscriptionPricing,
    onSuccess: async () => {
      toast.success("Cook subscription price deactivated");
      setDeleteCookPriceTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-cook-subscription-pricing"] });
    },
    onError: (error) => toast.error(extractApiError(error, "Unable to deactivate cook subscription price")),
  });

  const cleaningRows = useMemo(
    () =>
      [...(cleaningQuery.data ?? [])]
        .filter((row) => row.active)
        .sort((first, second) => {
        if (first.sortOrder !== second.sortOrder) return first.sortOrder - second.sortOrder;
        return first.durationHours - second.durationHours;
      }),
    [cleaningQuery.data],
  );
  const cookRows = useMemo(
    () =>
      [...(cookQuery.data ?? [])]
        .filter((row) => row.active)
        .sort((first, second) => {
        if (first.sortOrder !== second.sortOrder) return first.sortOrder - second.sortOrder;
        return first.familySize.localeCompare(second.familySize);
      }),
    [cookQuery.data],
  );
  const cleaningPriceRows = useMemo(() => cleaningPricingQuery.data ?? [], [cleaningPricingQuery.data]);
  const cookPriceRows = useMemo(() => cookPricingQuery.data ?? [], [cookPricingQuery.data]);
  const cookServiceOptions = useMemo(() => {
    const rows = serviceOptionsQuery.data ?? [];
    return [...rows.filter(isCookFoodService)].sort((first, second) => first.name.localeCompare(second.name));
  }, [serviceOptionsQuery.data]);
  const cookServiceNameById = useMemo(
    () => new Map(cookServiceOptions.map((item) => [String(item.id), item.name])),
    [cookServiceOptions],
  );
  const selectedCookService = useMemo(
    () => cookServiceOptions.find((item) => String(item.id) === String(cookForm.serviceId)) ?? null,
    [cookForm.serviceId, cookServiceOptions],
  );
  const isBreakfastCoverageForm = isBreakfastService(selectedCookService);

  const closeModal = () => {
    setModalOpen(false);
    setEditingCleaning(null);
    setEditingCook(null);
    setCleaningForm(defaultCleaningForm);
    setCookForm(defaultCookForm);
  };

  const closePricingModal = () => {
    setPricingModalOpen(false);
    setEditingCleaningPrice(null);
    setEditingCookPrice(null);
    setCleaningPriceForm(defaultCleaningPriceForm);
    setCookPriceForm(defaultCookPriceForm);
  };

  const openCreate = () => {
    setEditingCleaning(null);
    setEditingCook(null);
    setCleaningForm(defaultCleaningForm);
    setCookForm(defaultCookForm);
    setModalOpen(true);
  };

  const openCreatePrice = () => {
    setEditingCleaningPrice(null);
    setEditingCookPrice(null);
    setCleaningPriceForm(defaultCleaningPriceForm);
    setCookPriceForm(defaultCookPriceForm);
    setPricingModalOpen(true);
  };

  const openEditCleaning = (row: AdminCleaningCoverage) => {
    setEditingCleaning(row);
    setCleaningForm(toCleaningForm(row));
    setModalOpen(true);
  };

  const openEditCook = (row: AdminCookCoverage) => {
    setEditingCook(row);
    setCookForm(toCookForm(row));
    setModalOpen(true);
  };

  const openEditCleaningPrice = (row: AdminSubscriptionPricing) => {
    setEditingCleaningPrice(row);
    setCleaningPriceForm(toCleaningPriceForm(row));
    setPricingModalOpen(true);
  };

  const openEditCookPrice = (row: AdminCookSubscriptionPricing) => {
    setEditingCookPrice(row);
    setCookPriceForm(toCookPriceForm(row));
    setPricingModalOpen(true);
  };

  const updateCleaningTask = (localId: string, patch: Partial<AdminCleaningCoverageTask>) => {
    setCleaningForm((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.localId === localId ? { ...task, ...patch } : task)),
    }));
  };

  const updateCookItem = (localId: string, patch: Partial<AdminCookCoverageItem>) => {
    setCookForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    }));
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "COOK") {
      const payload = toCookPayload(cookForm);
      const error = validateCookPayload(payload, { requireRoti: !isBreakfastCoverageForm });
      if (error) return toast.error(error);
      const duplicateError = validateCookCoverageDuplicate(payload, cookQuery.data ?? [], editingCook?.id);
      if (duplicateError) return toast.error(duplicateError);
      if (editingCook) updateCookMutation.mutate({ id: editingCook.id, payload });
      else createCookMutation.mutate(payload);
      return;
    }
    const payload = toCleaningPayload(cleaningForm);
    const error = validateCleaningPayload(payload);
    if (error) return toast.error(error);
    if (editingCleaning) updateCleaningMutation.mutate({ id: editingCleaning.id, payload });
    else createCleaningMutation.mutate(payload);
  };

  const submitPricingForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "COOK") {
      const payload = toCookPricePayload(cookPriceForm);
      const error = validateCookPricePayload(payload);
      if (error) return toast.error(error);
      if (editingCookPrice) updateCookPriceMutation.mutate({ id: editingCookPrice.id, payload });
      else createCookPriceMutation.mutate(payload);
      return;
    }
    const payload = toCleaningPricePayload(cleaningPriceForm);
    const error = validateCleaningPricePayload(payload);
    if (error) return toast.error(error);
    const monotonicityError = validateCleaningPriceMonotonicity(payload, {
      rows: cleaningPriceRows,
      editingId: editingCleaningPrice?.id,
    });
    if (monotonicityError) return toast.error(monotonicityError);
    if (editingCleaningPrice) updateCleaningPriceMutation.mutate({ id: editingCleaningPrice.id, payload });
    else createCleaningPriceMutation.mutate(payload);
  };

  const isCookMode = mode === "COOK";
  const isSaving = createCleaningMutation.isPending || updateCleaningMutation.isPending || createCookMutation.isPending || updateCookMutation.isPending;
  const isPricingSaving = createCleaningPriceMutation.isPending || updateCleaningPriceMutation.isPending || createCookPriceMutation.isPending || updateCookPriceMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Coverage</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage customer-facing coverage estimates for cleaning and cook subscriptions.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          + Add {isCookMode ? "Cook" : "Cleaning"} Coverage
        </button>
      </div>

      <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {(["CLEANING", "COOK"] as CoverageMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              closeModal();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mode === item ? "bg-blue-600 text-white" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {item === "CLEANING" ? "Cleaning Coverage" : "Cook Coverage"}
          </button>
        ))}
      </div>

      {isCookMode ? (
        <>
          <CookCoverageTable query={cookQuery} rows={cookRows} onEdit={openEditCook} onDeactivate={setDeactivateCookTarget} onDelete={setDeleteCookTarget} serviceNameById={cookServiceNameById} />
          <CookPricingTable query={cookPricingQuery} rows={cookPriceRows} onAdd={openCreatePrice} onEdit={openEditCookPrice} onDelete={setDeleteCookPriceTarget} />
        </>
      ) : (
        <>
          <CleaningCoverageTable query={cleaningQuery} rows={cleaningRows} onEdit={openEditCleaning} onDeactivate={setDeactivateCleaningTarget} onDelete={setDeleteCleaningTarget} />
          <CleaningPricingTable query={cleaningPricingQuery} rows={cleaningPriceRows} onAdd={openCreatePrice} onEdit={openEditCleaningPrice} onDelete={setDeleteCleaningPriceTarget} />
        </>
      )}

      <ModalFormLayout
        open={modalOpen}
        title={isCookMode ? (editingCook ? "Edit Cook Coverage" : "Create Cook Coverage") : editingCleaning ? "Edit Cleaning Coverage" : "Create Cleaning Coverage"}
        formId="coverage-form"
        submitLabel={editingCleaning || editingCook ? "Update" : "Create"}
        isSubmitting={isSaving}
        onClose={closeModal}
        maxWidthClassName="max-w-4xl"
      >
        <form id="coverage-form" onSubmit={submitForm} className="grid gap-4">
          {isCookMode ? (
            <CookCoverageForm
              form={cookForm}
              setForm={setCookForm}
              updateItem={updateCookItem}
              serviceOptions={cookServiceOptions}
              serviceOptionsLoading={serviceOptionsQuery.isLoading}
              isBreakfastServiceSelected={isBreakfastCoverageForm}
            />
          ) : (
            <CleaningCoverageForm form={cleaningForm} setForm={setCleaningForm} updateTask={updateCleaningTask} />
          )}
        </form>
      </ModalFormLayout>

      <ModalFormLayout
        open={pricingModalOpen}
        title={isCookMode ? (editingCookPrice ? "Edit Cook Price" : "Create Cook Price") : editingCleaningPrice ? "Edit Subscription Price" : "Create Subscription Price"}
        formId="coverage-pricing-form"
        submitLabel={editingCleaningPrice || editingCookPrice ? "Update" : "Create"}
        isSubmitting={isPricingSaving}
        onClose={closePricingModal}
        maxWidthClassName="max-w-xl"
      >
        <form id="coverage-pricing-form" onSubmit={submitPricingForm} className="grid gap-4">
          {isCookMode ? (
            <CookPricingForm form={cookPriceForm} setForm={setCookPriceForm} />
          ) : (
            <CleaningPricingForm form={cleaningPriceForm} setForm={setCleaningPriceForm} />
          )}
        </form>
      </ModalFormLayout>

      <ConfirmDialog
        open={Boolean(deactivateCleaningTarget)}
        title="Deactivate Cleaning Coverage"
        description={`This will mark ${deactivateCleaningTarget?.durationHours ?? ""} hr coverage inactive.`}
        confirmLabel="Deactivate"
        onClose={() => setDeactivateCleaningTarget(null)}
        onConfirm={() => {
          if (deactivateCleaningTarget) deactivateCleaningMutation.mutate({ id: deactivateCleaningTarget.id, payload: toCleaningPayload(toCleaningForm(deactivateCleaningTarget)) });
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteCleaningTarget)}
        title="Delete Cleaning Coverage"
        description={`This will permanently delete ${deleteCleaningTarget?.durationHours ?? ""} hr coverage.`}
        confirmLabel="Delete"
        onClose={() => setDeleteCleaningTarget(null)}
        onConfirm={() => {
          if (deleteCleaningTarget) deleteCleaningMutation.mutate(deleteCleaningTarget.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(deactivateCookTarget)}
        title="Deactivate Cook Coverage"
        description={`This will mark ${deactivateCookTarget?.familySizeLabel ?? ""} coverage inactive.`}
        confirmLabel="Deactivate"
        onClose={() => setDeactivateCookTarget(null)}
        onConfirm={() => {
          if (deactivateCookTarget) deactivateCookMutation.mutate({ id: deactivateCookTarget.id, payload: toCookPayload(toCookForm(deactivateCookTarget)) });
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteCookTarget)}
        title="Delete Cook Coverage"
        description={`This will permanently delete ${deleteCookTarget?.familySizeLabel ?? ""} coverage.`}
        confirmLabel="Delete"
        onClose={() => setDeleteCookTarget(null)}
        onConfirm={() => {
          if (deleteCookTarget) deleteCookMutation.mutate(deleteCookTarget.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteCleaningPriceTarget)}
        title="Deactivate Subscription Price"
        description={`Deactivate ${deleteCleaningPriceTarget?.durationHours ?? ""} hr price for ${
          deleteCleaningPriceTarget?.serviceId == null ? "global default" : `service #${deleteCleaningPriceTarget?.serviceId}`
        }?`}
        confirmLabel="Deactivate"
        onClose={() => setDeleteCleaningPriceTarget(null)}
        onConfirm={() => {
          if (deleteCleaningPriceTarget) deleteCleaningPriceMutation.mutate(deleteCleaningPriceTarget.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteCookPriceTarget)}
        title="Deactivate Cook Price"
        description={`Deactivate ${deleteCookPriceTarget?.familySizeLabel ?? ""} price for ${
          deleteCookPriceTarget?.serviceId == null ? "global default" : `service #${deleteCookPriceTarget?.serviceId}`
        }?`}
        confirmLabel="Deactivate"
        onClose={() => setDeleteCookPriceTarget(null)}
        onConfirm={() => {
          if (deleteCookPriceTarget) deleteCookPriceMutation.mutate(deleteCookPriceTarget.id);
        }}
      />
    </div>
  );
}

function CleaningCoverageTable({
  query,
  rows,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  query: ReturnType<typeof useQuery<AdminCleaningCoverage[]>>;
  rows: AdminCleaningCoverage[];
  onEdit: (row: AdminCleaningCoverage) => void;
  onDeactivate: (row: AdminCleaningCoverage) => void;
  onDelete: (row: AdminCleaningCoverage) => void;
}) {
  return (
    <DataState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={rows.length === 0}
      loadingText="Loading cleaning coverage..."
      errorText="Failed to load cleaning coverage"
      emptyText="No cleaning coverage found"
      onRetry={() => void query.refetch()}
    >
      <DataTable
        rows={rows}
        rowKey={(row) => String(row.id)}
        columns={[
          { key: "duration", header: "Duration", render: (row) => `${row.durationHours} hr` },
          { key: "reference", header: "Reference", render: (row) => row.reference },
          {
            key: "tasks",
            header: "Tasks",
            render: (row) => (
              <div className="flex max-w-xl flex-wrap gap-1">
                {[...row.tasks]
                  .sort((first, second) => Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0))
                  .slice(0, 6)
                  .map((task, index) => (
                    <span key={`${row.id}-${task.id ?? task.name}-${index}`} className="rounded-full bg-[var(--color-surface-hover)] px-2 py-1 text-xs text-[var(--color-text)]">
                      {task.name} ({task.estimatedMinutes} mins)
                    </span>
                  ))}
              </div>
            ),
          },
          { key: "sort", header: "Sort", render: (row) => row.sortOrder },
          { key: "active", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { key: "actions", header: "Actions", render: (row) => <ActionButtons onEdit={() => onEdit(row)} onDeactivate={() => onDeactivate(row)} onDelete={() => onDelete(row)} /> },
        ]}
      />
    </DataState>
  );
}

function CookCoverageTable({
  query,
  rows,
  onEdit,
  onDeactivate,
  onDelete,
  serviceNameById,
}: {
  query: ReturnType<typeof useQuery<AdminCookCoverage[]>>;
  rows: AdminCookCoverage[];
  onEdit: (row: AdminCookCoverage) => void;
  onDeactivate: (row: AdminCookCoverage) => void;
  onDelete: (row: AdminCookCoverage) => void;
  serviceNameById: Map<string, string>;
}) {
  return (
    <DataState
      isLoading={query.isLoading}
      isError={query.isError}
      isEmpty={rows.length === 0}
      loadingText="Loading cook coverage..."
      errorText="Failed to load cook coverage"
      emptyText="No cook coverage found"
      onRetry={() => void query.refetch()}
    >
      <DataTable
        rows={rows}
        rowKey={(row) => String(row.id)}
        columns={[
          {
            key: "scope",
            header: "Service",
            render: (row) => {
              if (row.serviceId == null) return "Global default";
              return serviceNameById.get(String(row.serviceId)) ?? `Service #${row.serviceId}`;
            },
          },
          { key: "family", header: "Family Size", render: (row) => `${row.familySizeLabel} (${row.familySize})` },
          { key: "reference", header: "Reference", render: (row) => row.reference || "-" },
          {
            key: "items",
            header: "Items",
            render: (row) => (
              <div className="flex max-w-xl flex-wrap gap-1">
                {[...row.items]
                  .sort((first, second) => Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0))
                  .slice(0, 8)
                  .map((item, index) => (
                    <span key={`${row.id}-${item.id ?? item.name}-${index}`} className="rounded-full bg-[var(--color-surface-hover)] px-2 py-1 text-xs text-[var(--color-text)]">
                      {item.quantity != null && item.quantity > 0 ? `${item.name} x${item.quantity}` : item.name}
                    </span>
                  ))}
              </div>
            ),
          },
          { key: "sort", header: "Sort", render: (row) => row.sortOrder },
          { key: "active", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { key: "actions", header: "Actions", render: (row) => <ActionButtons onEdit={() => onEdit(row)} onDeactivate={() => onDeactivate(row)} onDelete={() => onDelete(row)} /> },
        ]}
      />
    </DataState>
  );
}

function CleaningPricingTable({
  query,
  rows,
  onAdd,
  onEdit,
  onDelete,
}: {
  query: ReturnType<typeof useQuery<AdminSubscriptionPricing[]>>;
  rows: AdminSubscriptionPricing[];
  onAdd: () => void;
  onEdit: (row: AdminSubscriptionPricing) => void;
  onDelete: (row: AdminSubscriptionPricing) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <SectionHead title="Subscription Pricing" description="Manage duration prices used by cleaning subscription." onAdd={onAdd} addLabel="+ Add Price" />
      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading subscription pricing..."
        errorText="Failed to load subscription pricing"
        emptyText="No subscription pricing found"
        onRetry={() => void query.refetch()}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "scope", header: "Scope", render: (row) => (row.serviceId == null ? "Global default" : `Service #${row.serviceId}`) },
            { key: "duration", header: "Duration", render: (row) => `${row.durationHours} hr` },
            { key: "price", header: "Per Visit Price", render: (row) => `Rs. ${row.perVisitPrice}` },
            { key: "active", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
            { key: "actions", header: "Actions", render: (row) => <ActionButtons onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /> },
          ]}
        />
      </DataState>
    </section>
  );
}

function CookPricingTable({
  query,
  rows,
  onAdd,
  onEdit,
  onDelete,
}: {
  query: ReturnType<typeof useQuery<AdminCookSubscriptionPricing[]>>;
  rows: AdminCookSubscriptionPricing[];
  onAdd: () => void;
  onEdit: (row: AdminCookSubscriptionPricing) => void;
  onDelete: (row: AdminCookSubscriptionPricing) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <SectionHead title="Cook Subscription Pricing" description="Manage family-size prices used by cook subscription." onAdd={onAdd} addLabel="+ Add Cook Price" />
      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        isEmpty={rows.length === 0}
        loadingText="Loading cook subscription pricing..."
        errorText="Failed to load cook subscription pricing"
        emptyText="No cook subscription pricing found"
        onRetry={() => void query.refetch()}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { key: "scope", header: "Scope", render: (row) => (row.serviceId == null ? "Global default" : `Service #${row.serviceId}`) },
            { key: "familySize", header: "Family Size", render: (row) => `${row.familySizeLabel} (${row.familySize})` },
            { key: "price", header: "Per Visit Price", render: (row) => `Rs. ${row.pricePerVisit}` },
            { key: "active", header: "Status", render: (row) => <StatusBadge active={row.active} /> },
            { key: "actions", header: "Actions", render: (row) => <ActionButtons onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /> },
          ]}
        />
      </DataState>
    </section>
  );
}

function SectionHead({ title, description, onAdd, addLabel }: { title: string; description: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      <button type="button" onClick={onAdd} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)]">
        {addLabel}
      </button>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-600/30 text-gray-200"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ActionButtons({ onEdit, onDeactivate, onDelete }: { onEdit: () => void; onDeactivate?: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onEdit} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs">
        Edit
      </button>
      {onDeactivate ? (
        <button type="button" onClick={onDeactivate} className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300">
          Deactivate
        </button>
      ) : null}
      <button type="button" onClick={onDelete} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">
        Delete
      </button>
    </div>
  );
}

function CleaningCoverageForm({
  form,
  setForm,
  updateTask,
}: {
  form: CleaningFormState;
  setForm: React.Dispatch<React.SetStateAction<CleaningFormState>>;
  updateTask: (localId: string, patch: Partial<AdminCleaningCoverageTask>) => void;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <Input label="Duration Hours" type="number" value={form.durationHours} onChange={(value) => setForm((prev) => ({ ...prev, durationHours: value }))} />
        <Input label="Reference" value={form.reference} onChange={(value) => setForm((prev) => ({ ...prev, reference: value }))} />
        <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(value) => setForm((prev) => ({ ...prev, sortOrder: value }))} />
        <ActiveCheckbox checked={form.active} onChange={(active) => setForm((prev) => ({ ...prev, active }))} />
      </div>
      <ItemsPanel
        title="Tasks"
        description="These task estimates appear on customer app cards."
        onAdd={() => setForm((prev) => ({ ...prev, tasks: [...prev.tasks, { ...newTask(), sortOrder: prev.tasks.length + 1 }] }))}
      >
        {form.tasks.map((task, index) => (
          <div key={task.localId} className="grid gap-2 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-[1.6fr_1fr_1fr_0.8fr_auto]">
            <Input small label="Task Name" value={task.name} onChange={(value) => updateTask(task.localId, { name: value })} />
            <Select small label="Icon" value={task.icon} options={cleaningIconOptions} onChange={(value) => updateTask(task.localId, { icon: value })} />
            <Input small label="Estimated Minutes" type="number" value={String(task.estimatedMinutes)} onChange={(value) => updateTask(task.localId, { estimatedMinutes: Number(value) })} />
            <Input small label="Sort" type="number" value={String(task.sortOrder ?? index + 1)} onChange={(value) => updateTask(task.localId, { sortOrder: Number(value) })} />
            <RemoveButton disabled={form.tasks.length <= 1} onClick={() => setForm((prev) => ({ ...prev, tasks: prev.tasks.length > 1 ? prev.tasks.filter((item) => item.localId !== task.localId) : prev.tasks }))} />
          </div>
        ))}
      </ItemsPanel>
    </>
  );
}

function CookCoverageForm({
  form,
  setForm,
  updateItem,
  serviceOptions,
  serviceOptionsLoading,
  isBreakfastServiceSelected,
}: {
  form: CookFormState;
  setForm: React.Dispatch<React.SetStateAction<CookFormState>>;
  updateItem: (localId: string, patch: Partial<AdminCookCoverageItem>) => void;
  serviceOptions: CookServiceOption[];
  serviceOptionsLoading: boolean;
  isBreakfastServiceSelected: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1.8fr)_minmax(110px,0.9fr)_minmax(140px,1.1fr)_minmax(110px,0.8fr)_auto] xl:items-end">
        <label className="grid min-w-0 gap-1 text-sm text-[var(--color-text)]">
          <span>Service</span>
          <select
            value={form.serviceId}
            onChange={(event) =>
              setForm((prev) => {
                const nextServiceId = event.target.value;
                const nextService = serviceOptions.find((option) => String(option.id) === String(nextServiceId)) ?? null;
                const nextIsBreakfast = isBreakfastService(nextService);
                const nextReference =
                  prev.reference.trim().length === 0
                  || prev.reference === "Standard home cooking"
                  || prev.reference === "Standard breakfast coverage"
                    ? (nextIsBreakfast ? "Standard breakfast coverage" : "Standard home cooking")
                    : prev.reference;

                return {
                  ...prev,
                  serviceId: nextServiceId,
                  reference: nextReference,
                };
              })
            }
            className="w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            disabled={serviceOptionsLoading}
          >
            <option value="">{serviceOptionsLoading ? "Loading services..." : "Select service"}</option>
            {serviceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}{option.categoryName ? ` (${option.categoryName})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm text-[var(--color-text)]">
          <span>Family Size</span>
          <select
            value={form.familySize}
            onChange={(event) => {
              const option = familySizeOptions.find((item) => item.value === event.target.value);
              setForm((prev) => ({
                ...prev,
                familySize: event.target.value as CookFamilySize,
                members: option?.members ?? prev.members,
                familySizeLabel: option?.label ?? prev.familySizeLabel,
              }));
            }}
            className="w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            {familySizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} - {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input label="Members" value={form.members} onChange={(value) => setForm((prev) => ({ ...prev, members: value }))} />
        <Input label="Label" value={form.familySizeLabel} onChange={(value) => setForm((prev) => ({ ...prev, familySizeLabel: value }))} />
        <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(value) => setForm((prev) => ({ ...prev, sortOrder: value }))} />
        <ActiveCheckbox checked={form.active} onChange={(active) => setForm((prev) => ({ ...prev, active }))} />
      </div>
      <Input label="Reference" value={form.reference} onChange={(value) => setForm((prev) => ({ ...prev, reference: value }))} />
      <ItemsPanel
        title="Prepared Items"
        description={
          isBreakfastServiceSelected
            ? "These breakfast items are saved separately for each family size. Add quantity for every item."
            : "These items are saved separately for each family size. Add quantity for every item, and keep roti quantity mandatory."
        }
        onAdd={() => setForm((prev) => ({ ...prev, items: [...prev.items, { ...newCookItem(), sortOrder: prev.items.length + 1 }] }))}
      >
        {form.items.map((item, index) => (
          <div key={item.localId} className="grid gap-3 rounded-lg border border-[var(--color-border)] p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(110px,0.8fr)_auto] xl:items-end">
            <Input small label="Item Name" value={item.name} onChange={(value) => updateItem(item.localId, { name: value })} />
            <Select small label="Icon" value={item.icon} options={cookIconOptions} onChange={(value) => updateItem(item.localId, { icon: value })} />
            <Input
              small
              label={!isBreakfastServiceSelected && normalizeSearch(item.name).includes("roti") ? "Quantity (Required)" : "Quantity"}
              type="number"
              value={String(item.quantity ?? 1)}
              onChange={(value) => updateItem(item.localId, { quantity: Number(value) })}
            />
            <Input small label="Sort" type="number" value={String(item.sortOrder ?? index + 1)} onChange={(value) => updateItem(item.localId, { sortOrder: Number(value) })} />
            <RemoveButton disabled={form.items.length <= 1} onClick={() => setForm((prev) => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter((row) => row.localId !== item.localId) : prev.items }))} />
          </div>
        ))}
      </ItemsPanel>
    </>
  );
}

function CleaningPricingForm({
  form,
  setForm,
}: {
  form: CleaningPriceFormState;
  setForm: React.Dispatch<React.SetStateAction<CleaningPriceFormState>>;
}) {
  return (
    <>
      <Input label="Service ID" value={form.serviceId} onChange={(value) => setForm((prev) => ({ ...prev, serviceId: value.replace(/[^0-9]/g, "") }))} />
      <Input label="Duration Hours" type="number" value={form.durationHours} onChange={(value) => setForm((prev) => ({ ...prev, durationHours: value }))} />
      <Input label="Per Visit Price" type="number" value={form.perVisitPrice} onChange={(value) => setForm((prev) => ({ ...prev, perVisitPrice: value }))} />
      <p className="text-xs text-[var(--color-muted)]">Longer duration ka price shorter duration se zyada hona chahiye.</p>
      <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
        Active
      </label>
    </>
  );
}

function CookPricingForm({
  form,
  setForm,
}: {
  form: CookPriceFormState;
  setForm: React.Dispatch<React.SetStateAction<CookPriceFormState>>;
}) {
  return (
    <>
      <Input label="Service ID" value={form.serviceId} onChange={(value) => setForm((prev) => ({ ...prev, serviceId: value.replace(/[^0-9]/g, "") }))} />
      <label className="grid gap-1 text-sm text-[var(--color-text)]">
        <span>Family Size</span>
        <select
          value={form.familySize}
          onChange={(event) => setForm((prev) => ({ ...prev, familySize: event.target.value as CookFamilySize }))}
          className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          {familySizeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value} - {option.label}
            </option>
          ))}
        </select>
      </label>
      <Input label="Per Visit Price" type="number" value={form.pricePerVisit} onChange={(value) => setForm((prev) => ({ ...prev, pricePerVisit: value }))} />
      <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
        Active
      </label>
    </>
  );
}

function ItemsPanel({ title, description, onAdd, children }: { title: string; description: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          <p className="text-xs text-[var(--color-muted)]">{description}</p>
        </div>
        <button type="button" onClick={onAdd} className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs">
          + Add
        </button>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", small = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; small?: boolean }) {
  return (
    <label className={`grid min-w-0 gap-1 ${small ? "text-xs text-[var(--color-muted)]" : "text-sm text-[var(--color-text)]"}`}>
      <span>{label}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={label === "Duration Hours" ? "0.5" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full min-w-0 rounded border border-[var(--color-border)] bg-transparent px-3 py-2 ${small ? "text-sm text-[var(--color-text)]" : "text-sm"}`}
      />
    </label>
  );
}

function Select({ label, value, options, onChange, small = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; small?: boolean }) {
  return (
    <label className={`grid min-w-0 gap-1 ${small ? "text-xs text-[var(--color-muted)]" : "text-sm text-[var(--color-text)]"}`}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActiveCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="mt-2 inline-flex min-h-10 items-center gap-2 self-end text-sm text-[var(--color-text)] xl:mt-0">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Active
    </label>
  );
}

function RemoveButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 min-h-10 self-end rounded border border-red-500/40 px-3 py-2 text-xs text-red-300 disabled:opacity-40 xl:mt-0" disabled={disabled}>
      Remove
    </button>
  );
}

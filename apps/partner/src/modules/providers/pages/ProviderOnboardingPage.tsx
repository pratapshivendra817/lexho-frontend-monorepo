import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@lexho/ui";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ReactNode } from "react";

import { DocumentUploader } from "@/modules/documents/components/DocumentUploader";
import { ButtonLoader } from "@/modules/shared/components/ButtonLoader";

import { OnboardingProgress } from "../components/OnboardingProgress";
import {
  PROVIDER_ONBOARDING_DRAFT_KEY,
  useProviderDocumentUploadMutation,
  useProviderOnboardingMutation,
} from "../hooks/useProviderOnboarding";
import type {
  AvailabilityType,
  DocumentType,
  Gender,
  ProviderOnboardingPayload,
  ServiceCategory,
} from "../types/onboarding";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().min(1, "DOB is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  fullAddress: z.string().min(8, "Address is required"),
  category: z.enum(["COOK", "CLEANING"]),
  experience: z.string().min(1, "Experience is required"),
  availabilityType: z.enum(["FULL_TIME", "PART_TIME", "ON_DEMAND"]),
  serviceAreas: z.string().min(2, "Service areas are required"),
  workingDays: z.string().min(2, "Working days are required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  accountNumber: z.string().min(8, "Account number is required"),
  ifscCode: z.string().min(6, "IFSC code is required"),
});

type FormValues = z.infer<typeof schema>;

const requiredDocuments: DocumentType[] = [
  "AADHAAR_FRONT",
  "AADHAAR_BACK",
  "PAN",
  "PROFILE_PHOTO",
];

const steps = ["Personal", "Address", "Service", "Bank", "Documents"];

const defaultValues: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  gender: "MALE",
  dob: "",
  city: "",
  state: "",
  fullAddress: "",
  category: "COOK",
  experience: "",
  availabilityType: "FULL_TIME",
  serviceAreas: "",
  workingDays: "",
  startTime: "",
  endTime: "",
  accountNumber: "",
  ifscCode: "",
};

type DraftPayload = {
  currentStep: number;
  values: FormValues;
  providerId: string;
  uploaded: Partial<Record<DocumentType, string>>;
};

export function ProviderOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [providerId, setProviderId] = useState("");
  const [uploaded, setUploaded] = useState<Partial<Record<DocumentType, string>>>({});
  const [completed, setCompleted] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");

  const onboardingMutation = useProviderOnboardingMutation();
  const uploadMutation = useProviderDocumentUploadMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    const raw = localStorage.getItem(PROVIDER_ONBOARDING_DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DraftPayload;
      form.reset(parsed.values);
      setCurrentStep(parsed.currentStep);
      setProviderId(parsed.providerId ?? "");
      setUploaded(parsed.uploaded ?? {});
    } catch {
      localStorage.removeItem(PROVIDER_ONBOARDING_DRAFT_KEY);
    }
  }, [form]);

  const persistDraft = () => {
    const payload: DraftPayload = {
      currentStep,
      values: form.getValues(),
      providerId,
      uploaded,
    };
    localStorage.setItem(PROVIDER_ONBOARDING_DRAFT_KEY, JSON.stringify(payload));
    setMessage("Draft saved");
  };

  const nextStep = async () => {
    const stepFields: Array<Array<keyof FormValues>> = [
      ["fullName", "email", "phone", "gender", "dob"],
      ["city", "state", "fullAddress"],
      ["category", "experience", "availabilityType", "serviceAreas", "workingDays", "startTime", "endTime"],
      ["accountNumber", "ifscCode"],
      [],
    ];

    const fields = stepFields[currentStep];
    const valid = await form.trigger(fields);
    if (!valid) {
      setMessage("Please fix validation errors");
      return;
    }

    if (currentStep === 3 && !providerId) {
      const values = form.getValues();
      const payload: ProviderOnboardingPayload = {
        ...values,
        serviceAreas: values.serviceAreas.split(",").map((item) => item.trim()).filter(Boolean),
        workingDays: values.workingDays.split(",").map((item) => item.trim()).filter(Boolean),
      };
      onboardingMutation.mutate(payload, {
        onSuccess: (response) => {
          setProviderId(response.providerId);
          setCurrentStep(4);
          setMessage("Onboarding submitted. Upload documents now.");
        },
        onError: (error) => {
          const reason = error instanceof Error ? error.message : "Unable to submit onboarding form";
          setMessage(reason);
        },
      });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const uploadedRequiredCount = requiredDocuments.filter((docType) => Boolean(uploaded[docType])).length;
  const canFinish = uploadedRequiredCount === requiredDocuments.length;

  if (completed) {
    return (
      <section className="panel light-panel stack">
        <h2>Onboarding Submitted Successfully</h2>
        <p className="item-subtitle">
          Provider ID: <strong>{providerId}</strong>
        </p>
        <p className="item-subtitle">All required documents uploaded. Admin review is pending.</p>
      </section>
    );
  }

  return (
    <section className="panel light-panel stack">
      <div className="panel-header">
        <div>
          <h2>Provider Onboarding</h2>
          <p className="item-subtitle">Complete all 5 steps to start partner onboarding.</p>
        </div>
        <div className="inline-actions">
          <ButtonLoader label="Save Draft" loading={false} onClick={persistDraft} />
        </div>
      </div>

      <OnboardingProgress currentStep={currentStep} steps={steps} />

      {currentStep === 0 ? (
        <StepPersonal form={form} />
      ) : null}
      {currentStep === 1 ? (
        <StepAddress form={form} />
      ) : null}
      {currentStep === 2 ? (
        <StepService form={form} />
      ) : null}
      {currentStep === 3 ? (
        <StepBank form={form} />
      ) : null}
      {currentStep === 4 ? (
        <StepDocuments
          providerId={providerId}
          uploaded={uploaded}
          onUpload={async (documentType, file, onProgress) => {
            const result = await uploadMutation.mutateAsync({ providerId, documentType, file, onProgress });
            setUploaded((previous) => ({ ...previous, [documentType]: result.url ?? "uploaded" }));
          }}
        />
      ) : null}

      {message ? <p className="item-subtitle">{message}</p> : null}

      <div className="inline-actions">
        <ButtonLoader
          label="Back"
          loading={false}
          disabled={currentStep === 0 || onboardingMutation.isPending}
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
        />

        {currentStep < 4 ? (
          <ButtonLoader
            label={currentStep === 3 ? "Submit & Continue" : "Next"}
            loading={onboardingMutation.isPending}
            onClick={() => {
              void nextStep();
            }}
          />
        ) : (
          <ButtonLoader
            label={`Finish (${uploadedRequiredCount}/${requiredDocuments.length} required)`}
            loading={uploadMutation.isPending}
            disabled={!canFinish}
            onClick={() => setFinishConfirmOpen(true)}
          />
        )}
      </div>

      <ConfirmDialog
        open={finishConfirmOpen}
        title="Complete Onboarding"
        description="All required documents are uploaded. Do you want to submit and complete onboarding now?"
        confirmLabel="Complete"
        onCancel={() => setFinishConfirmOpen(false)}
        onConfirm={() => {
          localStorage.removeItem(PROVIDER_ONBOARDING_DRAFT_KEY);
          setFinishConfirmOpen(false);
          setCompleted(true);
        }}
      />
    </section>
  );
}

function StepPersonal({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <div className="profile-grid">
      <Field label="Full Name" input={<input className="text-input" {...form.register("fullName")} />} error={form.formState.errors.fullName?.message} />
      <Field label="Email" input={<input className="text-input" {...form.register("email")} />} error={form.formState.errors.email?.message} />
      <Field label="Phone" input={<input className="text-input" {...form.register("phone")} />} error={form.formState.errors.phone?.message} />
      <Field
        label="Gender"
        input={
          <select className="text-input" {...form.register("gender")}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        }
        error={form.formState.errors.gender?.message}
      />
      <Field label="DOB" input={<input type="date" className="text-input" {...form.register("dob")} />} error={form.formState.errors.dob?.message} />
    </div>
  );
}

function StepAddress({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <div className="profile-grid">
      <Field label="City" input={<input className="text-input" {...form.register("city")} />} error={form.formState.errors.city?.message} />
      <Field label="State" input={<input className="text-input" {...form.register("state")} />} error={form.formState.errors.state?.message} />
      <Field
        label="Full Address"
        input={<textarea className="text-input" rows={3} {...form.register("fullAddress")} />}
        error={form.formState.errors.fullAddress?.message}
      />
    </div>
  );
}

function StepService({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <div className="profile-grid">
      <Field
        label="Category"
        input={
          <select className="text-input" {...form.register("category")}>
            <option value="COOK">Cook</option>
            <option value="CLEANING">Cleaning</option>
          </select>
        }
        error={form.formState.errors.category?.message}
      />
      <Field label="Experience (years)" input={<input className="text-input" {...form.register("experience")} />} error={form.formState.errors.experience?.message} />
      <Field
        label="Availability Type"
        input={
          <select className="text-input" {...form.register("availabilityType")}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="ON_DEMAND">On Demand</option>
          </select>
        }
        error={form.formState.errors.availabilityType?.message}
      />
      <Field
        label="Service Areas (comma separated)"
        input={<input className="text-input" {...form.register("serviceAreas")} />}
        error={form.formState.errors.serviceAreas?.message}
      />
      <Field
        label="Working Days (comma separated)"
        input={<input className="text-input" {...form.register("workingDays")} />}
        error={form.formState.errors.workingDays?.message}
      />
      <Field label="Start Time" input={<input type="time" className="text-input" {...form.register("startTime")} />} error={form.formState.errors.startTime?.message} />
      <Field label="End Time" input={<input type="time" className="text-input" {...form.register("endTime")} />} error={form.formState.errors.endTime?.message} />
    </div>
  );
}

function StepBank({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <div className="profile-grid">
      <Field
        label="Account Number"
        input={<input className="text-input" {...form.register("accountNumber")} />}
        error={form.formState.errors.accountNumber?.message}
      />
      <Field label="IFSC Code" input={<input className="text-input" {...form.register("ifscCode")} />} error={form.formState.errors.ifscCode?.message} />
    </div>
  );
}

function StepDocuments({
  providerId,
  uploaded,
  onUpload,
}: {
  providerId: string;
  uploaded: Partial<Record<DocumentType, string>>;
  onUpload: (documentType: DocumentType, file: File, onProgress: (progress: number) => void) => Promise<void>;
}) {
  return (
    <div className="profile-grid">
      <DocumentUploader label="Aadhaar Front" required providerId={providerId} documentType="AADHAAR_FRONT" uploadedUrl={uploaded.AADHAAR_FRONT} onUpload={onUpload} />
      <DocumentUploader label="Aadhaar Back" required providerId={providerId} documentType="AADHAAR_BACK" uploadedUrl={uploaded.AADHAAR_BACK} onUpload={onUpload} />
      <DocumentUploader label="PAN" required providerId={providerId} documentType="PAN" uploadedUrl={uploaded.PAN} onUpload={onUpload} />
      <DocumentUploader label="Profile Photo" required providerId={providerId} documentType="PROFILE_PHOTO" uploadedUrl={uploaded.PROFILE_PHOTO} onUpload={onUpload} />
      <DocumentUploader label="Certificate" providerId={providerId} documentType="CERTIFICATE" uploadedUrl={uploaded.CERTIFICATE} onUpload={onUpload} />
    </div>
  );
}

function Field({ label, input, error }: { label: string; input: ReactNode; error?: string }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="mt-2">{input}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

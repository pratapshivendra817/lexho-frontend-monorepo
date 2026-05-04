import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { UserForm } from "../components";
import { useUserMutations } from "../hooks/useUsers";
import type { UserFormValues } from "../schema";

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { createUserMutation } = useUserMutations();

  const handleSubmit = (values: UserFormValues) => {
    createUserMutation.mutate(values, {
      onSuccess: () => {
        toast.success("User created");
        navigate("/users", { replace: true });
      },
      onError: (error) => {
        toast.error(extractApiError(error, "Unable to create user"));
      },
    });
  };

  return (
    <ModalFormLayout
      open
      title="Create User"
      formId="create-user-form"
      submitLabel="Create User"
      isSubmitting={createUserMutation.isPending}
      onClose={() => navigate("/users", { replace: true })}
      maxWidthClassName="max-w-3xl"
    >
      <UserForm
        formId="create-user-form"
        submitLabel="Create User"
        isSubmitting={createUserMutation.isPending}
        hideSubmitButton
        onSubmit={handleSubmit}
      />
    </ModalFormLayout>
  );
}

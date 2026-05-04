import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { DataState, ModalFormLayout } from "@/components/admin";
import { extractApiError } from "@/utils/apiError";

import { UserForm } from "../components";
import { useUserDetailsQuery, useUserMutations } from "../hooks/useUsers";
import type { UserFormValues } from "../schema";

export default function EditUserPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userQuery = useUserDetailsQuery(id);
  const { updateUserMutation } = useUserMutations();

  const initialValues = userQuery.data
    ? {
        name: userQuery.data.name,
        email: userQuery.data.email,
        phone: userQuery.data.phone,
        role: userQuery.data.role,
        city: userQuery.data.city,
        status: userQuery.data.status === "DELETED" ? "INACTIVE" : userQuery.data.status,
      }
    : undefined;

  const handleSubmit = (values: UserFormValues) => {
    if (!id) {
      return;
    }

    updateUserMutation.mutate(
      { id, payload: values },
      {
        onSuccess: () => {
          toast.success("User updated");
          navigate(`/users/${id}`, { replace: true });
        },
        onError: (error) => {
          toast.error(extractApiError(error, "Unable to update user"));
        },
      },
    );
  };

  return (
    <ModalFormLayout
      open
      title="Edit User"
      formId="edit-user-form"
      submitLabel="Save Changes"
      isSubmitting={updateUserMutation.isPending}
      onClose={() => navigate(id ? `/users/${id}` : "/users", { replace: true })}
      maxWidthClassName="max-w-3xl"
    >
      <DataState
        isLoading={userQuery.isLoading}
        isError={userQuery.isError}
        isEmpty={!userQuery.data}
        loadingText="Loading user details..."
        errorText="Failed to load user details"
        emptyText="User not found"
        onRetry={() => {
          void userQuery.refetch();
        }}
      >
        <UserForm
          formId="edit-user-form"
          initialValues={initialValues}
          submitLabel="Save Changes"
          isSubmitting={updateUserMutation.isPending}
          hideSubmitButton
          onSubmit={handleSubmit}
        />
      </DataState>
    </ModalFormLayout>
  );
}

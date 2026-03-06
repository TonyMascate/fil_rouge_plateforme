import { ApiErrorResponse } from "@repo/shared";
import { useMutation } from "@tanstack/react-query";
import { UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ERROR_MESSAGES } from "./error-messages";
import { handleApiFormErrors } from "./form-errors";

interface useFormMutationOptions<TData, TVariables, TFormValues extends Record<string, any>> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  setError?: UseFormSetError<TFormValues>;
  onSuccess?: (data: TData) => void;
  successMessage?: string;
}

export const useFormMutation = <TData, TVariables, TFormValues extends Record<string, any>>({ mutationFn, setError, onSuccess, successMessage }: useFormMutationOptions<TData, TVariables, TFormValues>) => {
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: any) => {
      const apiError = error?.response?.data as ApiErrorResponse;

      if (apiError) {
        let hasFieldErrors = false;
        if (setError) {
          hasFieldErrors = handleApiFormErrors(apiError, setError);
        }
        if (!hasFieldErrors) {
          toast.error(ERROR_MESSAGES[apiError.code] ?? "Une erreur est survenue.");
        }
      } else {
        toast.error("Impossible de joindre le serveur.");
      }
    },
  });
};

import { ApiErrorResponse } from "@repo/shared";
import { UseFormSetError } from "react-hook-form";

export const handleApiFormErrors = <T extends Record<string, any>>(apiError: ApiErrorResponse, setError: UseFormSetError<T>): boolean => {
  if (apiError.details && apiError.details.length > 0) {
    apiError.details.forEach((err) => {
      setError(err.field as any, {
        type: "server",
        message: err.message,
      });
    });
    return true;
  }
  return false;
};

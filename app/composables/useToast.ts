import { useToast as useToastification } from "vue-toastification";

/**
 * Toast notification wrapper
 */
export function useToast() {
  const toast = useToastification();

  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    warning: (message: string) => toast.warning(message),
    loading: (message: string) => toast.info(message), // vue-toastification doesn't have loading, use info
    promise: toast,
  };
}

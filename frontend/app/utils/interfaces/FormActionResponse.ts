import type {Status} from "~/utils/interfaces/Status";

/**
 * FormActionResponse
 *
 * Represents the possible return types from form actions:
 * - Validation errors with form values for re-display
 * - Success/failure response with status information
 */
export type FormActionResponse =
    | { errors: Record<string, any>; defaultValues: unknown}
    | { success: boolean; status: Status };
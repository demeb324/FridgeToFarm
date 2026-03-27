
import type {FormActionResponse} from "~/utils/interfaces/FormActionResponse";




/**
 * StatusMessage Component
 *
 * Displays a styled status message based on action data from form submissions.
 * Shows green styling for success messages and red styling for error messages.
 *
 * @param actionData - Object containing success status and optional message
 * @param actionData.success - Boolean indicating if the action was successful
 * @param actionData.status.message - Optional message to display
 *
 * @returns A styled message box or empty fragment if no valid action data
 */

type StatusMessageProps = { actionData: FormActionResponse | undefined }
export function StatusMessage( props : StatusMessageProps) {
    const {actionData} = props
    // Return early if actionData is invalid or missing success property
    if (!actionData || !('success' in actionData)) {
        return <></>
    }

    // Extract message from actionData or use default error message
    const message = actionData.status?.message ?? 'an unexplained error occurred';

    // Determine styling based on success status
    const isSuccess = actionData.success;
    const bgColor = isSuccess ? 'bg-green-50' : 'bg-red-50';
    const borderColor = isSuccess ? 'border-green-200' : 'border-red-200';
    const textColor = isSuccess ? 'text-green-700' : 'text-red-700';

    return (
        <div className={`mt-4 p-4 ${bgColor} border ${borderColor} rounded-lg flex items-start gap-3`}>
            <div className="flex-1">
                {message && (
                    <p className={`mt-1 text-sm ${textColor}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}
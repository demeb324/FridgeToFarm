import type {FieldErrors} from "react-hook-form";


type Props = {
    error: FieldErrors,  field: string
}
export function FieldError(props: Props ) {

    const {error, field} = props
    if ( error[field]?.message) {
        return(<>
            <p className="mt-1 text-sm text-red-500">{error[field].message as string}</p>
        </>)
    }
    return <></>
}
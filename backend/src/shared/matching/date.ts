import { FilterValue } from "./value";

export class FilterDate {
    // Contains all the options that this type supports
    public static readonly operation = FilterValue.operation;

    /**
     *                  Checks if value matches the set rule
     * @param operation Operation to execute on the value
     * @param filter    Filter to check the for in the value
     * @param value     Value to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterDate.operation,
                          filter: string,
                          value: string): boolean{
        return FilterValue.matches(operation, new Date(filter).getTime(), new Date(value).getTime());
    }
}

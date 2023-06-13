import { FilterValue } from "./value";

export class FilterDate {
    // Contains all the options that this type supports
    public static readonly operation = FilterValue.operation;

    /**
     *                  Checks if input matches the set rule
     * @param operation Operation to execute on the input
     * @param filter    Filter to check the for in the input
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterDate.operation,
                          filter: string | [string, string],
                          input: string): boolean{
        if (typeof filter === "string")
            return FilterValue.matches(operation, new Date(filter).getTime(), new Date(input).getTime());
        else
            return FilterValue.matches(operation, [new Date(filter[0]).getTime(), new Date(filter[1]).getTime()], new Date(input).getTime());
    }
}

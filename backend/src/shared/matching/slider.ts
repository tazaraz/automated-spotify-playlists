import { FilterValue } from "./value";

export class FilterSlider {
    // Contains all the options that this type supports
    public static readonly operation = FilterValue.operation;
    public static min = 0;
    public static max = 100;

    /**
     *                  Checks if value matches the set rule
     * @param operation Operation to execute on the value
     * @param filter    Filter specified by the user
     * @param value     Value to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterSlider.operation,
                          filter: number,
                          value: number): boolean {
        // Enforce the maximum size of 100
        if (value < FilterSlider.min || value > FilterSlider.max)
            return false;

        return FilterValue.matches(operation, filter, value);
    }
}

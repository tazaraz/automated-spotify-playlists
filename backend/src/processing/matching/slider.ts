import { FilterValue } from "./value";

export class FilterSlider {
    // Contains all the options that this type supports
    public static readonly operation = FilterValue.operation;
    public static min = 0;
    public static max = 100;

    /**
     *                  Checks if input matches the set rule
     * @param operation Operation to execute on the input
     * @param filter    Filter to check the for in the input
     * @param input     Input to check
     * @returns         Whether the rule is matched
     */
    public static matches(operation: keyof typeof FilterSlider.operation,
                          filter: number,
                          input: number): boolean {
        // Enforce the maximum size of 100
        if (input < FilterSlider.min || input > FilterSlider.max)
            return false;

        return FilterValue.matches(operation, filter, input);
    }
}

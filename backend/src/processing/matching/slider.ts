
const FilterSliderOptions = {
    "is": "The result must be equal to the value specified",
    "is not": "The result must not be equal to the value specified",
    "is at least": "The search must be equal or larger than the value specified",
    "is at most": "The search must be equal or smaller than the value specified",
}

export class FilterSlider {
    // Contains all the options that this type supports
    public static readonly operation = FilterSliderOptions;
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

        switch (operation) {
            case "is":
                return filter == input;

            case "is not":
                return filter != input;

            case "is at least":
                return input >= filter;

            case "is at most":
                return input <= filter;

            default:
                throw Error(`Illegal Condition operation "${operation}"`);
        }
    }
}

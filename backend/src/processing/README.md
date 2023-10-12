# Filtering
This folder contains all function to apply a filter.

## Index or Filter
<!-- The `index.ts` file contains the `process` function, which is the main function to apply filters. It takes playlistfilter and an input and returns the input which did not. -->

## Types
Types are executors for specified filters. These functions cast the current metadata structure, a `FilterItem`, to the required type for the parser, such that all required metadata is available.

## Parsers
Parsers are functions that take an operation, such as `is`, `at least` or `in the range of`, and a filter (what it should match) and an input (what it should match against) and returns a boolean value depending on whether the input matches the filter.

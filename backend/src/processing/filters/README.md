# Filter Types
This folder contains all function to apply a filter.
Although the filter logic itself is very simple (if energy < 0.8 then it should return false) and easily implemented, the way asynchronously executing these filters and getting the items required for the filter logic is not. This is due to the fact that upon a filter request, we can receive multiple items of a mixed nature called `FilterItem`.

## FilterItem
[FilterItem](../../definitions/server.ts) (thus far and I don't see this expanding anytime soon) consists of 3 items: `STrack`, `SAlbum` and `SArtist`, with the addition of a `kind` field, used to indicate what type it is. When applying a filter as described above, one needs to get the correct kind in order to process it.

## filter_async
This function allows you to parse the given input all at once using a callback. The function itself will make sure every item is processed in parallel.

## get_by_kind
This function allows you to, for every kind `FilterItem` may take on, specify a function to get the items you require.
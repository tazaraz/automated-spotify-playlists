
# Custom overridable bootstrap breakpoint
This project, when editing a playlist, injects a new element into the view. This however breaks the layout of the page. To fix this, we need to override the bootstrap breakpoint at load and resize. In the default layout a watcher is present that will remove breakpoints. These classes function the same as the bootstrap ones, but are only applied when:
- the editor is present
- the screen is larger than the breakpoint md

These classes are specified within a `data-edit-class` custom HTML attribute. For example, `<span edit-class="flex-xl-row">...</span>` will translate to
- when the editor is not present: `<span data-edit-class="flex-xl-row" class="flex-xl-row">...</span>`
- when the editor is present: `<span data-edit-class="flex-xl-row" class="flex-lg-row">...</span>`
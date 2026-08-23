# Fix persistent Agent Console navigation

## Changes
- Update the Agent Console page so sidebar module selections navigate to their actual route instead of only changing the highlighted sidebar state.
- Route regular workspace modules to the main workspace with the selected module preserved; route admin/platform entries to their dedicated pages.
- Keep the Agent Console only on `/agents`.

## Verification
- Check Agent Console → Sales, Finance, HR, Dashboard, and Platform Console navigation.
- Confirm each destination renders its own content and the current build remains error-free.

## Technical details
- Replace the local `setActiveModule` callback in the Agents page with a route-aware module-change handler using React Router navigation state.

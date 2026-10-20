# StyleAI: no-cost preview and Android path

## User outcome
- Keep the existing realistic AI try-on intact, while adding a clearly labeled Basic Preview that performs no AI/API generation and allows five attempts per user per day on that device.
- Make the original photo and generated result clearly visible together, with a before/after comparison that works when both images load.
- Prepare the app for a native Android package intended for Google Play, without claiming that setup itself publishes the app.

## Work
1. Add a client-only Basic Preview for uploaded user and product photos. Track five daily uses per signed-in account in local browser storage; clearly disclose that the count is device-local and can be reset, so it is not abuse-proof across devices. Do not call image generation or product-search services from this path.
2. Improve the result presentation so the Before and After photos remain visible side by side as well as in the comparison control; add safe image-load fallbacks where needed.
3. Add Capacitor Android/iOS project configuration using the existing app and prescribed app identity. Do not claim a Play Store release; signing, native build tools, and store-account/review steps remain outside the preview.
4. Keep payments separate: the current workspace plan is Free, so Paddle cannot be enabled yet. Do not add a pretend checkout or payment code. Once the workspace is upgraded and Paddle is enabled, obtain product prices before building the monthly/yearly pricing and checkout flow, then verify it in test mode.
5. Add a focused test for the concrete five-per-day device-local limit and run it; verify the app build and the requested preview flow.

## Technical details
- Preserve the existing AI try-on path unchanged; Basic Preview uses only local image previews and browser storage.
- Native app identity/configuration: app ID `app.lovable.b602538948654bebb8a82a3e146103a8`, app name `style-ai-soulmate`; retain the supplied sandbox live-reload URL in Capacitor config.
- Do not deploy or publish without a separate explicit request.

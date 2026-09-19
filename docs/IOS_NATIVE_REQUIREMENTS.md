# IOS_NATIVE_REQUIREMENTS

iPhone-first. Each item lists what the web build does today and what the native package
must provide later.

| Capability | Today | Native requirement |
| --- | --- | --- |
| Sign in with Apple | OAuth through the auth provider | Native ASAuthorization, Apple review requirement when other social logins exist |
| Face ID / Touch ID | App lock preference only | LocalAuthentication, only prompted when the person enables app lock |
| Camera | File input | Just-in-time permission on "Tirar foto", never at launch |
| Photo picker | File input | PHPicker, no full library permission |
| File picker | File input | UIDocumentPicker |
| Push notifications | In-app notification center | Permission requested only after the value is explained |
| Haptics | Web vibration where available | UIFeedbackGenerator on confirm, success and error |
| Deep links | Route URLs | Universal links to plan, activity and agent threads |
| Privacy screen | Not applicable | Blur balances in the app switcher |
| App lifecycle | Web hydration | Restore last route, refresh snapshot on foreground |
| Keyboard | Safe-area aware sheets, autofocus amount fields | Keyboard avoidance and decimal pad |
| Safe areas | `env(safe-area-inset-*)` throughout | Respect notch and home indicator |
| Accessibility | Semantic labels, contrast, reduced motion | Dynamic Type and VoiceOver pass on every screen |
| Dark mode | Intentionally adapted, never inverted | Match system appearance setting |

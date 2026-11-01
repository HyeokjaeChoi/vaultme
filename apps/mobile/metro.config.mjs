// Sentry's Metro config (https://docs.sentry.io/platforms/react-native/guides/expo/manual-setup/metro): it adds debug ids for source maps.
// includeWebReplay and includeWebFeedback are web-only Sentry packages; false resolves them to an empty module (smaller Hermes bundle, see export:check).
import { getSentryExpoConfig } from '@sentry/react-native/metro.js'

export default getSentryExpoConfig(import.meta.dirname, { includeWebReplay: false, includeWebFeedback: false })

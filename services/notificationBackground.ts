import notifee from '@notifee/react-native';

import { handleNotificationEvent } from './notificationEvents';

/**
 * Registered from the app entry (index.js) BEFORE expo-router loads, so
 * notifee can deliver events to a headless JS context when the app is killed.
 * Keep this module lean: no firebase, no redux, no react.
 */
notifee.onBackgroundEvent(handleNotificationEvent);

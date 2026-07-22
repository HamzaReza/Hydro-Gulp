// Background notification events must register before anything else so
// notifee can invoke JS with the app killed. Keep this import first.
import './services/notificationBackground';

import 'expo-router/entry';

import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import hydrationReducer from './slices/hydrationSlice';
import settingsReducer from './slices/settingsSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import profileReducer from './slices/profileSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  hydration: hydrationReducer,
  settings: settingsReducer,
  subscription: subscriptionReducer,
  profile: profileReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'hydration', 'settings', 'subscription', 'profile'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import aiReducer from "./slices/aiSlice";
import authReducer from "./slices/authSlice";
import hydrationReducer from "./slices/hydrationSlice";
import profileReducer from "./slices/profileSlice";
import settingsReducer from "./slices/settingsSlice";
import subscriptionReducer from "./slices/subscriptionSlice";

// Transient UI state (loading, error) must not survive a rehydration —
// a persisted loading:true would leave the subscribe button stuck as a spinner forever.
const subscriptionPersistConfig = {
  key: "subscription",
  storage: AsyncStorage,
  blacklist: ["loading", "error"],
};

const rootReducer = combineReducers({
  auth: authReducer,
  hydration: hydrationReducer,
  settings: settingsReducer,
  subscription: persistReducer(subscriptionPersistConfig, subscriptionReducer),
  profile: profileReducer,
  ai: aiReducer,
});

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth", "hydration", "settings", "subscription", "profile", "ai"],
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

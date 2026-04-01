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
import authReducer from "./slices/authSlice";
import hydrationReducer from "./slices/hydrationSlice";
import profileReducer from "./slices/profileSlice";
import settingsReducer from "./slices/settingsSlice";
import subscriptionReducer from "./slices/subscriptionSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  hydration: hydrationReducer,
  settings: settingsReducer,
  subscription: subscriptionReducer,
  profile: profileReducer,
});

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth", "hydration", "settings", "subscription", "profile"],
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

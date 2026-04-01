import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { deleteUser, GoogleAuthProvider, reauthenticateWithCredential, signInWithCredential, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";

interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasSeenOnboarding: boolean;
}

const initialState: AuthState = {
  uid: null,
  email: null,
  displayName: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  hasSeenOnboarding: false,
};

const DEFAULT_USER_DOC = {
  goal: 2000,
  unit: "ml",
  wakeTime: "07:00",
  sleepTime: "23:00",
  isPremium: false,
  premiumPlan: null,
  premiumExpiry: null,
  avatarColor: "#7AAACE",
};

export const googleSignInThunk = createAsyncThunk(
  "auth/googleSignIn",
  async (_, { rejectWithValue }) => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return rejectWithValue("Google sign-in was cancelled.");
      }

      const tokens = await GoogleSignin.getTokens();
      const googleCredential = GoogleAuthProvider.credential(tokens.idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;

      // Create Firestore doc on first Google sign-in
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          ...DEFAULT_USER_DOC,
          name: user.displayName || "",
          email: user.email || "",
          createdAt: serverTimestamp(),
        });
      }

      return {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Google sign-in failed. Please try again.",
      );
    }
  },
);

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
    } catch (error: any) {
      return rejectWithValue("Failed to sign out. Please try again.");
    }
  },
);

export const deleteAccountThunk = createAsyncThunk(
  "auth/deleteAccount",
  async (uid: string, { rejectWithValue }) => {
    try {
      if (!auth.currentUser) {
        return rejectWithValue("No authenticated user found.");
      }

      // Firebase requires a recent sign-in before deleting an account.
      // Re-authenticate with Google to guarantee the credential is fresh.
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) {
          return rejectWithValue("Re-authentication was cancelled.");
        }
        const tokens = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (reauthError: any) {
        // User cancelled the Google sign-in sheet — abort deletion
        if (
          reauthError?.code === "SIGN_IN_CANCELLED" ||
          reauthError?.message === "SIGN_IN_CANCELLED"
        ) {
          return rejectWithValue("Re-authentication was cancelled.");
        }
        // Any other re-auth failure should stop the flow
        return rejectWithValue(
          "Re-authentication failed. Please try again.",
        );
      }

      // Delete all Firestore data for the user
      const logsRef = collection(db, "users", uid, "logs");
      const logsDocs = await getDocs(logsRef);
      await Promise.all(logsDocs.docs.map((d) => deleteDoc(d.ref)));

      const remindersRef = collection(db, "users", uid, "reminders");
      const remindersDocs = await getDocs(remindersRef);
      await Promise.all(remindersDocs.docs.map((d) => deleteDoc(d.ref)));

      await deleteDoc(doc(db, "users", uid));

      // Sign out from Google before deleting the Firebase Auth account
      try {
        await GoogleSignin.signOut();
      } catch {
        // Not signed in to Google — safe to continue
      }

      await deleteUser(auth.currentUser);
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        return rejectWithValue(
          "For security, please sign out and sign back in before deleting your account.",
        );
      }
      return rejectWithValue("Failed to delete account. Please try again.");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        uid: string;
        email: string;
        displayName: string | null;
      }>,
    ) => {
      state.uid = action.payload.uid;
      state.email = action.payload.email;
      state.displayName = action.payload.displayName;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    clearUser: (state) => {
      state.uid = null;
      state.email = null;
      state.displayName = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    setHasSeenOnboarding: (state, action: PayloadAction<boolean>) => {
      state.hasSeenOnboarding = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(googleSignInThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleSignInThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(googleSignInThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(logoutThunk.fulfilled, (state) => {
        state.uid = null;
        state.email = null;
        state.displayName = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccountThunk.fulfilled, (state) => {
        state.uid = null;
        state.email = null;
        state.displayName = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccountThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setUser,
  clearUser,
  setHasSeenOnboarding,
  clearError,
} = authSlice.actions;
export default authSlice.reducer;

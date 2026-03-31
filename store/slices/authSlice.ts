import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasSeenOnboarding: boolean;
  resetEmailSent: boolean;
}

const initialState: AuthState = {
  uid: null,
  email: null,
  displayName: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  hasSeenOnboarding: false,
  resetEmailSent: false,
};

const getAuthErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already in use. Try logging in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

export const signupThunk = createAsyncThunk(
  'auth/signup',
  async (
    { email, password, name }: { email: string; password: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        email,
        goal: 2000,
        unit: 'ml',
        wakeTime: '07:00',
        sleepTime: '23:00',
        createdAt: serverTimestamp(),
        isPremium: false,
        premiumPlan: null,
        premiumExpiry: null,
        avatarColor: '#7AAACE',
      });

      return {
        uid: credential.user.uid,
        email: credential.user.email!,
        displayName: name,
      };
    } catch (error: any) {
      return rejectWithValue(getAuthErrorMessage(error.code || ''));
    }
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return {
        uid: credential.user.uid,
        email: credential.user.email!,
        displayName: credential.user.displayName,
      };
    } catch (error: any) {
      return rejectWithValue(getAuthErrorMessage(error.code || ''));
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
    } catch (error: any) {
      return rejectWithValue('Failed to sign out. Please try again.');
    }
  }
);

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      return rejectWithValue(getAuthErrorMessage(error.code || ''));
    }
  }
);

export const deleteAccountThunk = createAsyncThunk(
  'auth/deleteAccount',
  async (uid: string, { rejectWithValue }) => {
    try {
      const logsRef = collection(db, 'users', uid, 'logs');
      const logsDocs = await getDocs(logsRef);
      await Promise.all(logsDocs.docs.map((d) => deleteDoc(d.ref)));

      const remindersRef = collection(db, 'users', uid, 'reminders');
      const remindersDocs = await getDocs(remindersRef);
      await Promise.all(remindersDocs.docs.map((d) => deleteDoc(d.ref)));

      await deleteDoc(doc(db, 'users', uid));

      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    } catch (error: any) {
      return rejectWithValue('Failed to delete account. Please try again.');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{ uid: string; email: string; displayName: string | null }>
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
      state.resetEmailSent = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.uid = null;
        state.email = null;
        state.displayName = null;
        state.isAuthenticated = false;
      })
      .addCase(resetPasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.resetEmailSent = false;
      })
      .addCase(resetPasswordThunk.fulfilled, (state) => {
        state.loading = false;
        state.resetEmailSent = true;
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
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

export const { setUser, clearUser, setHasSeenOnboarding, clearError } = authSlice.actions;
export default authSlice.reducer;

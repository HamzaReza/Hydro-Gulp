import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { auth, db } from '../../firebase';

interface AuthState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  /** True when a new email/password account was created but email not yet verified */
  pendingEmailVerification: boolean;
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
  pendingEmailVerification: false,
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

const DEFAULT_USER_DOC = {
  goal: 2000,
  unit: 'ml',
  wakeTime: '07:00',
  sleepTime: '23:00',
  isPremium: false,
  premiumPlan: null,
  premiumExpiry: null,
  avatarColor: '#7AAACE',
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
      await sendEmailVerification(credential.user);

      await setDoc(doc(db, 'users', credential.user.uid), {
        ...DEFAULT_USER_DOC,
        name,
        email,
        createdAt: serverTimestamp(),
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
      if (!credential.user.emailVerified) {
        await signOut(auth);
        return rejectWithValue(
          'Please verify your email before signing in. Check your inbox for the verification link.'
        );
      }
      return {
        uid: credential.user.uid,
        email: credential.user.email!,
        displayName: credential.user.displayName,
      };
    } catch (error: any) {
      if (typeof error === 'string') return rejectWithValue(error);
      return rejectWithValue(getAuthErrorMessage(error.code || ''));
    }
  }
);

export const googleSignInThunk = createAsyncThunk(
  'auth/googleSignIn',
  async (_, { rejectWithValue }) => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return rejectWithValue('Google sign-in was cancelled.');
      }

      const tokens = await GoogleSignin.getTokens();
      const googleCredential = GoogleAuthProvider.credential(tokens.idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;

      // Create Firestore doc on first Google sign-in
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          ...DEFAULT_USER_DOC,
          name: user.displayName || '',
          email: user.email || '',
          createdAt: serverTimestamp(),
        });
      }

      return {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Google sign-in failed. Please try again.');
    }
  }
);

export const resendVerificationEmailThunk = createAsyncThunk(
  'auth/resendVerificationEmail',
  async (_, { rejectWithValue }) => {
    try {
      if (!auth.currentUser) throw new Error('No user session found.');
      await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to resend verification email.');
    }
  }
);

export const checkEmailVerifiedThunk = createAsyncThunk(
  'auth/checkEmailVerified',
  async (_, { rejectWithValue }) => {
    try {
      if (!auth.currentUser) throw new Error('No user session found.');
      await auth.currentUser.reload();
      if (!auth.currentUser.emailVerified) {
        return rejectWithValue('Email not yet verified. Please check your inbox.');
      }
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email!,
        displayName: auth.currentUser.displayName,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to check verification status.');
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
      state.pendingEmailVerification = false;
      state.loading = false;
      state.error = null;
    },
    setPendingVerification: (
      state,
      action: PayloadAction<{ uid: string; email: string; displayName: string | null }>
    ) => {
      state.uid = action.payload.uid;
      state.email = action.payload.email;
      state.displayName = action.payload.displayName;
      state.isAuthenticated = false;
      state.pendingEmailVerification = true;
      state.loading = false;
      state.error = null;
    },
    clearUser: (state) => {
      state.uid = null;
      state.email = null;
      state.displayName = null;
      state.isAuthenticated = false;
      state.pendingEmailVerification = false;
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
      // Signup — creates account & sends verification, does NOT authenticate
      .addCase(signupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = false;
        state.pendingEmailVerification = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Login — only succeeds if email is verified
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = true;
        state.pendingEmailVerification = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Google Sign-In — always verified
      .addCase(googleSignInThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleSignInThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = true;
        state.pendingEmailVerification = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(googleSignInThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Check email verified (on verify-email screen)
      .addCase(checkEmailVerifiedThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkEmailVerifiedThunk.fulfilled, (state, action) => {
        state.uid = action.payload.uid;
        state.email = action.payload.email;
        state.displayName = action.payload.displayName;
        state.isAuthenticated = true;
        state.pendingEmailVerification = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(checkEmailVerifiedThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Resend verification email
      .addCase(resendVerificationEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerificationEmailThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resendVerificationEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(logoutThunk.fulfilled, (state) => {
        state.uid = null;
        state.email = null;
        state.displayName = null;
        state.isAuthenticated = false;
        state.pendingEmailVerification = false;
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
        state.pendingEmailVerification = false;
      })
      .addCase(deleteAccountThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setUser, setPendingVerification, clearUser, setHasSeenOnboarding, clearError } =
  authSlice.actions;
export default authSlice.reducer;

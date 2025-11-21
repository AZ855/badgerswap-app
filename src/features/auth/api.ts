import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  onAuthStateChanged,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from '../../lib/firebase';
import { logLoginActivity } from './loginActivity';

const UW_EMAIL_RE = /^[a-z0-9._%+-]+@wisc\.edu$/i;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function signUpUW(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const normalized = normalizeEmail(email);
  if (!UW_EMAIL_RE.test(normalized)) {
    throw new Error('Please use a UW–Madison email (@wisc.edu).');
  }

  const cred = await createUserWithEmailAndPassword(auth, normalized, password);

  if (displayName) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }

  // Optional: create a user profile document in Firestore
  const userRef = doc(db, 'users', cred.user.uid);
  await setDoc(userRef, {
    displayName: displayName.trim(),
    email: normalized,
    createdAt: serverTimestamp(),
  });

  // Record the initial login so the activity feed is populated immediately.
  try {
    await logLoginActivity(cred.user);
  } catch (err) {
    console.warn('Failed to log login activity after signup', err);
  }

  return cred.user;
}

export async function signInUW(
  email: string,
  password: string
): Promise<User> {
  const normalized = normalizeEmail(email);
  if (!UW_EMAIL_RE.test(normalized)) {
    throw new Error('Please use a UW–Madison email (@wisc.edu).');
  }

  const cred = await signInWithEmailAndPassword(auth, normalized, password);

  try {
    await logLoginActivity(cred.user);
  } catch (err) {
    console.warn('Failed to log login activity', err);
  }
  
  return cred.user;
}

export async function signOutUW() {
  await auth.signOut();
}

export function subscribeAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

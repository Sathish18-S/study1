import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../../firebase';

export default function Index() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking) return null;
  return <Redirect href={loggedIn ? '/HomeScreen' : '/screens/WelcomeScreen'} />;
}

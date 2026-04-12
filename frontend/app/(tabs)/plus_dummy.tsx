import { Redirect } from 'expo-router';

// This is a dummy route used for the center "+" button.
// Tapping the button triggers a modal, so this screen should never be seen.
export default function PlusDummy() {
  return <Redirect href="/" />;
}

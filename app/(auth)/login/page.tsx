import { Suspense } from "react";
import { LoginForm } from "@/components/auth/AuthForms";

export default function Page() {
  // useSearchParams() needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

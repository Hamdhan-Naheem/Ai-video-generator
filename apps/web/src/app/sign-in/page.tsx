import { AuthForm } from "@/components/auth-form";
import { safeAccountReturn } from "@/lib/auth-return";
export const metadata = {title:"Sign in"};
export default async function SignInPage({searchParams}: {searchParams:Promise<{next?:string}>}) {
  return <AuthForm nextPath={safeAccountReturn((await searchParams).next)} />;
}

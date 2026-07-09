import { PageShell } from "@/components/public/PageShell";
import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const t = getDictionary(await getLocale());

  return (
    <PageShell>
      <h1 className="mb-4 text-center text-lg font-medium">{t.login.forgotPassword.title}</h1>
      <ForgotPasswordForm />
    </PageShell>
  );
}

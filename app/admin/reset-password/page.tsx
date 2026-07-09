import { PageShell } from "@/components/public/PageShell";
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const t = getDictionary(await getLocale());
  const token = firstValue((await searchParams).token) ?? "";

  return (
    <PageShell>
      <h1 className="mb-4 text-center text-lg font-medium">{t.login.resetPassword.title}</h1>
      <ResetPasswordForm token={token} />
    </PageShell>
  );
}

"use client";

import { useState } from "react";
import { Radio, Sliders, UserCircle } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { AccountForm } from "@/components/admin/AccountForm";
import { PreferencesPanel } from "@/components/admin/PreferencesPanel";
import { NgrokSettingsForm } from "@/components/admin/NgrokSettingsForm";

type AccountTab = "profile" | "preferences" | "ngrok";

const tabIcons: Record<AccountTab, typeof UserCircle> = {
  profile: UserCircle,
  preferences: Sliders,
  ngrok: Radio,
};

export function AccountTabs({ email }: { email: string }) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  const tabLabels: Record<AccountTab, string> = {
    profile: t.account.tabs.profile,
    preferences: t.account.tabs.preferences,
    ngrok: t.settings.ngrok.section,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-lg border border-surface-border bg-surface p-1">
        {(Object.keys(tabLabels) as AccountTab[]).map((key) => {
          const Icon = tabIcons[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === key ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {tabLabels[key]}
            </button>
          );
        })}
      </div>

      <div className="max-w-xl">
        {activeTab === "profile" && <AccountForm email={email} />}
        {activeTab === "preferences" && <PreferencesPanel />}
        {activeTab === "ngrok" && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t.settings.ngrok.description}</p>
            <NgrokSettingsForm />
          </section>
        )}
      </div>
    </div>
  );
}

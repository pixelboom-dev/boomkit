import { Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { useTheme } from "@/components/app/theme-provider";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="theme">
        <TabsList>
          <TabsTrigger value="profile">{t("settings.tab.profile")}</TabsTrigger>
          <TabsTrigger value="preferences">{t("settings.tab.preferences")}</TabsTrigger>
          <TabsTrigger value="theme">{t("settings.tab.theme")}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <EmptyState icon={Sparkles} title={t("settings.soon.title")} />
        </TabsContent>
        <TabsContent value="preferences" className="mt-4">
          <EmptyState icon={Sparkles} title={t("settings.soon.title")} />
        </TabsContent>
        <TabsContent value="theme" className="mt-4 max-w-sm space-y-2">
          <Label htmlFor="theme">{t("settings.tab.theme")}</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("settings.theme.light")}</SelectItem>
              <SelectItem value="dark">{t("settings.theme.dark")}</SelectItem>
              <SelectItem value="system">{t("settings.theme.system")}</SelectItem>
            </SelectContent>
          </Select>
        </TabsContent>
      </Tabs>
    </div>
  );
}

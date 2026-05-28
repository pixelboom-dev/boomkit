import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

export default function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSession((s) => s.signIn);
  const [email, setEmail] = useState("demo@boomkit.dev");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success(t("auth.success.signedIn"));
      navigate("/", { replace: true });
    } catch (err) {
      const msg = (err as Error).message === "invalid_credentials"
        ? t("auth.error.invalid")
        : t("auth.error.generic");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>{t("auth.signIn.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.signIn.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.signIn.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {t("auth.signIn.submit")}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/signup">{t("auth.signIn.toSignUp")}</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

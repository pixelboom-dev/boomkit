import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
      const msg =
        (err as Error).message === "invalid_credentials"
          ? t("auth.error.invalid")
          : t("auth.error.generic");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("auth.signIn.title")}</CardTitle>
          <CardDescription>{t("auth.signIn.description")}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("auth.signIn.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">{t("auth.signIn.password")}</Label>
                <a
                  href="#"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  {t("auth.signIn.forgot")}
                </a>
              </div>
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
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {t("auth.signIn.submit")}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {t("auth.signIn.noAccount")}{" "}
              <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">
                {t("auth.signIn.toSignUp")}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
      <p className="text-muted-foreground text-balance text-center text-xs">
        {t("auth.terms")}
      </p>
    </>
  );
}

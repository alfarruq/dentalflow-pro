import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    if (ok) {
      navigate("/", { replace: true });
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm rounded-3xl border-border/40">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-semibold text-lg shadow-sm">
            D
          </div>
          <CardTitle className="text-xl font-semibold">{t("login.title")}</CardTitle>
          <p className="text-[13px] text-muted-foreground mt-1">{t("login.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{t("login.error")}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[13px]">{t("login.username")}</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("login.usernamePlaceholder")} autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px]">{t("login.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("login.passwordPlaceholder")} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={submitting}>{t("login.submit")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

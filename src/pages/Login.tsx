import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

// Zod schema. Messages are i18n keys, resolved with t() at render time so
// validation feedback follows the active language.
const loginSchema = z.object({
  username: z.string().min(1, "login.validation.usernameRequired"),
  // Backend only requires a non-empty password (see swagger UserLogin:
  // minLength 1) — no minimum length is enforced server-side, so the client
  // must not invent one either.
  password: z.string().min(1, "login.validation.passwordRequired"),
  remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", remember: true },
  });

  const remember = watch("remember");

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(false);
    // Build an explicit LoginParams: zod validation has already guaranteed
    // username/password are present and valid by the time onSubmit runs.
    const ok = await login({
      username: values.username,
      password: values.password,
      remember: values.remember,
    });
    if (ok) {
      navigate("/", { replace: true });
    } else {
      setApiError(true);
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {apiError && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{t("login.error")}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[13px]">
                {t("login.username")}
              </Label>
              <Input
                id="username"
                {...register("username")}
                placeholder={t("login.usernamePlaceholder")}
                autoComplete="username"
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? "username-error" : undefined}
              />
              {errors.username && (
                <p id="username-error" className="text-[12px] text-destructive">
                  {t(errors.username.message ?? "")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px]">
                {t("login.password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder={t("login.passwordPlaceholder")}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-[12px] text-destructive">
                  {t(errors.password.message ?? "")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="remember" className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setValue("remember", v === true)}
                />
                {t("login.rememberMe")}
              </label>
              {/* Forgot-password is a disabled placeholder until the flow exists. */}
              <button
                type="button"
                disabled
                className="text-[13px] text-muted-foreground/60 cursor-not-allowed"
                title={t("login.forgotPassword")}
              >
                {t("login.forgotPassword")}
              </button>
            </div>

            <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("login.signingIn")}
                </>
              ) : (
                t("login.submit")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

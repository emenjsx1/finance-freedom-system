/**
 * Human, Portuguese messages for authentication failures.
 * Raw provider/Supabase errors are never shown to the user.
 */
export function authErrorMessage(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message ?? "")
        : "";
  const message = raw.toLowerCase();

  if (!message) return "Não conseguimos concluir o pedido. Tenta novamente.";

  if (message.includes("invalid login credentials")) return "Email ou palavra-passe incorretos.";
  if (message.includes("email not confirmed")) return "Confirma o teu email antes de entrares.";
  if (message.includes("user already registered") || message.includes("already been registered"))
    return "Já existe uma conta associada a este email.";
  if (message.includes("identity is already linked") || message.includes("already linked"))
    return "Este método de acesso já está ligado a uma conta.";
  if (message.includes("password should be at least") || message.includes("password is too short"))
    return "A palavra-passe precisa de pelo menos 8 caracteres.";
  if (message.includes("pwned") || message.includes("compromised"))
    return "Essa palavra-passe apareceu em fugas de dados. Escolhe outra.";
  if (message.includes("same as the old") || message.includes("should be different"))
    return "A nova palavra-passe tem de ser diferente da atual.";
  if (message.includes("current password") || message.includes("invalid password"))
    return "A palavra-passe atual não está correta.";
  if (message.includes("expired") || message.includes("invalid or has expired") || message.includes("otp"))
    return "Este link expirou. Pede um novo.";
  if (message.includes("rate limit") || message.includes("too many"))
    return "Demasiadas tentativas. Espera um momento e tenta de novo.";
  if (message.includes("popup") || message.includes("cancel") || message.includes("aborted"))
    return "A autenticação foi cancelada.";
  if (message.includes("network") || message.includes("fetch"))
    return "Sem ligação. Verifica a internet e tenta de novo.";
  if (message.includes("provider") && message.includes("not"))
    return "Este método de acesso ainda não está disponível.";
  if (message.includes("single identity") || message.includes("last identity"))
    return "Não podes remover o teu único método de acesso.";

  return "Não conseguimos iniciar sessão. Tenta novamente.";
}

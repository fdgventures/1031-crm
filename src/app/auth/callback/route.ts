import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    const errorMessage = errorDescription
      ? decodeURIComponent(errorDescription)
      : "Email confirmation failed";

    return NextResponse.redirect(
      `${requestUrl.origin}/admin/register?error=${encodeURIComponent(
        errorMessage
      )}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    if (exchangeError) {
      return NextResponse.redirect(
        `${requestUrl.origin}/admin/register?error=${encodeURIComponent(
          exchangeError.message
        )}`
      );
    }

    // Обновляем статус верификации пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("user_profiles")
        .update({ is_verified: true })
        .eq("id", user.id);
    }
  }

  // Перенаправляем на страницу входа
  return NextResponse.redirect(`${requestUrl.origin}/admin/signin`);
}

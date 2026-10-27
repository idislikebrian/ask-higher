import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { saveProfileDraft } from "@/lib/persistence/publish";
import { validateDraftPayload } from "@/lib/persistence/validation";

export async function POST(request: Request) {
  try {
    const rawPayload: unknown = await request.json();
    const result = validateDraftPayload(rawPayload);
    if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
    const session = await requireSession();
    const saved = await saveProfileDraft(result.draft, rawPayload, session.user.id);
    return NextResponse.json(saved, { status: 200 });
  } catch (error) {
    console.error("Profile draft save failed", error);
    if (error instanceof Error && error.message === "Authentication is required.") return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Profile draft could not be saved." }, { status: 500 });
  }
}

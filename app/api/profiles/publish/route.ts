import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { publishProfile } from "@/lib/persistence/publish";
import { validatePublishPayload } from "@/lib/persistence/validation";

export async function POST(request: Request) {
  try {
    const rawPayload: unknown = await request.json();
    const result = validatePublishPayload(rawPayload);
    if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
    const session = await requireSession();
    const profile = await publishProfile(result.draft, rawPayload, session.user.id);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Profile publish failed", error);
    if (error instanceof Error && error.message === "Authentication is required.") return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Profile could not be published." }, { status: 500 });
  }
}

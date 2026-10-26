import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { setProfileVisibility } from "@/lib/persistence/publish";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json() as { profileId?: unknown; status?: unknown };
    if (typeof body.profileId !== "string" || body.status !== "HIDDEN") return NextResponse.json({ error: "A profileId and HIDDEN status are required." }, { status: 400 });
    const profile = await setProfileVisibility(body.profileId, session.user.id, "HIDDEN");
    return NextResponse.json({ id: profile.id, status: profile.status });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication is required.") return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof Error && error.message === "You do not own this profile.") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Profile could not be hidden." }, { status: 500 });
  }
}

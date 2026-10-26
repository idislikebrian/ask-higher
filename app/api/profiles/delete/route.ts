import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { deleteOwnedProfile } from "@/lib/persistence/publish";

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json() as { profileId?: unknown; confirm?: unknown };
    if (typeof body.profileId !== "string" || body.confirm !== true) return NextResponse.json({ error: "Explicit delete confirmation is required." }, { status: 400 });
    const profile = await deleteOwnedProfile(body.profileId, session.user.id);
    return NextResponse.json({ id: profile.id, status: profile.status, deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication is required.") return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof Error && error.message === "You do not own this profile.") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Profile could not be deleted." }, { status: 500 });
  }
}

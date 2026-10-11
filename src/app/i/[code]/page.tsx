import { redirect } from "next/navigation";
import { acceptInviteAction } from "@/app/actions/friends";
import { Avatar } from "@/components/avatars";
import { inviterForCode, areFriends } from "@/lib/friends";
import { currentUser } from "@/lib/session";
import Link from "next/link";

export const metadata = { title: "Invite", robots: { index: false } };

/** What someone sees after opening a friend's invite link. Becoming friends is a button, never an automatic visit. */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await currentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/i/${code}`)}`);

  const inviter = await inviterForCode(code);
  if (!inviter) {
    return (
      <main className="page">
        <header>
          <h1 className="ch-title">Invite</h1>
        </header>
        <section className="stack">
          <p>That invite link is not valid any more. Ask your friend for a new one.</p>
          <Link className="ch-btn ch-btn--ghost" href="/">Go to Cheese</Link>
        </section>
      </main>
    );
  }
  const own = inviter.userId === me.user.id;
  const already = !own && (await areFriends(me.user.id, inviter.userId));

  return (
    <main className="page">
      <header>
        <h1 className="ch-title">Invite</h1>
      </header>
      <section className="stack">
        <div className="card row">
          <Avatar person={inviter} size="lg" />
          <div className="grow">
            <p className="ch-row-title">{inviter.displayName}</p>
            <p className="hint">@{inviter.username}</p>
          </div>
        </div>
        {own ? (
          <p>This is your own invite link. Send it to a friend.</p>
        ) : already ? (
          <>
            <p>You and {inviter.displayName} are already friends.</p>
            <Link className="ch-btn ch-btn--primary ch-btn--block" href="/friends">Open Friends</Link>
          </>
        ) : (
          <>
            <p>{inviter.displayName} invited you to Cheese. Add them as a friend to see what you both want to watch, read and play.</p>
            <form action={acceptInviteAction.bind(null, code)}>
              <button className="ch-btn ch-btn--primary ch-btn--block">Add {inviter.displayName}</button>
            </form>
            <Link className="ch-btn ch-btn--ghost ch-btn--block" href="/">No thanks</Link>
          </>
        )}
      </section>
    </main>
  );
}

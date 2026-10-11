import Link from "next/link";
import { makeGroup } from "@/app/actions/friends";
import { Avatar } from "@/components/avatars";
import { ActionForm } from "@/components/form-field";
import { Icon } from "@/components/icons";
import { listFriends } from "@/lib/friends";
import { requireUser } from "@/lib/session";

export const metadata = { title: "New group" };

export default async function NewGroupPage() {
  const { user } = await requireUser();
  const friends = await listFriends(user.id);
  return (
    <>
      <header className="head">
        <h1 className="ch-title">New group</h1>
        <Link href="/friends" className="iconbtn" aria-label="Back to Friends">
          <Icon name="back" />
        </Link>
      </header>
      <section>
        {friends.length === 0 ? (
          <div className="empty">
            <p>Add a friend first, then make a group together.</p>
            <Link className="ch-btn ch-btn--primary" href="/friends/add">
              Invite a friend
            </Link>
          </div>
        ) : (
          <ActionForm action={makeGroup} submit="Make group">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" className="input" maxLength={40} placeholder="Movie nights" required autoComplete="off" />
            </div>
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="lbl" style={{ padding: 0 }}>Who is in it</legend>
              <div className="ch-list ch-list--card">
                {friends.map((f) => (
                  <label className="ch-lrow" key={f.userId} style={{ gridTemplateColumns: "auto 1fr auto", cursor: "pointer" }}>
                    <Avatar person={f} />
                    <div className="ch-lrow__body">
                      <p className="ch-row-title">{f.displayName}</p>
                      <p className="ch-lrow__meta">@{f.username}</p>
                    </div>
                    <input type="checkbox" name="member" value={f.userId} style={{ width: 22, height: 22 }} aria-label={`Add ${f.displayName}`} />
                  </label>
                ))}
              </div>
            </fieldset>
          </ActionForm>
        )}
      </section>
    </>
  );
}

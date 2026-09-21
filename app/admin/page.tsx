import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { DataStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/admin/login");
  }

  const store = DataStore.getInstance();
  await store.seedDemoTracks();
  const tracksWithLinks = await store.getTracksWithLinks();

  return (
    <AdminDashboard
      initialTracks={tracksWithLinks}
      isUsingSupabase={store.isUsingSupabase()}
    />
  );
}

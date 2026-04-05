import { redirect } from "next/navigation";

// TODO: check for valid token and redirect to /dashboard if logged in
export default function Home() {
  redirect("/login");
}

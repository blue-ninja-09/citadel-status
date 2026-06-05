import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      width: "100vw",
      background: "var(--bg)",
      position: "fixed",
      top: 0,
      left: 0,
    }}>
      <SignIn />
    </div>
  );
}

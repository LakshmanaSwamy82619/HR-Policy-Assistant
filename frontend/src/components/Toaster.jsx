import { Toaster as HotToaster } from "react-hot-toast";

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#14181F",
          color: "#F7F5F0",
          fontSize: "13.5px",
          borderRadius: "10px",
          padding: "10px 14px",
          boxShadow: "0 8px 24px rgba(20,24,31,0.18)",
        },
        success: { iconTheme: { primary: "#3D8770", secondary: "#F7F5F0" } },
        error: { iconTheme: { primary: "#C0453B", secondary: "#F7F5F0" } },
      }}
    />
  );
}

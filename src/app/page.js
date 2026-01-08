"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="loading loading-spinner loading-lg"></div>
    </div>
  );
}

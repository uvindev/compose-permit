"use client";

import { useEffect } from "react";
import { signature } from "@/lib/signature";

export function Signature() {
  useEffect(() => {
    signature("ComposePermit");
  }, []);
  return null;
}

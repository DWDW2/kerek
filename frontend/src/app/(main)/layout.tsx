import { ProtectedRoute } from "@/components/auth/protected-route";

import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function layout({ children }: Props) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

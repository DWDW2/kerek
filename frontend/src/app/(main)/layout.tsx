import { ProtectedRoute } from "@/components/auth/protected-route";
import OnlineProviderWrapper from "@/components/online-provider-wrapper";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function layout({ children }: Props) {
  return (
    <OnlineProviderWrapper>
      <ProtectedRoute>{children}</ProtectedRoute>
    </OnlineProviderWrapper>
  );
}

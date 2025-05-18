import React from "react";
import { OnlineStatusProvider } from "./providers/online-status-provider";

type Props = {
  children: React.ReactNode;
};

export default function OnlineProviderWrapper({ children }: Props) {
  return <OnlineStatusProvider>{children}</OnlineStatusProvider>;
}

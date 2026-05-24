"use client";

import type { UiContext } from "@applicator/sdk/context";
import RanklistApp from "./RanklistApp";

interface Props {
  path?: string[];
  appId?: string;
  navigate?: (url: string) => void;
  context?: UiContext;
}

export default function App({ path, navigate, context }: Props) {
  return <RanklistApp path={path} navigate={navigate} context={context} />;
}

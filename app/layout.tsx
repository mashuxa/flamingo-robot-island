import type { ReactNode } from "react";
export const metadata = { title: "Фламинго и робот — Остров сокровищ", description: "Тропическая настольная игра для детей" };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="ru"><body style={{margin:0,fontFamily:"system-ui, sans-serif"}}>{children}</body></html>; }

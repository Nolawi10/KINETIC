import { createFileRoute } from "@tanstack/react-router";
import { KineticNavigation } from "@/components/kinetic-navigation";
import { KineticHero } from "@/components/kinetic-hero";
import { KineticLanding } from "@/components/kinetic-landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KINETIC Combat Academy — AI MMA Trainer" },
      {
        name: "description",
        content:
          "KINETIC Combat Academy: AI-powered precision telemetry and strike analysis for MMA training.",
      },
      { property: "og:title", content: "KINETIC Combat Academy — AI MMA Trainer" },
      {
        property: "og:description",
        content: "AI-powered precision telemetry and strike analysis for MMA training.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="kinetic-page">
      <KineticNavigation />
      <KineticHero />
      <KineticLanding />
    </main>
  );
}

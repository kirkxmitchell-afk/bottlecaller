import type { TableServicePhase } from "./types";

/** Map Godot floor session phases onto the modular service phase vocabulary. */
export function mapGodotPhaseToTableServicePhase(
  godotPhase: string | null | undefined,
  flags: {
    reviewed?: boolean;
    greetingSelected?: boolean;
    wineOpportunityOpen?: boolean;
    encounterActive?: boolean;
    encounterResolved?: boolean;
  } = {},
): TableServicePhase {
  const phase = String(godotPhase || "").trim().toLowerCase();

  if (flags.encounterActive) return "encounter_active";
  if (flags.encounterResolved) return "encounter_resolved";
  if (flags.wineOpportunityOpen) return "ready_for_wine_selection";
  if (flags.greetingSelected) return "greeting_selected";
  if (flags.reviewed) return "reviewed";

  switch (phase) {
    case "ready_for_guests":
      return "arriving";
    case "guest_walking_to_table":
      return "waiting_at_door";
    case "waiting_to_greet":
      return flags.reviewed ? "reviewed" : "ready_for_review";
    case "order_pending_pos":
    case "service_active":
    case "waiting_for_mise":
    case "eating":
    case "drinking":
      return "continuing_service";
    case "leaving":
    case "plates_collected":
      return "departed";
    case "reset_required":
      return "unfinished";
    default:
      if (phase.includes("annoyed") || phase.includes("walk")) return "impatient";
      return "seated";
  }
}

export function canOpenGreeting(phase: TableServicePhase): boolean {
  return phase === "reviewed" || phase === "ready_for_review" || phase === "greeting_selected";
}

export function canOpenWineSelection(phase: TableServicePhase): boolean {
  return (
    phase === "ready_for_wine_selection" ||
    phase === "opening_service" ||
    phase === "greeting_selected" ||
    phase === "wine_selected"
  );
}

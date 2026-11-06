import { GamePicker } from "@/components/GamePicker";

// Root of the collection shell: a pure game chooser. Each game owns its own
// create/join flow under its route, so nothing here references game specifics.
export default function PickerPage() {
  return <GamePicker />;
}

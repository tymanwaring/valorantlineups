import type { LineupStep } from "./types";
import { saveUpload } from "./uploads";

/**
 * Parse a variable number of lineup steps from indexed multipart fields:
 *   step-{i}-caption   text
 *   step-{i}-image     new file (optional)
 *   step-{i}-existing  current image path (edit only, optional)
 * New files are uploaded; otherwise the existing path is kept.
 */
export async function parseStepsFromForm(form: FormData): Promise<LineupStep[]> {
  const steps: LineupStep[] = [];
  let i = 0;
  while (form.has(`step-${i}-caption`)) {
    const caption = String(form.get(`step-${i}-caption`) || "").trim();
    const file = form.get(`step-${i}-image`) as File | null;
    const existing = form.get(`step-${i}-existing`);

    let image: string | undefined;
    if (file && typeof file === "object" && file.size > 0) {
      image = await saveUpload(file);
    } else if (typeof existing === "string" && existing) {
      image = existing;
    }

    // Skip fully empty rows.
    if (caption || image) steps.push({ caption, image });
    i++;
  }
  return steps;
}

export function collectStepImages(steps: LineupStep[]): string[] {
  return steps.map((s) => s.image).filter((s): s is string => !!s);
}

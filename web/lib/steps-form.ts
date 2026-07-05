import type { LineupStep } from "./types";
import { normalizeAnnotations } from "./types";
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

    let annotations;
    const rawAnn =
      form.get(`step-${i}-annotations`) ?? form.get(`step-${i}-circles`);
    if (typeof rawAnn === "string" && rawAnn) {
      try {
        const parsed = JSON.parse(rawAnn);
        // Legacy `circles` payloads lack a type; tag them as circles.
        annotations = normalizeAnnotations(
          Array.isArray(parsed)
            ? parsed.map((p) =>
                p && typeof p === "object" && !("type" in p)
                  ? { ...p, type: "circle" }
                  : p,
              )
            : parsed,
        );
      } catch {
        annotations = undefined;
      }
    }

    // Skip fully empty rows. Annotations are only meaningful with an image.
    if (caption || image)
      steps.push({ caption, image, annotations: image ? annotations : undefined });
    i++;
  }
  return steps;
}

export function collectStepImages(steps: LineupStep[]): string[] {
  return steps.map((s) => s.image).filter((s): s is string => !!s);
}

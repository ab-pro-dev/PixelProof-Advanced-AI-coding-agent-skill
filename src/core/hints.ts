/**
 * Actionable error hints for failed operations (spec §11).
 *
 * Provides short, actionable next-step guidance for error codes.
 * All hint texts are AGENT PROPOSALS.
 */

export const HINTS: Record<string, string> = {
  artifact_error: "Ensure the destination output directory is writable and adequate disk space is available.",
  base_url_missing: "Provide --base-url on the command line or configure project.baseUrl in references.json.",
  compare_unavailable: "Ensure Python 3.12+ and pixelproof_image are installed and accessible on PATH.",
  dimension_mismatch: "Ensure the rendered screenshot dimensions match the reference image dimensions exactly.",
  duplicate_id: "Assign a unique 'id' to each reference entry in the manifest.",
  empty_references: "Add at least one reference object to the 'references' array in references.json.",
  image_missing: "Verify that the reference image file exists at the path relative to the manifest directory.",
  image_size_mismatch: "Ensure the reference image pixel dimensions equal viewport width x height multiplied by deviceScaleFactor.",
  image_unreadable: "Ensure the reference image is a valid, readable PNG or JPEG file.",
  inspector_unavailable: "Ensure Python 3.12+ and pixelproof_image are installed and accessible on PATH.",
  internal_error: "Check the command options and error message for unexpected failures.",
  invalid_base_url: "Set project.baseUrl to a valid absolute HTTP or HTTPS URL (for example, http://localhost:5173).",
  invalid_capture_type: "Set captureType to 'viewport' (fullPage and region are not currently supported).",
  invalid_device_scale_factor: "Set deviceScaleFactor to a positive number (default is 1).",
  invalid_grid: "Specify grid as '<rows>x<cols>' with positive integers (for example, 4x4).",
  invalid_id: "Use a reference ID matching [A-Za-z0-9_-]{1,64} without special characters.",
  invalid_option: "Use supported command-line options; run with --help to view valid arguments.",
  invalid_reference_entry: "Ensure each reference entry in the comparison summary is a JSON object.",
  invalid_reference_id: "Ensure the reference ID contains only alphanumeric characters, underscores, or hyphens (1-64 characters).",
  invalid_region_weights: "Provide a valid regionWeights object with grid rows/cols and a matching 2D array of positive weights (<= 10).",
  invalid_route: "Ensure route begins with a leading forward slash '/' (for example, / or /dashboard).",
  invalid_stall_window: "Provide a positive integer for stall-window (minimum 1, default 2).",
  invalid_type: "Check manifest schema types for each field and provide expected data types.",
  invalid_version: "Set manifest version to 1.",
  invalid_viewport: "Ensure viewport width and height are positive integers.",
  invalid_weights_file: "Ensure the weights file exists, is valid JSON, and matches the regionWeights schema.",
  iterate_unavailable: "Ensure Python 3.12+ and pixelproof_image are installed and accessible on PATH.",
  manifest_invalid: "Fix schema and validation errors reported in references.json before proceeding.",
  manifest_missing: "Ensure the manifest file exists at the specified path.",
  manifest_unparseable: "Ensure the manifest file contains valid JSON without syntax errors.",
  missing_field: "Add all required fields specified by the manifest schema.",
  missing_file: "Ensure the image file exists at the specified path.",
  missing_status: "Ensure every reference comparison result contains a status of 'compared' or 'failed'.",
  navigation_failed: "Ensure the development server is running and accessible at the target URL.",
  no_references: "Add at least one reference to capture in the references.json manifest.",
  not_a_directory: "Provide a path to an existing directory.",
  output_exists: "Use --overwrite to overwrite existing output files or choose a different output path.",
  path_escape: "Use relative image paths located inside the manifest directory without '../' traversal.",
  progress_unavailable: "Ensure Python 3.12+ and pixelproof_image are installed and accessible on PATH.",
  readiness_timeout: "Ensure the element specified by readySelector renders before the timeout expires.",
  report_failed: "Verify comparison summary structure and ensure the report destination directory is writable.",
  report_unavailable: "Ensure Python 3.12+ and pixelproof_image are installed and accessible on PATH.",
  state_corrupt: "Restore or delete the corrupted iterations.json file in the state directory.",
  state_missing: "Run 'pixelproof iterate' first to create the initial iteration state before checking progress.",
  summary_missing: "Ensure the run summary JSON file exists at the specified path.",
  summary_unparseable: "Ensure the comparison summary file contains valid JSON.",
  timeout: "Increase timeoutMs or verify that the target page responds and renders promptly.",
  unknown_error: "Check tool error details and logs for unexpected failure causes.",
  unreadable: "Ensure the target file or directory exists and has read permissions.",
  url_not_allowed: "Use local URLs (localhost or 127.0.0.1) or pass --allow-external to permit remote hosts.",
  usage_error: "Check command usage with --help and supply the required arguments.",
  validator_unavailable: "Ensure Python 3.12+ and pixelproof_image are installed and accessible on PATH.",
  weights_grid_mismatch: "Ensure weights matrix dimensions match the specified or default grid rows and columns.",
  weights_require_regions: "Pass --regions when specifying --weights for region analysis.",
  write_failed: "Ensure the target directory is writable and adequate disk space is available.",
};

export function hintFor(code: string): string | undefined {
  return HINTS[code];
}

export function makeError<T extends string = string>(
  code: T,
  message: string,
  extra?: Record<string, any>
): { code: T; message: string; hint?: string } {
  const err: { code: T; message: string; hint?: string } & Record<string, any> = {
    code,
    message,
    ...extra,
  };
  const hint = hintFor(code);
  if (hint !== undefined) {
    err.hint = hint;
  }
  return err;
}

import { useState, useRef, useCallback } from "react";
import { useImportContacts } from "@workspace/api-client-react";
import type { ContactInput, ContactInputGender } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload, FileText, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, AlertCircle, X
} from "lucide-react";

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  function splitRow(line: string): string[] {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        cells.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  const headers = splitRow(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = splitRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  }).filter((r) => Object.values(r).some((v) => v.trim() !== ""));
  return { headers, rows };
}

// ── Contact field definitions ─────────────────────────────────────────────────

type ContactField =
  | "firstName" | "lastName" | "phone"
  | "gender" | "ageGroup" | "occupation"
  | "consentSms" | "notes" | "tags";

const CONTACT_FIELDS: { value: ContactField; label: string; required?: boolean }[] = [
  { value: "firstName", label: "First Name", required: true },
  { value: "lastName", label: "Last Name", required: true },
  { value: "phone", label: "Phone", required: true },
  { value: "gender", label: "Gender" },
  { value: "ageGroup", label: "Age Group" },
  { value: "occupation", label: "Occupation" },
  { value: "consentSms", label: "SMS Consent" },
  { value: "notes", label: "Notes" },
  { value: "tags", label: "Tags (comma-separated)" },
];

const AUTO_DETECT: Record<ContactField, string[]> = {
  firstName: ["first_name", "firstname", "first name", "fname", "given name", "given_name"],
  lastName: ["last_name", "lastname", "last name", "lname", "surname", "family name"],
  phone: ["phone", "mobile", "tel", "telephone", "phone_number", "phone number", "msisdn"],
  gender: ["gender", "sex"],
  ageGroup: ["age_group", "age group", "agegroup", "age"],
  occupation: ["occupation", "job", "profession", "work"],
  consentSms: ["consent", "consent_sms", "sms_consent", "opted_in", "optedin", "opt_in"],
  notes: ["notes", "note", "remarks", "comment", "comments"],
  tags: ["tags", "tag", "labels", "label", "categories"],
};

function autoDetect(headers: string[]): Partial<Record<ContactField, string>> {
  const mapping: Partial<Record<ContactField, string>> = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const [field, aliases] of Object.entries(AUTO_DETECT) as [ContactField, string[]][]) {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias);
      if (idx !== -1) { mapping[field] = headers[idx]; break; }
    }
  }
  return mapping;
}

// ── Row → ContactInput ────────────────────────────────────────────────────────

function rowToContact(
  row: Record<string, string>,
  mapping: Partial<Record<ContactField, string>>
): ContactInput | null {
  const get = (f: ContactField) => (mapping[f] ? (row[mapping[f]!] ?? "").trim() : "");

  const firstName = get("firstName");
  const lastName = get("lastName");
  const phone = get("phone");
  if (!firstName || !lastName || !phone) return null;

  const genderRaw = get("gender").toLowerCase();
  const gender: ContactInputGender | undefined =
    genderRaw === "male" || genderRaw === "m" ? "male"
    : genderRaw === "female" || genderRaw === "f" ? "female"
    : genderRaw === "other" ? "other"
    : undefined;

  const consentRaw = get("consentSms").toLowerCase();
  const consentSms =
    ["yes", "y", "true", "1", "agreed", "opted in"].includes(consentRaw) ? true
    : ["no", "n", "false", "0", "declined"].includes(consentRaw) ? false
    : undefined;

  const tagsRaw = get("tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  return {
    firstName,
    lastName,
    phone,
    gender,
    ageGroup: get("ageGroup") || undefined,
    occupation: get("occupation") || undefined,
    consentSms,
    notes: get("notes") || undefined,
    tags,
  };
}

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Upload", "Map Columns", "Preview & Import"];
  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors
                ${done ? "bg-primary border-primary text-primary-foreground"
                  : active ? "border-primary text-primary bg-primary/10"
                  : "border-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CsvImportModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const importMutation = useImportContacts({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        setResult(result);
        setStep(3);
        setImportDone(true);
      }
    }
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rawText, setRawText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ContactField, string>>>({});
  const [importDone, setImportDone] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1); setRawText(""); setParseError(null);
    setParsed(null); setMapping({}); setImportDone(false); setResult(null);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handleText(text: string) {
    setRawText(text);
    setParseError(null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => handleText((e.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }, []);

  function goToMap() {
    if (!rawText.trim()) { setParseError("Please paste or upload a CSV file."); return; }
    const result = parseCsv(rawText);
    if (result.headers.length === 0) { setParseError("Could not parse CSV. Make sure the first row contains column headers."); return; }
    if (result.rows.length === 0) { setParseError("No data rows found. CSV must have at least one data row after the header."); return; }
    setParsed(result);
    setMapping(autoDetect(result.headers));
    setStep(2);
  }

  const contacts = parsed
    ? parsed.rows.map((r) => rowToContact(r, mapping)).filter((c): c is ContactInput => c !== null)
    : [];

  const missingRequired = CONTACT_FIELDS
    .filter((f) => f.required && !mapping[f.value])
    .map((f) => f.label);

  function handleImport() {
    importMutation.mutate({ data: { contacts } });
  }

  const UNSET = "__none__";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import Contacts from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <Steps current={step} />

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${dragOver ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="font-medium text-sm">Drop your CSV file here, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">First row must be column headers</p>
              </div>

              <div className="text-center text-xs text-muted-foreground">or paste CSV text below</div>

              <Textarea
                rows={6}
                placeholder={`firstName,lastName,phone,gender,ageGroup\nJohn,Kamau,+254712345678,male,25-34\nFatuma,Wanjiku,+254700000001,female,35-44`}
                value={rawText}
                onChange={(e) => handleText(e.target.value)}
                className="font-mono text-xs"
              />

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">Supported columns</p>
                <p>Required: <span className="font-medium">firstName</span>, <span className="font-medium">lastName</span>, <span className="font-medium">phone</span></p>
                <p>Optional: gender, ageGroup, occupation, consentSms (yes/no), notes, tags (comma-separated)</p>
                <p>Column names are detected automatically (case-insensitive). You can remap them in the next step.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Map columns ── */}
          {step === 2 && parsed && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Detected <span className="font-semibold text-foreground">{parsed.rows.length}</span> rows with{" "}
                <span className="font-semibold text-foreground">{parsed.headers.length}</span> columns.
                Map each contact field to the matching CSV column.
              </p>

              <div className="divide-y rounded-md border">
                {CONTACT_FIELDS.map((field) => (
                  <div key={field.value} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div className="min-w-[140px]">
                      <span className="text-sm font-medium">{field.label}</span>
                      {field.required && <Badge variant="secondary" className="ml-2 text-[10px] text-primary bg-primary/10">Required</Badge>}
                    </div>
                    <Select
                      value={mapping[field.value] ?? UNSET}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [field.value]: v === UNSET ? undefined : v }))}
                    >
                      <SelectTrigger className="w-48 h-8 text-xs">
                        <SelectValue placeholder="— not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNSET} className="text-xs text-muted-foreground">— not mapped —</SelectItem>
                        {parsed.headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {missingRequired.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Map required fields: {missingRequired.join(", ")}</AlertDescription>
                </Alert>
              )}

              {missingRequired.length === 0 && (
                <p className="text-xs text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {contacts.length} of {parsed.rows.length} rows will be imported
                  {contacts.length < parsed.rows.length && ` (${parsed.rows.length - contacts.length} skipped — missing required fields)`}
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Preview / Result ── */}
          {step === 3 && (
            <div className="space-y-4">
              {importDone && result ? (
                <div className="space-y-4">
                  <div className={`rounded-xl border p-5 flex items-start gap-4 ${result.errors.length === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                    {result.errors.length === 0
                      ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                      : <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold">{result.imported} contacts imported successfully</p>
                      {result.skipped > 0 && <p className="text-sm text-muted-foreground">{result.skipped} rows skipped (duplicates or invalid)</p>}
                      {result.errors.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {result.errors.slice(0, 5).map((e, i) => <li key={i} className="text-xs text-amber-800">{e}</li>)}
                          {result.errors.length > 5 && <li className="text-xs text-amber-700">…and {result.errors.length - 5} more</li>}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Previewing first 5 of{" "}
                    <span className="font-semibold text-foreground">{contacts.length}</span> contacts to import.
                  </p>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Phone</TableHead>
                          <TableHead className="text-xs">Gender</TableHead>
                          <TableHead className="text-xs">Age Group</TableHead>
                          <TableHead className="text-xs">Consent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.slice(0, 5).map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium py-2">{c.firstName} {c.lastName}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{c.phone}</TableCell>
                            <TableCell className="text-xs py-2 capitalize">{c.gender ?? "—"}</TableCell>
                            <TableCell className="text-xs py-2">{c.ageGroup ?? "—"}</TableCell>
                            <TableCell className="text-xs py-2">
                              {c.consentSms === true
                                ? <Badge variant="secondary" className="text-[10px] text-green-700 bg-green-100">Yes</Badge>
                                : c.consentSms === false
                                ? <Badge variant="outline" className="text-[10px]">No</Badge>
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {contacts.length < (parsed?.rows.length ?? 0) && (
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {(parsed?.rows.length ?? 0) - contacts.length} rows skipped — missing firstName, lastName, or phone.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="shrink-0 border-t pt-4 mt-2 flex items-center justify-between">
          {importDone ? (
            <div className="flex justify-end w-full">
              <Button onClick={() => handleClose(false)}>Close</Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={() => step === 1 ? handleClose(false) : setStep((s) => (s - 1) as 1 | 2 | 3)}>
                {step === 1 ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
              </Button>

              {step === 1 && (
                <Button onClick={goToMap} disabled={!rawText.trim()}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={() => setStep(3)} disabled={missingRequired.length > 0 || contacts.length === 0}>
                  Preview <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {step === 3 && !importDone && (
                <Button onClick={handleImport} disabled={importMutation.isPending || contacts.length === 0}>
                  {importMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
                    : `Import ${contacts.length} Contacts`}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

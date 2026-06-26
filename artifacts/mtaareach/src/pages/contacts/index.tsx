import { useState } from "react";
import { useListContacts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Upload, Users } from "lucide-react";
import { CsvImportModal } from "@/components/csv-import-modal";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);

  const { data: contactsPage, isLoading } = useListContacts(
    { page, limit: 10, search: search.length > 2 ? search : undefined },
    { query: { queryKey: ["contacts", page, search.length > 2 ? search : ""] } }
  );

  const totalPages = contactsPage ? Math.ceil(contactsPage.total / contactsPage.limit) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Contacts</h1>
          <p className="text-muted-foreground">Manage your grassroots network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <CardDescription>
              {isLoading ? "Loading…" : `${contactsPage?.total ?? 0} contacts`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : contactsPage?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-40" />
                        <p>{search ? "No contacts match your search." : "No contacts yet."}</p>
                        {!search && (
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                            <Upload className="h-3.5 w-3.5" /> Import from CSV
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  contactsPage?.data.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                        <div className="text-xs text-muted-foreground capitalize">{contact.gender ?? ""}{contact.ageGroup ? ` · ${contact.ageGroup}` : ""}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                      <TableCell>
                        <div className="text-sm">{contact.wardName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{contact.villageName ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        {contact.consentSms === true
                          ? <Badge variant="secondary" className="text-xs text-green-700 bg-green-100">Consented</Badge>
                          : <Badge variant="outline" className="text-xs text-muted-foreground">No consent</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                          {contact.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                          ))}
                          {(contact.tags?.length ?? 0) > 3 && (
                            <Badge variant="outline" className="text-[10px]">+{(contact.tags?.length ?? 0) - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <CsvImportModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

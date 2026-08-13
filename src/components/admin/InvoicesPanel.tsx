import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Download } from "lucide-react";

function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
}

export default function InvoicesPanel() {
  const [search, setSearch] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, amount, status, created_at, user_id, course_id, courses(title)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).map((p: any) => p.user_id)));
      const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : { data: [] as any[] };
      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      return (data || []).map((p: any) => ({
        invoiceNo: `INV-${p.id.slice(0, 8).toUpperCase()}`,
        student: nameMap.get(p.user_id) || "Unnamed",
        course: p.courses?.title || "Untitled course",
        amount: Number(p.amount),
        date: p.created_at,
      }));
    },
  });

  const filtered = invoices.filter((i) => !search || i.student.toLowerCase().includes(search.toLowerCase()) || i.course.toLowerCase().includes(search.toLowerCase()) || i.invoiceNo.toLowerCase().includes(search.toLowerCase()));

  const exportCsv = () => {
    const rows: (string | number)[][] = [["Invoice #", "Student", "Course", "Amount", "Date"], ...filtered.map((i) => [i.invoiceNo, i.student, i.course, i.amount, new Date(i.date).toLocaleDateString()])];
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="font-display flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Invoices</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="Search invoice, student, course…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : filtered.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.invoiceNo}>
                  <TableCell className="font-mono text-xs">{i.invoiceNo}</TableCell>
                  <TableCell>{i.student}</TableCell>
                  <TableCell>{i.course}</TableCell>
                  <TableCell className="text-right font-medium">${i.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(i.date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">No completed purchases to invoice yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

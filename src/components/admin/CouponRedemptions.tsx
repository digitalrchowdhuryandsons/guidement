import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

type Row = {
  id: string;
  amount: number;
  created_at: string;
  user_id: string;
  course_id: string;
  coupon_id: string | null;
  coupons: { code: string; discount_percent: number | null; discount_amount: number | null } | null;
  courses: { title: string } | null;
};

export default function CouponRedemptions() {
  const { data: rows } = useQuery({
    queryKey: ["coupon-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(
          "id, amount, created_at, user_id, course_id, coupon_id, coupons(code, discount_percent, discount_amount), courses(title)",
        )
        .not("coupon_id", "is", null)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Coupon Redemption History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows && rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Coupon</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Amount paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {r.coupons ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{r.coupons.code}</span>
                        <Badge variant="secondary">
                          {r.coupons.discount_percent != null
                            ? `${r.coupons.discount_percent}%`
                            : `$${Number(r.coupons.discount_amount).toFixed(2)}`}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">deleted</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {r.courses?.title ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.user_id.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(r.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">No redemptions yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

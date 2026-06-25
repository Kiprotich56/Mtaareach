import { useGetWallet, useListWalletTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

type TxType = "credit" | "debit" | string;

function TxBadge({ type }: { type: TxType }) {
  return type === "credit"
    ? <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100"><ArrowUpRight className="h-3 w-3" />Credit</Badge>
    : <Badge variant="secondary" className="gap-1 text-red-700 bg-red-100"><ArrowDownRight className="h-3 w-3" />Debit</Badge>;
}

export default function Wallet() {
  const { data: wallet, isLoading: walletLoading } = useGetWallet();
  const { data: txPage, isLoading: txLoading } = useListWalletTransactions({ page: 1, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Wallet</h1>
        <p className="text-muted-foreground">Your SMS credit balance and transaction history.</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-1 border-primary/30 bg-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <WalletIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              {walletLoading
                ? <Skeleton className="h-8 w-32 mt-1" />
                : <p className="text-2xl font-bold text-primary">KES {(wallet?.balance ?? 0).toLocaleString()}</p>
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Topped Up</p>
              {txLoading
                ? <Skeleton className="h-8 w-28 mt-1" />
                : <p className="text-2xl font-bold">
                    KES {(txPage?.data.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0) ?? 0).toLocaleString()}
                  </p>
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              {txLoading
                ? <Skeleton className="h-8 w-28 mt-1" />
                : <p className="text-2xl font-bold">
                    KES {(txPage?.data.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0) ?? 0).toLocaleString()}
                  </p>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>{txLoading ? "Loading…" : `${txPage?.total ?? 0} transactions`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount (KES)</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : txPage?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  txPage?.data.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell><TxBadge type={tx.type} /></TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${tx.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                        {tx.type === "credit" ? "+" : "-"}{tx.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {tx.balanceAfter.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}{" "}
                        <span className="text-xs">{new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

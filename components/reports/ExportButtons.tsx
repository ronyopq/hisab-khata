"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { downloadExcel } from "@/lib/export/excel";
import { toast } from "sonner";

export function ExportButtons({ rows, filename = "hisab-khata-export" }: { rows: Record<string, unknown>[]; filename?: string }) {
  const [loading, setLoading] = useState(false);

  const handleCSV = () => {
    try {
      downloadCSV(`${filename}.csv`, toCSV(rows));
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const handleExcel = async () => {
    setLoading(true);
    try {
      await downloadExcel(`${filename}.xlsx`, rows);
      toast.success("Excel downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleCSV}><Download className="h-4 w-4" /> CSV</Button>
      <Button variant="outline" onClick={handleExcel} disabled={loading}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
      <Button variant="outline" onClick={handlePDF}><FileText className="h-4 w-4" /> PDF (Print)</Button>
    </div>
  );
}

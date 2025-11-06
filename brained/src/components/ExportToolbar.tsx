import React from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { exportElementToPDF, exportRowsToCSV } from '../lib/exportUtils';

export type CsvGroup = {
  label: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  filename?: string;
};

interface ExportToolbarProps {
  targetRef?: React.RefObject<HTMLElement>;
  pdfFilename?: string;
  csvGroups?: CsvGroup[];
  size?: 'sm' | 'default';
}

const ExportToolbar: React.FC<ExportToolbarProps> = ({ targetRef, pdfFilename, csvGroups = [], size = 'default' }) => {
  const onExportPDF = async () => {
    if (!targetRef?.current) return;
    await exportElementToPDF(targetRef.current, { filename: pdfFilename });
  };

  const hasCsv = csvGroups && csvGroups.length > 0;

  return (
    <div className="flex items-center gap-2">
      {targetRef && (
        <Button variant="outline" size={size} onClick={onExportPDF}>
          <FileDown className="w-4 h-4 mr-2" /> Export PDF
        </Button>
      )}
      {hasCsv && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={size}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {csvGroups.map((g, idx) => (
              <DropdownMenuItem key={idx} onClick={() => exportRowsToCSV(g.headers, g.rows, g.filename)}>
                {g.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ExportToolbar;

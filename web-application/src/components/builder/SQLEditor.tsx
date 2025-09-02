// SQLEditor.tsx
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Download } from "lucide-react";
import { useReactTable, ColumnDef, getCoreRowModel, flexRender } from "@tanstack/react-table";

interface SQLEditorProps {
  onRunQuery?: (query: string) => Promise<any[]>;
  savedQueries?: { name: string; description: string; database: string; schema: string }[];
  history?: { query: string; executedAt: string }[];
}

const SQLEditor: React.FC<SQLEditorProps> = ({
  onRunQuery,
  savedQueries = [],
  history = [],
}) => {
  const [query, setQuery] = useState("SELECT * FROM users;");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    try {
      if (onRunQuery) {
        const result = await onRunQuery(query);
        if (result.length > 0) {
          setColumns(
            Object.keys(result[0]).map((key) => ({
              accessorKey: key,
              header: key,
            }))
          );
        }
        setData(result);
      } else {
        setError("⚠️ No query executor provided.");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query-result.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Tabs defaultValue="editor" className="w-full">
      <TabsList>
        <TabsTrigger value="saved">Saved Queries</TabsTrigger>
        <TabsTrigger value="history">Query History</TabsTrigger>
        <TabsTrigger value="editor">SQL Editor</TabsTrigger>
      </TabsList>

      {/* Saved Queries */}
      <TabsContent value="saved">
        <Card>
          <CardContent className="p-4">
            {savedQueries.length === 0 ? (
              <p className="text-gray-500">No saved queries.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Database</th>
                    <th className="text-left p-2">Schema</th>
                  </tr>
                </thead>
                <tbody>
                  {savedQueries.map((q, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{q.name}</td>
                      <td className="p-2">{q.description}</td>
                      <td className="p-2">{q.database}</td>
                      <td className="p-2">{q.schema}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Query History */}
      <TabsContent value="history">
        <Card>
          <CardContent className="p-4">
            {history.length === 0 ? (
              <p className="text-gray-500">No query history.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Query</th>
                    <th className="text-left p-2">Executed At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{h.query}</td>
                      <td className="p-2">{h.executedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* SQL Editor */}
      <TabsContent value="editor">
        <div className="grid gap-4">
          <Card>
            <CardContent className="p-2">
              <Editor
                height="200px"
                defaultLanguage="sql"
                value={query}
                onChange={(value) => setQuery(value || "")}
                theme="vs-dark"
                options={{ fontSize: 14, minimap: { enabled: false } }}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button onClick={handleRun}>Run Query</Button>
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>

          <Card>
            <CardContent className="p-4 overflow-auto">
              {error && <p className="text-red-500">❌ {error}</p>}
              {data.length > 0 ? (
                <table className="w-full text-sm border">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b">
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="p-2 text-left">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="p-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No data to display.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default SQLEditor;

"use client";

import { useState, useEffect } from 'react';
import { useRiskData } from '@/store/useRiskData';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { useAuth } from '@/store/useAuth';
import { useRouter } from 'next/navigation';

type QueryCondition = {
  id: string;
  column: string;
  operator: string;
  value: string;
  dataType: string;
  connector?: string;
};

export default function QueryBuilderPage() {
  const { data: riskData } = useRiskData();
  const [filters, setFilters] = useState<QueryCondition[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push("/login");
    }
  }, [user, profile, loading, router]);

  const isReviewer = profile?.role === 'reviewer';
  const isAssessor = profile?.role === 'assessor';
  const isAdmin = profile?.role === 'super_admin';

  // Only show data for the reviewer's department
  // (Assume useRiskData is already filtered by department for reviewer/assessor)
  const columnHeaders = riskData.length > 0 
    ? Object.keys(riskData[0]).filter(
        (header) =>
          header !== 'id' && header !== 'department_id' && header !== 'created_at'
      )
    : [];

  const operators = {
    string: ['=', '!=', 'contains', 'starts with', 'ends with', 'greater than', 'less than'],
    number: ['=', '!=', 'greater than', 'less than', 'greater than or equal to', 'less than or equal to'],
  };

  // const dataTypes = ['String', 'Number']; // Removed as it's now automated
  const logicalConnectors = ['AND', 'OR'];

  useEffect(() => {
    if (riskData.length > 0 && filters.length === 0) {
      // Optionally add default filter
    }
  }, [riskData]);

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Math.random().toString(36).substring(2, 9),
        column: columnHeaders[0] || '',
        operator: '',
        value: '',
        dataType: 'String', // Default to String, but will be updated by logic
        connector: 'AND',
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, field: string, value: string) => {
    setFilters(filters.map((f) => {
      if (f.id === id) {
        if (field === 'column') {
          // Attempt to determine data type based on column content
          const sampleValue = riskData.find(row => row[value] !== undefined)?.[value];
          const detectedDataType = typeof sampleValue === 'number' ? 'Number' : 'String';
          return { ...f, [field]: value, dataType: detectedDataType };
        }
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const executeQuery = () => {
    setQueryError(null); // Clear previous errors

    if (riskData.length === 0) {
      setFilteredResults([]);
      setQueryError('No data available to query.');
      return;
    }

    if (filters.length === 0) {
      setFilteredResults(riskData);
      return;
    }

    // Validate filters
    for (const filter of filters) {
      if (!filter.column || !filter.operator || filter.value === '') {
        setQueryError('Please ensure all filter fields (Column, Operator, Value) are filled.');
        setFilteredResults([]);
        return;
      }
    }

    let results = [...riskData];

    filters.forEach((filter, index) => {
      const { column, operator, value, dataType } = filter;
      if (!column || !operator) return;
      const currentFilterResults = riskData.filter(row => {
        let cellValue = row[column];
        if (cellValue === undefined || cellValue === null) return false;
        let parsedCellValue: any = cellValue;
        let parsedValue: any = value;
        if (dataType === 'Number') {
          parsedCellValue = parseFloat(cellValue);
          parsedValue = parseFloat(value);
        } else if (dataType === 'Date') {
          parsedCellValue = new Date(cellValue);
          parsedValue = new Date(value);
        } else if (dataType === 'Boolean') {
          parsedCellValue = String(cellValue).toLowerCase() === 'true';
          parsedValue = String(value).toLowerCase() === 'true';
        }
        switch (operator) {
          case '=':
            return parsedCellValue == parsedValue;
          case '!=':
            return parsedCellValue != parsedValue;
          case 'greater than':
            return parsedCellValue > parsedValue;
          case 'less than':
            return parsedCellValue < parsedValue;
          case 'greater than or equal to':
            return parsedCellValue >= parsedValue;
          case 'less than or equal to':
            return parsedCellValue <= parsedValue;
          case 'contains':
            return String(parsedCellValue).toLowerCase().includes(String(parsedValue).toLowerCase());
          case 'starts with':
            return String(parsedCellValue).toLowerCase().startsWith(String(parsedValue).toLowerCase());
          case 'ends with':
            return String(parsedCellValue).toLowerCase().endsWith(String(parsedValue).toLowerCase());
          default:
            return false;
        }
      });
      if (index === 0) {
        results = currentFilterResults;
      } else {
        const prevConnector = filters[index - 1].connector;
        if (prevConnector === 'AND') {
          results = results.filter((r) => currentFilterResults.includes(r));
        } else if (prevConnector === 'OR') {
          results = [...new Set([...results, ...currentFilterResults])];
        }
      }
    });
    setFilteredResults(results);
  };

  const exportToCsv = () => {
    if (filteredResults.length === 0) return;
    const headers = columnHeaders;
    const rows = filteredResults.map((row) => headers.map((header) => `${row[header] || ''}`).join(','));
    const csv = Papa.unparse(filteredResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToXlsx = () => {
    if (filteredResults.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(filteredResults);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, 'query-results.xlsx');
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Query Builder</h1>
      <p className="text-gray-700">Build custom queries to analyze your risk data</p>

      {riskData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Query Filters</h2>
          <p className="text-gray-600 mb-4">
            Use filters to construct advanced queries and extract actionable insights from your uploaded dataset.
          </p>

          {queryError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{queryError}</span>
            </div>
          )}

          <div className="space-y-4">
            {filters.map((filter, index) => (
              <div key={filter.id} className="flex items-center space-x-2">
                <select
                  className="border rounded-md p-2 flex-1 min-w-[120px]"
                  value={filter.column}
                  onChange={(e) => updateFilter(filter.id, 'column', e.target.value)}
                >
                  <option value="">Select field</option>
                  {columnHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md p-2 flex-1 min-w-[120px]"
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                >
                  <option value="">Select operator</option>
                  {filter.dataType &&
                    operators[filter.dataType.toLowerCase() as keyof typeof operators]?.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                </select>

                <input
                  type="text"
                  className="border rounded-md p-2 flex-1 min-w-[120px]"
                  placeholder="Enter value"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                />

                {/* Removed the dataType select dropdown */}
                {/*
                <select
                  className="border rounded-md p-2 flex-1 min-w-[100px]"
                  value={filter.dataType}
                  onChange={(e) => updateFilter(filter.id, 'dataType', e.target.value)}
                >
                  {dataTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                */}

                {index < filters.length - 1 ? (
                  <select
                    className="border rounded-md p-2 w-24"
                    value={filter.connector}
                    onChange={(e) => updateFilter(filter.id, 'connector', e.target.value)}
                  >
                    {logicalConnectors.map((conn) => (
                      <option key={conn} value={conn}>
                        {conn}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-24" />
                )}

                <button
                  onClick={() => removeFilter(filter.id)}
                  className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 items-center mt-6">
            <button
              onClick={addFilter}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              + Add Filter
            </button>

            <button
              onClick={executeQuery}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Execute Query
            </button>

            <button
              onClick={exportToCsv}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
              disabled={filteredResults.length === 0}
            >
              Export CSV
            </button>

            <button
              onClick={exportToXlsx}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={filteredResults.length === 0}
            >
              Export XLSX
            </button>
          </div>

          {filteredResults.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                Query Results ({filteredResults.length} rows)
              </h3>
              <div className="overflow-x-auto rounded border border-gray-300 bg-white max-h-[50vh]">
                <table className="table-auto w-full border-collapse text-sm text-left">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {columnHeaders.map((header, i) => (
                        <th
                          key={i}
                          className="p-3 border font-semibold border-gray-300 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        {columnHeaders.map((header, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-3 border border-gray-200 align-top"
                          >
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filters.length > 0 && filteredResults.length === 0 && (
            <p className="mt-8 text-center text-gray-500">No results found.</p>
          )}
        </div>
      )}

      {riskData.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
          <p>Upload a CSV in the Risk Assessment page to enable the Query Builder.</p>
        </div>
      )}
    </div>
  );
}
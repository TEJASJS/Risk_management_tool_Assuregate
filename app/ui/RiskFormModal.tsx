"use client";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useState, useEffect } from "react";
import { useRiskData } from "@/store/useRiskData";

interface RiskFormModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  selectedDepartmentId?: string | null;
}

const DROPDOWN_OPTIONS: Record<string, string[]> = {
  "Risk Owner": [
    "Admin",
    "Process Owners",
    "CISO",
    "Procurement",
    "HR",
    "IT",
    "Project Manager",
  ],
  Confidentiality: [
    "4 - Very High",
    "3 - High",
    "2 - Medium",
    "1 - Low",
  ],
  Integrity: [
    "4 - Very High",
    "3 - High",
    "2 - Medium",
    "1 - Low",
  ],
  Availability: [
    "4 - Very High",
    "3 - High",
    "2 - Medium",
    "1 - Low",
  ],
  "Vulnerability Rating": [
    "4 - No controls or serious lapses; easily exploitable.",
    "3 - Weak/outdated controls; plausible exploitation.",
    "2 - Minor gaps in controls; some risk of exploitation.",
    "1 - Effective controls; exploitation unlikely.",
  ],
  "Threat Frequency": [
    "4 - Very High: Occurs frequently (multiple times a month).",
    "3 - High: Might occur occasionally (multiple times a year).",
    "2 - Medium: Could occur sometime (once a year).",
    "1 - Low: Rare; may occur once every 2–5 years.",
  ],
  "Threat Impact": [
    "4 - Very High: Project viability threatened; legal or contractual risk.",
    "3 - High: Major delays or rework; client dissatisfaction likely.",
    "2 - Medium: Minor delays; client informed but trust remains.",
    "1 - Low: No impact on timeline or experience.",
  ],
  "Risk Treatment Option": [
    "Accept",
    "Mitigate",
    "Monitor",
    "Terminate",
    "Transfer",
  ],
};

const REQUIRED_HEADERS = [
  "Sr#",
  "Business Process",
  "Date Risk Identified",
  "Risk Description",
  "Threats",
  "Vulnerabilities",
  "Existing Controls",
  "Risk Owner",
  "Controls / Clause No",
  "ISO 27001: 2022 Controls Reference",
  "Confidentiality",
  "Integrity",
  "Availability",
  "Max CIA Value",
  "Vulnerability Rating",
  "Threat Frequency",
  "Threat Impact",
  "Threat Value",
  "Risk Value",
  "Planned Mitigation Completion Date",
  "Risk Treatment Action",
  "Revised Vulnerability Rating",
  "Revised Threat Frequency",
  "Revised Threat Impact",
  "Revised Threat Value",
  "Revised Risk Value",
  "Actual Mitigation Completion Date",
  "Risk Treatment Option",
];

export default function RiskFormModal({
  onClose,
  onSave,
  initialData = {},
  selectedDepartmentId = null,
}: RiskFormModalProps) {
  const { data } = useRiskData();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (Object.keys(formData).length === 0) {
      let allCols: string[] = [];
      
      // If we have existing data, use its structure
      if (data.length > 0) {
        const exclude = ["Max CIA Value", "Threat Value", "Risk Value", "Sr#", "id", "department_id", "Id", "Department_id", "ID", "DEPARTMENT_ID"];
        allCols = Object.keys(data[0]).filter((col) => !exclude.includes(col));
      } else {
        // If no existing data, use the REQUIRED_HEADERS
        allCols = REQUIRED_HEADERS.filter(header => 
          !["Max CIA Value", "Threat Value", "Risk Value", "Sr#", "id", "department_id", "Id", "Department_id", "ID", "DEPARTMENT_ID"].includes(header)
        );
      }
      
      setColumns(allCols);

      const initState: Record<string, any> = {};
      allCols.forEach((col) => {
        initState[col] = initialData[col] ?? "";
      });
      setFormData(initState);
    }
  }, [data, initialData]);

  const getNum = (value: any) => {
    if (typeof value === "string") {
      const num = parseInt(value.split(" - ")[0]);
      return isNaN(num) ? 0 : num;
    }
    return Number(value || 0);
  };

  const threatImpact = getNum(formData["Threat Impact"]);
  const threatFrequency = getNum(formData["Threat Frequency"]);
  const confidentiality = getNum(formData["Confidentiality"]);
  const integrity = getNum(formData["Integrity"]);
  const availability = getNum(formData["Availability"]);
  const vulnerabilityValue = getNum(formData["Vulnerability Rating"]);

  const maxCIA = Math.max(confidentiality, integrity, availability);
  const threatValue = threatImpact * threatFrequency;
  const riskValue = maxCIA * threatValue * vulnerabilityValue;

  const handleChange = (key: string, value: string) => {
    const stayString = key.toLowerCase().includes("date");
    setFormData((prev) => ({
      ...prev,
      [key]: stayString ? value : value,
    }));
  };

  const handleSubmit = () => {
    const cleanedForm: Record<string, string | number | null> = {};
    Object.entries(formData).forEach(([k, v]) => {
      if (DROPDOWN_OPTIONS[k] && v && typeof v === 'string') {
        // For dropdown values with numeric ratings, store only the number
        if (["Confidentiality", "Integrity", "Availability", "Vulnerability Rating", "Threat Frequency", "Threat Impact"].includes(k)) {
          const num = parseInt(v.split(" - ")[0]);
          cleanedForm[k] = isNaN(num) ? null : num;
        } else {
          cleanedForm[k] = v === "" || v === undefined ? null : v;
        }
      } else {
        // For numeric fields that aren't dropdowns, ensure they're proper numbers or null
        if (k === "Max CIA Value" || k === "Threat Value" || k === "Risk Value") {
          const num = Number(v);
          cleanedForm[k] = isNaN(num) ? null : num;
        } else {
          cleanedForm[k] = v === "" || v === undefined ? null : v;
        }
      }
    });

    const maxSrNo = data.length > 0
      ? Math.max(...data.map((item: any) => Number(item["Sr#"]) || 0))
      : 0;

    onSave({
      "Sr#": maxSrNo + 1,
      ...cleanedForm,
      "Max CIA Value": maxCIA,
      "Threat Value": threatValue,
      "Risk Value": riskValue,
    });

    // Clear form data
    const clearedData: Record<string, any> = {};
    columns.forEach((col) => {
      clearedData[col] = "";
    });
    setFormData(clearedData);

    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const isCSV = fileName.endsWith(".csv");

    if (!isExcel && !isCSV) {
      setUploadError("Invalid file type. Please upload an Excel or CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      let headers: string[] = [];
      if (isExcel) {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        headers = (json[0] as string[]) || [];
      } else if (isCSV) {
        const text = evt.target?.result as string;
        const parsed = Papa.parse(text, { header: false });
        headers = (parsed.data[0] as string[]) || [];
      }

      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        setUploadError(`Cannot upload file. Missing columns: [${missing.map((m) => `"${m}"`).join(", ")}]`);
        return;
      }

      setUploadError(null);
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  if (columns.length === 0) return null;

  const triggerField = "Planned Mitigation Completion Date";
  const alwaysShowField = "Risk Treatment Option";

  const triggerIdx = columns.indexOf(triggerField);
  const alwaysShowIdx = columns.indexOf(alwaysShowField);
  const showAllFields = formData[triggerField]?.toString().trim() !== "";

  let visibleFields: string[] = [];

  if (columns.length > 0) {
    if (showAllFields) {
      visibleFields = [...columns];
    } else {
      visibleFields = columns.slice(0, triggerIdx + 1);
    }

    if (alwaysShowIdx !== -1 && !visibleFields.includes(alwaysShowField)) {
      visibleFields.push(alwaysShowField);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 fade-in">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-slate-900">
            {initialData && Object.keys(initialData).length ? "Edit Risk Assessment" : "Create New Risk Assessment"}
          </h2>
          <p className="text-slate-600 mt-1">
            {initialData && Object.keys(initialData).length ? "Update the risk details below" : "Fill in the details to create a new risk assessment"}
          </p>
        </div>

        {/* File Upload */}
        <div className="p-6 pt-4">
          <label className="block text-sm font-semibold mb-1 text-slate-700">Upload Excel/CSV</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="block text-sm text-slate-600" />
          {uploadError && (
            <div className="mt-2 text-red-600 font-semibold border border-red-300 bg-red-50 p-2 rounded">
              {uploadError}
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-260px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleFields.map((col) => (
              <div key={col} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  {col}
                  {col === "Risk Owner" && <span className="text-red-500 ml-1">*</span>}
                </label>

                {DROPDOWN_OPTIONS[col] ? (
                  <select
                    value={formData[col] || ""}
                    onChange={(e) => handleChange(col, e.target.value)}
                    className="form-select"
                  >
                    <option value="" disabled>Select {col}</option>
                    {DROPDOWN_OPTIONS[col].map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : col.toLowerCase().includes("date") ? (
                  <input
                    type="date"
                    className="form-input"
                    value={formData[col] || ""}
                    onChange={(e) => handleChange(col, e.target.value)}
                  />
                ) : (
                  <input
                    type={typeof formData[col] === "number" ? "number" : "text"}
                    className="form-input"
                    value={formData[col] || ""}
                    onChange={(e) => handleChange(col, e.target.value)}
                    placeholder={`Enter ${col.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Calculated Values */}
          {(maxCIA > 0 || threatValue > 0 || riskValue > 0) && (
            <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Calculated Values</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{maxCIA}</div>
                  <div className="text-sm text-slate-600">Max CIA Value</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{threatValue}</div>
                  <div className="text-sm text-slate-600">Threat Value</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{riskValue}</div>
                  <div className="text-sm text-slate-600">Risk Value</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 p-6 border-t border-gray-200 bg-slate-50">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">
            {initialData && Object.keys(initialData).length ? "Update Risk" : "Create Risk"}
          </button>
        </div>
      </div>
    </div>
  );
}
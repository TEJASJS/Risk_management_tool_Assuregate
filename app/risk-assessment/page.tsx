"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import ExcelJS from 'exceljs';
import { useState, useEffect, useRef } from "react";
import { useRiskData } from "@/store/useRiskData";
import Search from "@/app/ui/search";
import RiskFormModal from "@/app/ui/RiskFormModal";
import SaveRiskModal from "@/app/ui/SaveRiskModal";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { mapDbColumnsToCsvData } from "@/lib/headerMapping";
import { sanitizeDataForSupabase, getColumnMapping } from "@/lib/columnSanitizer";
import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";

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

const EXAMPLE_DATA = [
  {
    "Sr#": 1,
    "Business Process": "Offboarding",
    "Date Risk Identified": "",
    "Risk Description": "Poor record management",
    "Threats": "Lack of operating procedures and asset protection",
    "Vulnerabilities": "Business disruption",
    "Existing Controls": "Documented operating procedures, handling of assets",
    "Risk Owner": "IT",
    "Controls / Clause No": "A.5.19",
    "ISO 27001: 2022 Controls Reference": "Information Security in Supplier Relationships",
    "Confidentiality": 1,
    "Integrity": 2,
    "Availability": 4,
    "Max CIA Value": 4,
    "Vulnerability Rating": 1,
    "Threat Frequency": 1,
    "Threat Impact": 2,
    "Threat Value": 2,
    "Risk Value": 8,
    "Planned Mitigation Completion Date": "",
    "Risk Treatment Action": "",
    "Revised Vulnerability Rating": "",
    "Revised Threat Frequency": "",
    "Revised Threat Impact": "",
    "Revised Threat Value": "",
    "Revised Risk Value": "",
    "Actual Mitigation Completion Date": "",
    "Risk Treatment Option": "Accept"
  },
  {
    "Sr#": 2,
    "Business Process": "Training",
    "Date Risk Identified": "",
    "Risk Description": "Insufficient skills in crisis",
    "Threats": "Inadequate cross-training programs",
    "Vulnerabilities": "Skill gaps hindering operational recovery",
    "Existing Controls": "Cross-train employees for critical roles",
    "Risk Owner": "HR",
    "Controls / Clause No": "A.5.19",
    "ISO 27001: 2022 Controls Reference": "Information Security in Supplier Relationships",
    "Confidentiality": 1,
    "Integrity": 2,
    "Availability": 3,
    "Max CIA Value": 3,
    "Vulnerability Rating": 1,
    "Threat Frequency": 1,
    "Threat Impact": 2,
    "Threat Value": 2,
    "Risk Value": 6,
    "Planned Mitigation Completion Date": "",
    "Risk Treatment Action": "",
    "Revised Vulnerability Rating": "",
    "Revised Threat Frequency": "",
    "Revised Threat Impact": "",
    "Revised Threat Value": "",
    "Revised Risk Value": "",
    "Actual Mitigation Completion Date": "",
    "Risk Treatment Option": "Accept"
  },
  {
    "Sr#": 3,
    "Business Process": "Operations",
    "Date Risk Identified": "",
    "Risk Description": "Equipment failure",
    "Threats": "Lack of in-house support team",
    "Vulnerabilities": "Business disruption due to equipment failure",
    "Existing Controls": "Equipment maintenance",
    "Risk Owner": "IT",
    "Controls / Clause No": "A.5.29",
    "ISO 27001: 2022 Controls Reference": "Information Security During Disruption",
    "Confidentiality": 1,
    "Integrity": 2,
    "Availability": 4,
    "Max CIA Value": 4,
    "Vulnerability Rating": 1,
    "Threat Frequency": 1,
    "Threat Impact": 2,
    "Threat Value": 2,
    "Risk Value": 8,
    "Planned Mitigation Completion Date": "",
    "Risk Treatment Action": "",
    "Revised Vulnerability Rating": "",
    "Revised Threat Frequency": "",
    "Revised Threat Impact": "",
    "Revised Threat Value": "",
    "Revised Risk Value": "",
    "Actual Mitigation Completion Date": "",
    "Risk Treatment Option": "Accept"
  },
  {
    "Sr#": 4,
    "Business Process": "Onboarding",
    "Date Risk Identified": "",
    "Risk Description": "Security misconfiguration",
    "Threats": "Human error",
    "Vulnerabilities": "Lack of access control validation",
    "Existing Controls": "Implement role-based access controls and validation",
    "Risk Owner": "IT",
    "Controls / Clause No": "A.7.11",
    "ISO 27001: 2022 Controls Reference": "Supporting Utilities",
    "Confidentiality": 2,
    "Integrity": 2,
    "Availability": 2,
    "Max CIA Value": 2,
    "Vulnerability Rating": 2,
    "Threat Frequency": 1,
    "Threat Impact": 1,
    "Threat Value": 1,
    "Risk Value": 4,
    "Planned Mitigation Completion Date": "",
    "Risk Treatment Action": "",
    "Revised Vulnerability Rating": "",
    "Revised Threat Frequency": "",
    "Revised Threat Impact": "",
    "Revised Threat Value": "",
    "Revised Risk Value": "",
    "Actual Mitigation Completion Date": "",
    "Risk Treatment Option": "Accept"
  },
  {
    "Sr#": 5,
    "Business Process": "Operations",
    "Date Risk Identified": "",
    "Risk Description": "Data breach through removable media or insecure channels",
    "Threats": "Data theft/leakage",
    "Vulnerabilities": "Lack of USB/email/information exchange controls",
    "Existing Controls": "Information transfer policies and procedures",
    "Risk Owner": "IT",
    "Controls / Clause No": "A.5.19",
    "ISO 27001: 2022 Controls Reference": "Information Security in Supplier Relationships",
    "Confidentiality": 2,
    "Integrity": 2,
    "Availability": 2,
    "Max CIA Value": 2,
    "Vulnerability Rating": 2,
    "Threat Frequency": 1,
    "Threat Impact": 1,
    "Threat Value": 1,
    "Risk Value": 4,
    "Planned Mitigation Completion Date": "",
    "Risk Treatment Action": "",
    "Revised Vulnerability Rating": "",
    "Revised Threat Frequency": "",
    "Revised Threat Impact": "",
    "Revised Threat Value": "",
    "Revised Risk Value": "",
    "Actual Mitigation Completion Date": "",
    "Risk Treatment Option": "Accept"
  }
];

function fuzzyMatch(required: string, actualHeaders: string[]) {
  const reqWords = required.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(' ').filter(Boolean);
  for (const actual of actualHeaders) {
    const actualNorm = actual.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
    if (reqWords.every(word => actualNorm.includes(word))) {
      return actual;
    }
  }



  return null;
}


function isDuplicateRow(rowA: any, rowB: any) {
  const keysA = Object.keys(rowA).filter(k => k !== "Sr#");
  const keysB = Object.keys(rowB).filter(k => k !== "Sr#");
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => rowA[key] === rowB[key]);
}

export default function RiskAssessmentPage() {
  const router = useRouter();
  const { setData, data: storeData } = useRiskData();
  const [localData, setLocalData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadMode, setUploadMode] = useState("replace");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Record<string, any> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [duplicateRows, setDuplicateRows] = useState<Record<string, any>[]>([]);
  const [duplicateInfo, setDuplicateInfo] = useState<{ duplicates: number; added: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string>("");
  const [originalData, setOriginalData] = useState<Record<string, any>[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const { user, profile, loading } = useAuth();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push("/login");
    }
  }, [user, profile, loading, router]);

  // Fetch risks based on user role and department
  useEffect(() => {
    const fetchRiskData = async () => {
      if (!profile) return;

      let currentDepartmentId = null;
      console.log('Profile:', profile);
      console.log('Profile Department ID:', profile.department_id);
      let currentDepartmentName = "";

      if (profile.role === "super_admin") {
        // Super Admin: can view all risks, or filter by department from URL
        const params = new URLSearchParams(window.location.search);
        currentDepartmentId = params.get('department');
        if (currentDepartmentId) {
          const { data: departmentData } = await supabase
            .from('departments')
            .select('name')
            .eq('id', currentDepartmentId)
            .single();
          if (departmentData) currentDepartmentName = departmentData.name;
        }
      } else if (profile.role === "department_head" || profile.role === "assessor" || profile.role === "reviewer") {
        // Department Head, Assessor, Reviewer: only their assigned department
        currentDepartmentId = profile.department_id;
        if (currentDepartmentId) {
          const { data: departmentData } = await supabase
            .from('departments')
            .select('name')
            .eq('id', currentDepartmentId)
            .single();
          if (departmentData) currentDepartmentName = departmentData.name;
        }
      }

      // Fetch all departments for super admin fallback
      const { data: allDepartments, error: deptError } = await supabase
        .from('departments')
        .select('id, name');
      if (deptError) {
        console.error("Error fetching departments:", deptError);
      } else {
        setDepartments(allDepartments || []);
      }

      setSelectedDepartment(currentDepartmentId);
      setDepartmentName(currentDepartmentName);

      let query = supabase.from('risks').select('*').order('sr_no');

      if (currentDepartmentId) {
        query = query.eq('department_id', currentDepartmentId);
      } else if (profile.role !== "super_admin") {
        // If not super_admin and no department_id, clear data
        setLocalData([]);
        setData([]);
        setHeaders(REQUIRED_HEADERS);
        setOriginalData([]);
        return;
      }

      const { data: riskData, error } = await query;

      if (error) {
        console.error("Error fetching risks:", error);
        setLocalData([]);
        setData([]);
        setHeaders(REQUIRED_HEADERS);
        setOriginalData([]);
        return;
      }

      if (riskData && riskData.length > 0) {
        const mappedData = riskData.map(item => mapDbColumnsToCsvData(item));
        setLocalData(mappedData);
        setData(mappedData);
        setHeaders(Object.keys(mappedData[0] || {}));
        setOriginalData([...mappedData]);
      } else {
        setLocalData([]);
        setData([]);
        setHeaders(REQUIRED_HEADERS);
        setOriginalData([]);
      }
    }
    if (!loading && profile) fetchRiskData();
    // eslint-disable-next-line
  }, [profile, loading, typeof window !== 'undefined' ? window.location.search : '']);

  const isSuperAdmin = profile?.role === "super_admin";
  const isDepartmentHead = profile?.role === "department_head";
  const isAssessor = profile?.role === "assessor";
  const isReviewer = profile?.role === "reviewer";

  const filteredData = localData.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Filter headers to exclude ID fields and created_at
  const displayHeaders = headers.filter(header =>
    !['id', 'department_id', 'Id', 'Department_id', 'ID', 'DEPARTMENT_ID', 'created_at', 'Created_at', 'CREATED_AT'].includes(header)
  );

  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (storeData.length > 0 && localData.length === 0) {
      setLocalData(storeData);
      setHeaders(Object.keys(storeData[0] || {}));
    }
  }, [storeData]);

  const getNextSrNumber = () => {
    const srValues = localData.map(item => parseInt(item["Sr#"]) || 0);
    return srValues.length ? Math.max(...srValues) + 1 : 1;
  }

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Risk Assessment Template");

    // Add headers
    worksheet.columns = REQUIRED_HEADERS.map((header) => ({
      header: header,
      key: header,
      width: 20,
    }));

    // Add example data
    EXAMPLE_DATA.forEach((data) => {
      worksheet.addRow(data);
    });

    // Generate Excel file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "risk_assessment_template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only Super Admin, Department Head, and Assessor can upload files
    if (!isSuperAdmin && !isDepartmentHead && profile?.role !== 'assessor') {
      setUploadError("You do not have permission to upload files.");

      // Auto-dismiss error after 5 seconds
      setTimeout(() => {
        setUploadError(null);
      }, 5000);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setUploadError("Invalid file type. Please upload a CSV or Excel file.");

      // Auto-dismiss error after 5 seconds
      setTimeout(() => {
        setUploadError(null);
      }, 5000);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const processData = (parsed: Record<string, any>[]) => {
      const keys = Object.keys(parsed[0] || {});
      const missing = REQUIRED_HEADERS.filter(req => !fuzzyMatch(req, keys));
      if (missing.length > 0) {
        setUploadError(`Cannot upload file. Missing columns: [${missing.map(m => `"${m}"`).join(", ")}]`);

        // Auto-dismiss error after 5 seconds
        setTimeout(() => {
          setUploadError(null);
        }, 5000);
        return;
      }

      setUploadError(null);

      // Process rows based on risk_owner column
      let processedRows = parsed;

      // Find the risk_owner column (might be different casing)
      const riskOwnerKey = keys.find(key => key.toLowerCase() === 'risk owner') || 'Risk Owner';

      // If not super_admin, validate risk_owner against user's department name
      if (profile?.role !== 'super_admin' && departmentName) {
        const nonMatchingRows = parsed.filter(row => {
          const rowRiskOwner = row[riskOwnerKey];
          return rowRiskOwner && rowRiskOwner.toLowerCase() !== departmentName.toLowerCase();
        });

        if (nonMatchingRows.length > 0) {
          setUploadError("Some risks in the file do not belong to your department and were not added.");
          setTimeout(() => {
            setUploadError(null);
          }, 5000);
        }
        processedRows = parsed.filter(row => {
          const rowRiskOwner = row[riskOwnerKey];
          return !rowRiskOwner || rowRiskOwner.toLowerCase() === departmentName.toLowerCase();
        });
      } else if (profile?.role !== 'super_admin' && !departmentName) {
        // If not super_admin and no department name, prevent upload
        setUploadError("Cannot upload file. Your department name is not set, which is required for risk owner assignment.");
        setTimeout(() => {
          setUploadError(null);
        }, 5000);
        return;
      }

      // Continue with processed rows
      if (!processedRows[0]?.["Sr#"]) {
        processedRows = processedRows.map((row, idx) => ({
          ...row,
          ["Sr#"]: (uploadMode === "append" ? getNextSrNumber() + idx : idx + 1).toString(),
        }));
      } else if (uploadMode === "append") {
        const offset = getNextSrNumber();
        processedRows = processedRows.map((row, idx) => ({
          ...row,
          ["Sr#"]: (offset + idx).toString(),
        }));
      }

      if (uploadMode === "append") {
        const existingRows = localData;
        const newRows: Record<string, any>[] = [];
        const duplicates: Record<string, any>[] = [];

        processedRows.forEach(row => {
          const isDuplicate = existingRows.some(existing => isDuplicateRow(existing, row));
          if (isDuplicate) {
            duplicates.push(row);
          } else {
            newRows.push(row);
          }
        });

        if (duplicates.length > 0) {
          setDuplicateRows(duplicates);
          setDuplicateInfo({ duplicates: duplicates.length, added: newRows.length });

          // Auto-dismiss duplicate info notification after 5 seconds
          setTimeout(() => {
            setDuplicateRows([]);
            setDuplicateInfo(null);
          }, 5000);
        } else {
          setDuplicateRows([]);
          setDuplicateInfo(null);
        }

        const offset = getNextSrNumber();
        const newRowsWithSr = newRows.map((row, idx) => ({
          ...row,
          ["Sr#"]: (offset + idx).toString(),
        }));
        const updatedData = [...existingRows, ...newRowsWithSr];
        setHeaders(Object.keys(updatedData[0] || {}));
        setLocalData(updatedData);
        setData(updatedData);
      } else {
        setDuplicateRows([]);
        setDuplicateInfo(null);
        setHeaders(Object.keys(processedRows[0] || {}));
        setLocalData(processedRows);
        setData(processedRows);
      }

      setCurrentPage(1);
    }

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const parsed = XLSX.utils.sheet_to_json(worksheet);
          processData(parsed as Record<string, any>[]);
        } catch (error) {
          setUploadError("Error reading Excel file. Please check the file format.");

          // Auto-dismiss error after 5 seconds
          setTimeout(() => {
            setUploadError(null);
          }, 5000);
        }
      }; // Closing brace for the catch block
      reader.readAsArrayBuffer(file);
    } else if (isCSV) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data as Record<string, any>[]);
        }
      });
    }
  }
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDeleteCSV = () => {
    // Show confirmation dialog
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      // First, determine the department ID based on user role
      let departmentId = selectedDepartment;

      // For assessors and department heads, use their assigned department
      if ((profile?.role === 'assessor' || profile?.role === 'department_head') && profile?.department_id) {
        departmentId = profile.department_id;
      } else if (profile?.role === 'super_admin') {
        for (const dept of departments) {
          const { error: deleteError } = await supabase
            .from('risks')
            .delete()
            .eq('department_id', dept.id);

          if (deleteError) {
            console.error('Error deleting risks:', deleteError);
            throw deleteError;
          }
        }
      }

      // Delete data from database for the current login's department
      if (departmentId) {
        const { error: deleteError } = await supabase
          .from('risks')
          .delete()
          .eq('department_id', departmentId);

        if (deleteError) {
          console.error('Error deleting risks from database:', deleteError);
          throw deleteError;
        }
      }

      // Clear local data
      setLocalData([]);
      setData([]);
      setHeaders([]);
      setCurrentPage(1);
      // Reset file input after successful processing
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Hide after 3 seconds

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error('Error during delete operation:', error);
      // Close confirmation dialog even if there's an error
      setShowDeleteConfirmation(false);
    }
  };

  const cancelDelete = () => {
    // Close confirmation dialog without deleting
    setShowDeleteConfirmation(false);
  };

  const cancelSave = () => {
    // Close confirmation dialog without saving
    setShowSaveConfirmation(false);
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) return;

    // Prepare filename with department name if available
    let filename = "risk_assessment";
    if (departmentName) {
      filename += `_${departmentName.replace(/\s+/g, '_').toLowerCase()}`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.csv`;

    // Filter out any internal fields before export
    const exportData = filteredData.map(row => {
      const filteredRow = { ...row };
      // Remove internal fields
      ['id', 'Id', 'ID', 'department_id', 'created_at', 'updated_at'].forEach(field => {
        delete filteredRow[field];
      });
      return filteredRow;
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    setExportSuccess(`CSV exported successfully (${exportData.length} records)`);
    setTimeout(() => setExportSuccess(null), 3000); // Hide after 3 seconds
  };

  // Add Excel export functionality
  const exportToExcel = () => {
    if (filteredData.length === 0) return;

    // Prepare filename with department name if available
    let filename = "risk_assessment";
    if (departmentName) {
      filename += `_${departmentName.replace(/\s+/g, '_').toLowerCase()}`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Filter out any internal fields before export
    const exportData = filteredData.map(row => {
      const filteredRow = { ...row };
      // Remove internal fields
      ['id', 'Id', 'ID', 'department_id', 'created_at', 'updated_at'].forEach(field => {
        delete filteredRow[field];
      });
      return filteredRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Risks");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, filename);

    // Show success message
    setExportSuccess(`Excel exported successfully (${exportData.length} records)`);
    setTimeout(() => setExportSuccess(null), 3000); // Hide after 3 seconds
  };

  // State for save confirmation dialog
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Function to handle direct saving - now shows confirmation dialog first
  const handleDirectSave = () => {
    // Show confirmation dialog
    setShowSaveConfirmation(true);
  };

  // Function to confirm save after confirmation dialog
  const confirmSave = async () => {
    try {
      // Determine the department ID based on user role
      let departmentId = selectedDepartment;

      // For assessors and department heads, use their assigned department
      if ((profile?.role === 'assessor' || profile?.role === 'department_head') && profile?.department_id) {
        departmentId = profile.department_id;
      } else if (!departmentId && departments.length > 0) {
        // For super admins with no selected department, use the first available department
        departmentId = departments[0].id;
      }

      if (!departmentId) {
        // If no department is available, show the modal as fallback
        setShowSaveModal(true);
        setShowSaveConfirmation(false);
        return;
      }

      // Sanitize the risk data for Supabase compatibility
      const sanitizedRiskData = sanitizeDataForSupabase(localData);

      // For super admin, ensure each risk gets the correct department ID based on risk owner
      const risksToProcess = sanitizedRiskData.map(risk => {
        // If super admin and risk has a risk_owner field
        if (profile?.role === 'super_admin' && risk.risk_owner) {
          // Try to find a department that matches the risk owner's department
          const ownerDepartment = departments.find(dept =>
            risk.risk_owner.toLowerCase().includes(dept.name.toLowerCase())
          );

          // If found a matching department, use that department's ID
          if (ownerDepartment) {
            return {
              ...risk,
              department_id: ownerDepartment.id
            };
          }
        }

        // Default case: use the selected department ID
        return {
          ...risk,
          department_id: departmentId
        };
      });

      // Separate risks with IDs (existing) from those without (new)
      const existingRisks = risksToProcess.filter(risk => risk.id);
      const newRisks = risksToProcess.filter(risk => !risk.id);

      // Find deleted risks by comparing original data with current data
      // Only consider risks that have IDs (were previously in the database)
      const originalRiskIds = originalData
        .filter(risk => risk.id)
        .map(risk => risk.id);

      const currentRiskIds = existingRisks.map(risk => risk.id);

      // Determine which risks have been deleted (in original but not in current)
      const deletedRiskIds = originalRiskIds.filter(
        id => !currentRiskIds.includes(id)
      );

      // Delete risks that have been removed in the UI
      if (deletedRiskIds.length > 0) {
        for (const id of deletedRiskIds) {
          const { error: deleteError } = await supabase
            .from('risks')
            .delete()
            .eq('id', id);

          if (deleteError) {
            console.error('Error deleting risk:', deleteError);
            throw deleteError;
          }
        }
      }

      // Update existing risks individually (not in bulk)
      for (const risk of existingRisks) {
        const { error: updateError } = await supabase
          .from('risks')
          .update(risk)
          .eq('id', risk.id);

        if (updateError) {
          console.error('Error updating risk:', updateError);
          throw updateError;
        }
      }

      // Insert new risks if any
      if (newRisks.length > 0) {
        const { error: insertError } = await supabase
          .from('risks')
          .insert(newRisks);

        if (insertError) {
          console.error('Error inserting new risks:', insertError);
          throw insertError;
        }
      }

      // Show success message
      setSaveSuccess(true);

      // Close the confirmation dialog
      setShowSaveConfirmation(false);

      // Refresh data from database to show updated state
      if (departmentId) {
        try {
          const { data: riskData } = await supabase
            .from('risks')
            .select('*')
            .eq('department_id', departmentId)
            .order('sr_no');

          if (riskData && riskData.length > 0) {
            const mappedData = riskData.map(item => mapDbColumnsToCsvData(item));
            setLocalData(mappedData);
            setData(mappedData);
            setHeaders(Object.keys(mappedData[0]));
            setOriginalData(mappedData); // Update original data
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      }

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error saving risks:', error);
      // Close the confirmation dialog
      setShowSaveConfirmation(false);
      // If direct save fails, show the modal as fallback
      setShowSaveModal(true);
    }
  };



  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Risk Assessment</h1>
          {selectedDepartment && departmentName ? (
            <div className="flex items-center">
              <p className="text-slate-600">Viewing risks for department: </p>
              <span className="ml-1 font-semibold text-blue-600">{departmentName}</span>
              <button
                onClick={() => {
                  setSelectedDepartment(null);
                  setDepartmentName("");
                  router.push('/risk-assessment');
                }}
                className="ml-2 text-xs text-blue-500 hover:text-blue-700 underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <p className="text-slate-600">Manage and evaluate organizational risks</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Total Records:</span>
          <span className="font-semibold text-slate-700">{filteredData.length}</span>
        </div>
      </div>

      <div className="p-4 lg:p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-4">
        {/* Success Messages */}
        {saveSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded relative mb-4" role="alert">
            <span className="block sm:inline">Data cleared successfully!</span>
          </div>
        )}

        {exportSuccess && (
          <div className="fixed bottom-4 right-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-md z-50 fade-in">
            <div className="flex items-center">
              <div className="py-1">
                <svg className="h-6 w-6 text-blue-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold">Export Successful</p>
                <p className="text-sm">{exportSuccess}</p>
              </div>
              <div className="ml-auto">
                <button
                  className="text-blue-700 hover:text-blue-900"
                  onClick={() => setExportSuccess(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{uploadError}</span>
          </div>
        )}

        <div className="w-full">
          <Search value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 lg:gap-3 items-center justify-between">
          {(isSuperAdmin || isDepartmentHead || isAssessor) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm w-full sm:w-auto"
              suppressHydrationWarning={true}
            >
              + Create Risk
            </button>
          )}

          <div className="flex flex-wrap gap-2 lg:gap-3 items-center w-full sm:w-auto">
            {(isSuperAdmin || isDepartmentHead || isAssessor) && localData.length > 0 && (
              <div className="flex gap-2 items-center text-xs lg:text-sm">
                <span className="text-slate-700 font-medium hidden lg:inline">Upload Mode:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors hover:bg-gray-200">
                    <input
                      type="radio"
                      name="uploadMode"
                      value="replace"
                      checked={uploadMode === 'replace'}
                      onChange={() => setUploadMode('replace')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-xs font-medium ${uploadMode === 'replace' ? 'text-blue-600' : 'text-gray-600'}`}>Replace</span>
                  </label>
                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors hover:bg-gray-200">
                    <input
                      type="radio"
                      name="uploadMode"
                      value="append"
                      checked={uploadMode === 'append'}
                      onChange={() => setUploadMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-xs font-medium ${uploadMode === 'append' ? 'text-blue-600' : 'text-gray-600'}`}>Append</span>
                  </label>
                </div>
              </div>
            )}

            <Button
              onClick={handleDownloadTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 lg:px-4 rounded text-sm"
            >
              <span className="hidden lg:inline">Download Template</span>
              <span className="lg:hidden">Template</span>
            </Button>

            {(isSuperAdmin || isDepartmentHead || isAssessor) && (
              <label className="btn-secondary cursor-pointer text-sm">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="hidden lg:inline">📁 Upload CSV/Excel</span>
                <span className="lg:hidden">📁 Upload</span>
              </label>
            )}

            {(isSuperAdmin || isDepartmentHead || isAssessor) ? (
              <button onClick={handleDeleteCSV} className="btn-danger text-sm" disabled={localData.length === 0}>
                <span className="hidden lg:inline">🗑️ Delete CSV</span>
                <span className="lg:hidden">🗑️ Delete</span>
              </button>
            ) : null}

            <div className="flex gap-2">
              <button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 lg:px-4 rounded text-sm" disabled={filteredData.length === 0}>
                <span className="hidden lg:inline">Export CSV</span>
                <span className="lg:hidden">CSV</span>
              </button>
              <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 lg:px-4 rounded text-sm" disabled={filteredData.length === 0}>
                <span className="hidden lg:inline">Export Excel</span>
                <span className="lg:hidden">Excel</span>
              </button>
            </div>
            {(isSuperAdmin || isDepartmentHead || isAssessor) && (
              <button
                onClick={handleDirectSave} // Changed from setShowSaveModal(true) to handleDirectSave
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 lg:px-4 rounded text-sm"
                disabled={filteredData.length === 0}
              >
                <span className="hidden lg:inline">Save to Database</span>
                <span className="lg:hidden">Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="relative">
          {/* Risk Level Legend */}
          <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Risk Value Legend</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>1-16 Negligible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>17-64 Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>65-128 Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>129-192 High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded"></div>
                <span>193-256 Very High</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
              <table className="w-full text-sm text-left table-fixed">
                <thead className="sticky top-0 bg-blue-600 text-white z-10">
                  <tr>
                    {displayHeaders.map((header, i) => {
                      // Define responsive column widths based on content importance
                      let colWidth = "w-24"; // default
                      if (header === "Sr#") colWidth = "w-16";
                      else if (header === "Business Process") colWidth = "w-40 lg:w-48";
                      else if (header === "Risk Description") colWidth = "w-48 lg:w-64";
                      else if (header === "Date Risk Identified") colWidth = "w-32";
                      else if (header === "Risk Value") colWidth = "w-20";
                      else if (header === "Risk Treatment Option") colWidth = "w-32";
                      else if (header.includes("Threat") || header.includes("Vulnerability")) colWidth = "w-24";

                      return (
                        <th key={i} className={`px-2 py-3 font-semibold text-white border-r border-blue-500 last:border-r-0 ${colWidth}`}>
                          <div className="truncate" title={header}>{header}</div>
                        </th>
                      );
                    })}
                    <th className="px-2 py-3 font-semibold text-white w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 border-b border-gray-200">
                      {displayHeaders.map((header, colIdx) => {
                        const cellValue = row[header] || "-";
                        let cellClass = "px-2 py-3 text-slate-700 border-r border-gray-100 last:border-r-0";

                        // Apply color coding for Risk Value column
                        if (header === "Risk Value" && cellValue !== "-") {
                          const riskValue = Number(cellValue);
                          if (riskValue >= 1 && riskValue <= 16) {
                            cellClass += " bg-green-100 text-green-800 font-medium";
                          } else if (riskValue >= 17 && riskValue <= 64) {
                            cellClass += " bg-yellow-100 text-yellow-800 font-medium";
                          } else if (riskValue >= 65 && riskValue <= 128) {
                            cellClass += " bg-orange-100 text-orange-800 font-medium";
                          } else if (riskValue >= 129 && riskValue <= 192) {
                            cellClass += " bg-red-100 text-red-800 font-medium";
                          } else if (riskValue >= 193 && riskValue <= 256) {
                            cellClass += " bg-purple-100 text-purple-800 font-medium";
                          }
                        }

                        return (
                          <td key={colIdx} className={cellClass}>
                            <div className="truncate" title={cellValue}>
                              {cellValue}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          {(isSuperAdmin || isDepartmentHead || isAssessor) && ( // Only super_admin, department_head, and assessor can edit risks
                            <button
                              className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                              onClick={() => {
                                setEditingRisk(row);
                                setShowEditModal(true);
                              }}
                              title="Edit Risk"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {(isSuperAdmin || isDepartmentHead || isAssessor) && ( // Only super_admin, department_head, and assessor can delete risks
                            <button
                              className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                              onClick={() => {
                                // Calculate the actual index in the full dataset
                                const actualIndex = localData.findIndex(item => item["Sr#"] === row["Sr#"]);

                                if (actualIndex !== -1) {
                                  // Remove the item from local data
                                  let updated = localData.filter((_, i) => i !== actualIndex);

                                  // Recalculate serial numbers for all items to be consecutive
                                  updated = updated.map((item, idx) => ({
                                    ...item,
                                    "Sr#": (idx + 1).toString()
                                  }));

                                  setLocalData(updated);
                                  setData(updated);

                                  // If we're on a page that no longer has data, go to previous page
                                  const newTotalPages = Math.ceil(updated.length / ITEMS_PER_PAGE);
                                  if (currentPage > newTotalPages && newTotalPages > 0) {
                                    setCurrentPage(newTotalPages);
                                  }
                                }

                                // Note: Database changes will be applied when user clicks "Save to Database"
                              }}
                              title="Delete Risk"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - Fixed at bottom with horizontal scroll */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 sticky bottom-0">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length} results
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white text-gray-700 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded border transition-colors ${currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white text-gray-700 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredData.length === 0 && localData.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
          <p className="text-slate-500">Upload a CSV or Excel file or create your first risk assessment to get started.</p>
          {(isSuperAdmin || isDepartmentHead || isAssessor) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
              suppressHydrationWarning={true}
            >
              Create Your First Risk
            </button>
          )}
        </div>
      )}

      {filteredData.length === 0 && localData.length > 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
          <p className="text-slate-500">Try adjusting your search criteria.</p>
        </div>
      )}

      {showCreateModal && (
        <RiskFormModal
          onClose={() => setShowCreateModal(false)}
          selectedDepartmentId={selectedDepartment}
          onSave={(newRisk) => {
            const srNumber = getNextSrNumber();
            const riskWithMetadata = {
              ...newRisk,
              ["Sr#"]: srNumber.toString(),
              // Don't add database ID for new risks - let the database generate it
              ...(selectedDepartment && { department_id: selectedDepartment })
            };

            const updated = [...localData, riskWithMetadata];
            setLocalData(updated);
            setData(updated);

            // Note: Database changes will be applied when user clicks "Save to Database"
          }}
        />
      )}

      {showEditModal && editingRisk && (
        <RiskFormModal
          initialData={editingRisk}
          selectedDepartmentId={selectedDepartment}
          onClose={() => {
            setEditingRisk(null);
            setShowEditModal(false);
          }}
          onSave={(updatedRisk) => {
            // Preserve the original ID and other metadata when updating
            const riskId = editingRisk.id || editingRisk.Id || editingRisk.ID;
            const updatedRiskWithMetadata = {
              ...updatedRisk,
              ...(riskId && { id: riskId }), // Preserve the database ID
              "Sr#": editingRisk["Sr#"], // Keep the same serial number
              ...(selectedDepartment && { department_id: selectedDepartment })
            };

            // Find and update the exact row
            const index = localData.findIndex((r) => r["Sr#"] === editingRisk["Sr#"]);
            if (index !== -1) {
              const updated = [...localData];
              updated[index] = updatedRiskWithMetadata;
              setLocalData(updated);
              setData(updated);
            }

            // Note: Database changes will be applied when user clicks "Save to Database"
          }}
        />
      )}

      {uploadError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md z-50 fade-in">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Upload Error</p>
              <p className="text-sm">{uploadError}</p>
            </div>
            <div className="ml-auto">
              <button
                className="text-red-700 hover:text-red-900"
                onClick={() => setUploadError(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateRows.length > 0 && duplicateInfo && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md z-50 fade-in">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Duplicate Entries Found</p>
              <p className="text-sm">
                <span className="font-semibold text-yellow-700">{duplicateInfo.duplicates}</span> duplicate row(s) were skipped.
                <span className="font-semibold text-green-700 ml-1">{duplicateInfo.added}</span> new row(s) were added.
              </p>
            </div>
            <div className="ml-auto">
              <button
                className="text-yellow-700 hover:text-yellow-900"
                onClick={() => { setDuplicateRows([]); setDuplicateInfo(null); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <SaveRiskModal
          onClose={() => setShowSaveModal(false)}
          onSuccess={async () => {
            setShowSaveModal(false);
            setSaveSuccess(true);

            // Refresh data from database to show updated state
            if (selectedDepartment) {
              try {
                const { data: riskData } = await supabase
                  .from('risks')
                  .select('*')
                  .eq('department_id', selectedDepartment)
                  .order('sr_no'); // Ensure consistent ordering by sr_no

                if (riskData && riskData.length > 0) {
                  const mappedData = riskData.map(item => mapDbColumnsToCsvData(item));
                  setLocalData(mappedData);
                  setData(mappedData);
                  setHeaders(Object.keys(mappedData[0]));
                  setOriginalData(mappedData); // Update original data
                }
              } catch (error) {
                console.error('Error refreshing data:', error);
              }
            }

            setTimeout(() => {
              setSaveSuccess(false);
            }, 3000);
          }}
          riskData={localData}
          onSmartSave={async (departmentId, data) => {
            // Sanitize the risk data for Supabase compatibility
            const sanitizedRiskData = sanitizeDataForSupabase(data);

            // Add department_id to each record
            const risksToProcess = sanitizedRiskData.map(risk => ({
              ...risk,
              department_id: departmentId
            }));

            // Separate risks with IDs (existing) from those without (new)
            const existingRisks = risksToProcess.filter(risk => risk.id);
            const newRisks = risksToProcess.filter(risk => !risk.id);

            // Find deleted risks by comparing original data with current data
            // Only consider risks that have IDs (were previously in the database)
            const originalRiskIds = originalData
              .filter(risk => risk.id)
              .map(risk => risk.id);

            const currentRiskIds = existingRisks.map(risk => risk.id);

            // Determine which risks have been deleted (in original but not in current)
            const deletedRiskIds = originalRiskIds.filter(
              id => !currentRiskIds.includes(id)
            );

            // Delete risks that have been removed in the UI
            if (deletedRiskIds.length > 0) {
              for (const id of deletedRiskIds) {
                const { error: deleteError } = await supabase
                  .from('risks')
                  .delete()
                  .eq('id', id);

                if (deleteError) {
                  console.error('Error deleting risk:', deleteError);
                  throw deleteError;
                }
              }
            }

            // Update existing risks individually (not in bulk)
            for (const risk of existingRisks) {
              const { error: updateError } = await supabase
                .from('risks')
                .update(risk)
                .eq('id', risk.id);

              if (updateError) {
                console.error('Error updating risk:', updateError);
                throw updateError;
              }
            }

            // Insert new risks if any
            if (newRisks.length > 0) {
              const { error: insertError } = await supabase
                .from('risks')
                .insert(newRisks);

              if (insertError) {
                console.error('Error inserting new risks:', insertError);
                throw insertError;
              }
            }
          }}
        />
      )}

      {saveSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 fade-in">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Success!</p>
              <p className="text-sm">Risk data saved to database successfully.</p>
            </div>
            <div className="ml-auto">
              <button
                className="text-green-700 hover:text-green-900"
                onClick={() => setSaveSuccess(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete all data for your department from the database? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Save</h2>
            <p className="mb-6">Are you sure you want to save all data to the database? This will update existing records and add new ones.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelSave}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmSave}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white"
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
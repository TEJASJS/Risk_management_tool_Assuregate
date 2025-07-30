
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import supabase from '@/lib/supabaseClient';
// Removed unused import mapCsvDataToDbColumns
import { sanitizeDataForSupabase } from '@/lib/columnSanitizer';

interface SaveRiskModalProps {
  onClose: () => void;
  onSuccess: () => void;
  riskData: any[];
  onSmartSave?: (departmentId: string, data: any[]) => Promise<void>;
}

export default function SaveRiskModal({ onClose, onSuccess, riskData, onSmartSave }: SaveRiskModalProps) {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('');
  const [isNewDepartment, setIsNewDepartment] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [actionToConfirm, setActionToConfirm] = useState<(() => Promise<void>) | null>(null);

  // Fetch departments from Supabase
  useEffect(() =>{
    const fetchDepartments = async () => {
      try {
        let query = supabase.from('departments').select('id, name').order('name');

        if ((profile?.role === 'assessor' || profile?.role === 'department_head') && profile?.department_id) {
          query = query.eq('id', profile.department_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        setDepartments(data || []);
        if (data && data.length > 0) {
          setSelectedDepartment(data[0].id);
        } else if (profile?.role === 'assessor' && !profile?.department_id) {
          setError('Assessor profile is missing department ID. Cannot save risks.');
        }
      } catch (err: any) {
        setError(`Error fetching departments: ${err.message}`);
      }
    };

    fetchDepartments();
  }, [profile]);

  const handleSave = async () => {
    setError(null);
    setShowConfirmDialog(true);
    setActionToConfirm(() => confirmSave);
  };

  const confirmSave = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    try {
      let departmentId = selectedDepartment;

      if (profile?.role === 'assessor') {
        if (!profile.department_id) {
          throw new Error('Assessor profile is missing department ID. Cannot save risks.');
        }
        departmentId = profile.department_id;
      } else {
        // If creating a new department (only for non-assessors)
    if (isNewDepartment && newDepartment.trim()) {
          const { data: newDepartmentData, error: newDepartmentError } = await supabase
            .from('departments')
            .insert([{ name: newDepartment.trim() }])
            .select();

          if (newDepartmentError) throw newDepartmentError;
          if (newDepartmentData && newDepartmentData.length > 0) {
            departmentId = newDepartmentData[0].id;
          } else {
            throw new Error('Failed to create new department');
          }
        } else if (isNewDepartment && !newDepartment.trim()) {
          throw new Error('Please enter a department name');
        }
      }

      if (!departmentId) {
        throw new Error('Please select a department');
      }

      // First, verify that the required column exists in the database
      const { data: schemaData, error: schemaError } = await supabase
        .from('risks')
        .select('*')
        .limit(1);

      if (schemaError) {
        console.error('Schema check error:', schemaError);
        throw new Error(`Database schema error: ${schemaError.message}`);
      }

      // Sanitize the risk data for Supabase compatibility
      const sanitizedRiskData = sanitizeDataForSupabase(riskData);

      // Add department_id to each record and ensure date fields are properly cleaned
      const risksToInsert = sanitizedRiskData.map(risk => {
        const cleanedRisk = { ...risk, department_id: departmentId };
        
        // Additional date cleaning to ensure no invalid date strings reach Supabase
        const dateFields = ['date_risk_identified', 'planned_mitigation_completion_date', 'actual_mitigation_completion_date'];
        dateFields.forEach(field => {
          if (cleanedRisk[field] && typeof cleanedRisk[field] === 'string') {
            const dateValue = cleanedRisk[field].toString().trim();
            if (['NA', 'N/A', 'na', 'n/a', 'NULL', 'null', '', 'undefined', '-'].includes(dateValue.toLowerCase()) || dateValue === '') {
              cleanedRisk[field] = null;
            }
          }
        });
        
        return cleanedRisk;
      });

      console.log('Sample sanitized data:', risksToInsert[0]);

      // Use smart save if available, otherwise fall back to complete replacement
      if (onSmartSave) {
        await onSmartSave(departmentId, riskData);
      } else {
        // Fallback: Complete replacement
        // Delete all existing risks for this department first
        const { error: deleteError } = await supabase
          .from('risks')
          .delete()
          .eq('department_id', departmentId);

        if (deleteError) throw deleteError;

        // Insert all new risks (complete replacement)
        if (risksToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('risks')
            .insert(risksToInsert);

          if (insertError) throw insertError;
        }
      }

      setSuccess(true);
      
      // Trigger data refresh by calling onSuccess immediately
      onSuccess();
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(`Error saving risks: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 fade-in">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-slate-900">Save Risk Data</h2>
          <p className="text-slate-600 mt-1">
            Save your risk assessment data to the database
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              Risk data saved successfully!
            </div>
          )}

          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500]">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <h3 className="text-lg font-bold mb-4">Confirm Save</h3>
                <p className="mb-6">Are you sure you want to save this data to the database?</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      if (actionToConfirm) actionToConfirm();
                      setShowConfirmDialog(false);
                    }}
                    className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Yes, Save
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setIsLoading(false); // Reset loading state if cancelled
                    }}
                    className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors duration-200"
                  >
                    No, Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {(profile?.role === 'assessor' || profile?.role === 'department_head') ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                Saving risks for department: <strong>{departments.find(d => d.id === selectedDepartment)?.name || 'N/A'}</strong>
              </div>
            ) : (
              <>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="departmentOption"
                      checked={!isNewDepartment}
                      onChange={() => setIsNewDepartment(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Use existing department</span>
                  </label>
                  
                  {!isNewDepartment && (
                    <div className="mt-2 ml-6">
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="departmentOption"
                      checked={isNewDepartment}
                      onChange={() => setIsNewDepartment(true)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Create new department</span>
                  </label>
                  
                  {isNewDepartment && (
                    <div className="mt-2 ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department Name
                      </label>
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="Enter department name"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {riskData.length} risk record{riskData.length !== 1 ? 's' : ''} will be saved to the database.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
            <button
              onClick={handleSave}
              disabled={isLoading || (isNewDepartment && !newDepartment.trim()) || (!isNewDepartment && !selectedDepartment)}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-colors duration-200
                ${isLoading || (isNewDepartment && !newDepartment.trim()) || (!isNewDepartment && !selectedDepartment)
                  ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {isLoading ? 'Saving...' : 'Save to Database'}
            </button>
        </div>
      </div>
    </div>
  );
}

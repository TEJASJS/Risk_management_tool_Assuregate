"use client";
import { useEffect, useState } from "react";

import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";

export default function UserManagementPage() {
  const { profile, loading: authLoading, initializeAuth } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editDepartmentData, setEditDepartmentData] = useState<{ id: string, name: string } | null>(null);
  const [showEditDepartment, setShowEditDepartment] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: "", password: "", role: "assessor", department_id: "" });
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserData, setEditUserData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!profile || (profile.role !== "super_admin" && profile.role !== "department_head")) {
      router.push("/login");
      return;
    }
    fetchDepartments();
  }, [profile, authLoading, router]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchUsers(selectedDepartment);
    } else {
      setUsers([]);
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
    try {
      let query = supabase.from("departments").select("id, name").order("name");
      if (profile?.role === "department_head" && profile?.department_id) {
        query = query.eq("id", profile.department_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDepartments(data || []);
      if (data && data.length > 0 && profile?.role === "department_head") {
        setSelectedDepartment(data[0].id);
      }
    } catch (err: any) {
      setError(`Error fetching departments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (departmentId: string) => {
    setLoading(true);
    setError("");
    try {
      let query = supabase.from("profiles").select('*');

      if (profile?.role === "department_head" && profile?.department_id) {
        query = query.eq("department_id", profile.department_id);
      } else if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(`Error fetching users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.from("departments").insert({ name: newDepartmentName });
      if (error) throw error;
      setNewDepartmentName("");
      setShowAddDepartment(false);
      setSuccessMessage("Department added successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchDepartments();
    } catch (err: any) {
      setError(`Error adding department: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDepartmentData) return;
    
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase
        .from("departments")
        .update({ name: editDepartmentData.name })
        .eq("id", editDepartmentData.id);
      
      if (error) throw error;
      
      setShowEditDepartment(false);
      setEditDepartmentData(null);
      setSuccessMessage("Department updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchDepartments();
    } catch (err: any) {
      setError(`Error updating department: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm("Are you sure you want to delete this department? This will also remove all associated users.")) return;
    
    setLoading(true);
    setError("");
    try {
      // First update all profiles to remove the department_id
      const { error: profilesError } = await supabase
        .from("profiles")
        .update({ department_id: null })
        .eq("department_id", departmentId);
      
      if (profilesError) throw profilesError;
      
      // Then delete the department
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", departmentId);
      
      if (error) throw error;
      
      setSuccessMessage("Department deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (err: any) {
      setError(`Error deleting department: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
      });
      if (signUpError || !data.user) {
        throw new Error(signUpError?.message || "Signup failed");
      }
      // Introduce a small delay to ensure user is fully committed in auth.users
      await new Promise(resolve => setTimeout(resolve, 500));



      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: newUserData.email,
        role: newUserData.role || 'reviewer',
        department_id: selectedDepartment,
      }, { onConflict: 'id' });
      if (profileError) {
        throw new Error(profileError.message);
      }

      setNewUserData({ email: "", password: "", role: "assessor", department_id: "" });
      setShowAddUserModal(false);
      setSuccessMessage("User added successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      if (selectedDepartment) fetchUsers(selectedDepartment);
    } catch (err: any) {
      setError(`Error adding user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: editUserData.role })
        .eq("id", editUserData.id);
      if (error) throw error;
      setEditUserData(null);
      setShowEditUserModal(false);
      setSuccessMessage("User updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      if (selectedDepartment) fetchUsers(selectedDepartment);
    } catch (err: any) {
      setError(`Error editing user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setLoading(true);
    setError("");
    try {
      // Delete from profiles table first
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
      if (profileError) throw profileError;

      setSuccessMessage("User deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      if (selectedDepartment) fetchUsers(selectedDepartment);
    } catch (err: any) {
      setError(`Error deleting user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {profile?.role === "super_admin" && (
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button 
              className="btn-primary" 
              onClick={() => setShowAddDepartment((v) => !v)}
            >
              {showAddDepartment ? "Cancel" : "Add Department"}
            </button>
            {selectedDepartment && (
              <button 
                className="btn-secondary"
                onClick={() => {
                  const dept = departments.find(d => d.id === selectedDepartment);
                  if (dept) {
                    setEditDepartmentData(dept);
                    setShowEditDepartment(true);
                  }
                }}
              >
                Edit Department
              </button>
            )}
            {selectedDepartment && (
              <button 
                className="btn-danger"
                onClick={() => handleDeleteDepartment(selectedDepartment)}
              >
                Delete Department
              </button>
            )}
          </div>
          
          {showAddDepartment && (
            <form onSubmit={handleAddDepartment} className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <label className="block mb-1 font-medium">Department Name</label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Department"}
              </button>
              {error && <div className="text-red-600 font-semibold">{error}</div>}
            </form>
          )}

          {showEditDepartment && editDepartmentData && (
            <form onSubmit={handleEditDepartment} className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <label className="block mb-1 font-medium">Department Name</label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={editDepartmentData.name}
                  onChange={(e) => setEditDepartmentData({...editDepartmentData, name: e.target.value})}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary flex-1" 
                  onClick={() => {
                    setShowEditDepartment(false);
                    setEditDepartmentData(null);
                  }}
                >
                  Cancel
                </button>
              </div>
              {error && <div className="text-red-600 font-semibold">{error}</div>}
            </form>
          )}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Departments</h2>
        {loading && <p>Loading departments...</p>}
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={`px-4 py-2 rounded-lg ${selectedDepartment === dept.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {selectedDepartment && (
        <div>
          <h2 className="text-2xl font-bold mb-4">{departments.find(d => d.id === selectedDepartment)?.name} Users</h2>
          
          <div className="mb-4 flex gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setNewUserData({ ...newUserData, role: "assessor", department_id: selectedDepartment || "" });
                setShowAddUserModal(true);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add User
            </button>
          </div>
          </div>

          {loading && <p>Loading users...</p>}
          {error && <p className="text-red-600">{error}</p>}
          <table className="w-full table-auto border mt-2">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border capitalize">{u.role}</td>
                  <td className="p-2 border">
                    <button
                      className="btn-secondary mr-2" 
                      onClick={() => {
                        setEditUserData(u);
                        setShowEditUserModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDeleteUser(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">No users found for this department</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 fade-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-slate-900">Add New User</h2>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="form-input w-full"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  className="form-input w-full"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Role</label>
                <select
                  className="form-select w-full"
                  value={newUserData.role}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, role: e.target.value }))}
                  required
                >
                  {profile?.role === "super_admin" && <option value="department_head">Department Head</option>}
                  <option value="assessor">Assessor</option>
                  <option value="reviewer">Reviewer</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Adding..." : "Add User"}
              </button>
              {error && <div className="text-red-600 font-semibold">{error}</div>}
              <button type="button" className="btn-secondary w-full mt-2" onClick={() => setShowAddUserModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editUserData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 fade-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-slate-900">Edit User: {editUserData.email || 'N/A'}</h2>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Role</label>
                <select
                  className="form-select w-full"
                  value={editUserData.role}
                  onChange={(e) => setEditUserData((prev: any) => ({ ...prev, role: e.target.value }))}
                  required
                >
                  {profile?.role === "super_admin" && <option value="department_head">Department Head</option>}
                  <option value="assessor">Assessor</option>
                  <option value="reviewer">Reviewer</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
              {error && <div className="text-red-600 font-semibold">{error}</div>}
              <button type="button" className="btn-secondary w-full mt-2" onClick={() => setShowEditUserModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
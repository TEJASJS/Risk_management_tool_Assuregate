
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Shield, Search, Book, Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/store/useAuth";

import { Users } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Risk Assessment", href: "/risk-assessment", icon: Shield },
  { label: "Query Builder", href: "/query-builder", icon: Search },
  { label: "Guidelines", href: "/guidelines", icon: Book },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [currentDepartmentId, setCurrentDepartmentId] = useState<string | null>(null);
  const { profile } = useAuth();

  // Update current department ID whenever URL changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const departmentId = params.get('department');
      setCurrentDepartmentId(departmentId);
      
      // If we're on the risk assessment page and have a department ID, ensure it's selected
      if (pathname === '/risk-assessment' && departmentId && departments.some(d => d.id === departmentId)) {
        setIsDepartmentsOpen(true); // Expand the departments section
      }
    }
  }, [pathname, typeof window !== 'undefined' ? window.location.search : '', departments]);
  
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error state before fetching
        
        let query = supabase
          .from('departments')
          .select('id, name');

        if (profile?.role === 'department_head' && profile?.department_id) {
          query = query.eq('id', profile.department_id);
        } else if (profile?.role === 'assessor' && profile?.department_id) {
          query = query.eq('id', profile.department_id);
        } else if (profile?.role === 'reviewer' && profile?.department_id) {
          query = query.eq('id', profile.department_id);
        }

        const { data, error } = await query.order('name');

        if (error) {
          console.error('Error fetching departments:', error);
          setError(error.message);
          // Set empty departments array instead of throwing
          setDepartments([]);
        } else {
          setDepartments(data || []);
        }
      } catch (err: any) {
        console.error('Exception fetching departments:', err);
        setError(err.message || 'An error occurred while fetching departments');
        // Set empty departments array on exception
        setDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [pathname]); // Re-fetch when pathname changes to ensure sidebar updates

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      setCreateError('Please enter a department name');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ name: newDepartmentName.trim() }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Refresh departments list
        const { data: updatedDepartments, error: fetchError } = await supabase
          .from('departments')
          .select('id, name')
          .order('name');

        if (fetchError) throw fetchError;
        setDepartments(updatedDepartments || []);

        // Navigate to risk assessment page with the new department selected
        router.push(`/risk-assessment?department=${data[0].id}`);
        
        // Close modal and reset form
        setShowCreateModal(false);
        setNewDepartmentName("");
      }
    } catch (err: any) {
      setCreateError(`Error creating department: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDepartmentSelect = (departmentId: string) => {
    // Update local state immediately
    setCurrentDepartmentId(departmentId);
    
    // Use router.replace instead of router.push for immediate navigation
    // The replace method updates the URL without adding to history
    // This forces a re-render of the page component
    router.replace(`/risk-assessment?department=${departmentId}`);
  };

  const handleLogout = async () => {
    try {
          console.log('Calling supabase.auth.signOut()');
          // Clear local storage items related to Supabase session
          localStorage.removeItem('risk-management-auth-code-verifier');
          localStorage.removeItem('risk-management-auth-pkce-code-verifier');
          localStorage.removeItem('risk-management-auth');
          await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      console.log('Attempting to redirect to login...');
      router.push("/login");
    }
  };

  // Only show assigned department for reviewer/assessor
  const filteredDepartments = profile?.role === 'super_admin'
    ? departments
    : departments.filter(d => d.id === profile?.department_id);

  return (
    <>
      <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen sticky top-0 border-r border-slate-700 slide-in">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <div className="text-xl font-bold">AssureGate</div>
              <div className="text-xs text-slate-400">Risk Management</div>
            </div>
          </div>
        </div>

        <nav className="flex flex-col space-y-2 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                pathname === href 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              <Icon size={20} className={`${pathname === href ? "text-white" : "text-slate-400 group-hover:text-blue-400"} transition-colors`} />
              <span className="font-medium">{label}</span>
              {pathname === href && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
              )}
            </Link>
          ))}

          {(profile?.role === "super_admin" || profile?.role === "department_head") && (
            <>
              <Link
                href="/admin"
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                  pathname === "/admin"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              >
                <Building2 size={20} className={`${pathname === "/admin" ? "text-white" : "text-slate-400 group-hover:text-blue-400"} transition-colors`} />
                <span className="font-medium">Admin Dashboard</span>
                {pathname === "/admin" && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </Link>
              
              <Link
                href="/admin/users"
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                  pathname === "/admin/users"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              >
                <Users size={20} className={`${pathname === "/admin/users" ? "text-white" : "text-slate-400 group-hover:text-blue-400"} transition-colors`} />
                <span className="font-medium">User Management</span>
                {pathname === "/admin/users" && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </Link>
            </>
          )}


        </nav>

        {/* Profile and Logout at the bottom */}
        <div className="mt-auto p-4 border-t border-slate-700">
          {profile && (
            <div className="mb-4 flex flex-col items-center text-xs text-slate-300 bg-slate-800/80 rounded-xl p-4 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-md">
                  {profile.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <div className="font-semibold text-white text-sm">{profile.email}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="bg-blue-700 text-white px-2 py-0.5 rounded-full text-xs capitalize shadow">{profile.role}</div>
                    {profile.role !== 'super_admin' && profile.department_id && (
                      <span className="text-slate-400 text-xs">({departments.find(d => d.id === profile.department_id)?.name || 'N/A'})</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2 px-5 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-semibold transition-all shadow hover:scale-105 focus:ring-2 focus:ring-red-400"
              >
                Logout
              </button>
            </div>
          )}
          <div className="text-xs text-slate-400 text-center">
            Version 1.0.0
          </div>
        </div>
      </aside>

      {/* Create New Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 fade-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-slate-900">Create New Department</h2>
              <p className="text-slate-600 mt-1">
                Add a new department to manage risks
              </p>
            </div>

            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Name
                  </label>
                  <input
                    type="text"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Enter department name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateDepartment();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                 setNewDepartmentName("");
                  setCreateError(null);
                }}
                disabled={isCreating}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartment}
                disabled={isCreating || !newDepartmentName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

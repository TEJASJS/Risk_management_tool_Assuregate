"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const { profile, loading: authLoading, initializeAuth } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [userCounts, setUserCounts] = useState<{[key: string]: number}>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    // Only fetch departments if profile is loaded and authorized
    if (profile && !authLoading) {
      console.log("Profile role:", profile.role);
      console.log("Profile department_id:", profile.department_id);
      fetchDepartments();
    }
  }, [profile, authLoading, router]);

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
      console.log("Fetched departments:", data);
      console.log("Departments state after update:", departments);
      
      // Fetch user counts for each department
      if (data && data.length > 0) {
        fetchUserCounts(data);
      }
    } catch (err: any) {
      setError(`Error fetching departments: ${err.message}`);
      console.error("Error fetching departments:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCounts = async (departments: { id: string; name: string }[]) => {
    try {
      const counts: {[key: string]: number} = {};
      
      // Initialize counts for all departments to 0
      departments.forEach(dept => {
        counts[dept.id] = 0;
      });
      
      let query = supabase.from("profiles").select('id, department_id');

      if (profile?.role === "department_head" && profile?.department_id) {
        query = query.eq("department_id", profile.department_id);
      }

      const { data: profilesData, error: profilesError } = await query;

      if (profilesError) {
        console.error("Supabase query error in fetchUserCounts:", profilesError);
        return; // Early return to prevent ERR_ABORTED errors
      }

      if (!profilesData) {
        console.log("No profile data returned");
        setUserCounts(counts);
        return;
      }

      // Count profiles by department_id
      profilesData.forEach(p => {
        if (p.department_id && counts.hasOwnProperty(p.department_id)) {
          counts[p.department_id]++;
        }
      });
      
      setUserCounts(counts);
      console.log("Fetched user counts:", counts);
    } catch (err: any) {
      console.error("Error fetching user counts:", err.message);
      // Set empty counts to prevent UI errors
      setUserCounts({});
    }
  };

  // Function to get total user count across all departments
  const getTotalUserCount = () => {
    return Object.values(userCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Departments</h3>
          <p className="text-3xl font-bold text-blue-600">{departments.length}</p>
          <div className="mt-4">
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Manage Departments →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{getTotalUserCount()}</p>
          <div className="mt-4">
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Manage Users →
            </Link>
          </div>
        </div>

        {profile?.role === "super_admin" && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Quick Actions</h3>
            <div className="space-y-2 mt-2">
              <Link 
                href="/admin/users" 
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center transition-colors"
              >
                User Management
              </Link>
              <Link 
                href="/risk-assessment" 
                className="block w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center transition-colors"
              >
                Risk Assessment
              </Link>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-4">Department Overview</h2>
      {loading ? (
        <p>Loading departments...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-left font-semibold text-gray-600">Department Name</th>
                <th className="p-3 text-left font-semibold text-gray-600">Users</th>
                <th className="p-3 text-left font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{dept.name}</td>
                  <td className="p-3">{userCounts[dept.id] || 0}</td>
                  <td className="p-3">
                    <Link 
                      href={`/admin/users?department=${dept.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Manage Users
                    </Link>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">
                    No departments found. 
                    {profile?.role === "super_admin" && (
                      <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 ml-1">
                        Add a department
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

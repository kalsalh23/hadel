import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [packages, setPackages] = useState([])
  const [users, setUsers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pkgRes, usersRes, subsRes] = await Promise.all([
        supabase.from('packages').select('*').order('created_at', { ascending: true }),
        supabase.from('users').select('*, packages(name, price, duration_days)').order('full_name'),
        supabase
          .from('subscriptions')
          .select('*, users(full_name, phone), packages(name)')
          .order('created_at', { ascending: false })
          .limit(500),
      ])
      if (pkgRes.error) throw pkgRes.error
      if (usersRes.error) throw usersRes.error
      if (subsRes.error) throw subsRes.error
      setPackages(pkgRes.data || [])
      setUsers(usersRes.data || [])
      setSubscriptions(subsRes.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function addUser(payload) {
    const { data, error } = await supabase.from('users').insert(payload).select('*, packages(name, price, duration_days)').single()
    if (error) throw error
    setUsers((prev) => [data, ...prev])
    return data
  }

  async function updateUser(id, payload) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select('*, packages(name, price, duration_days)')
      .single()
    if (error) throw error
    setUsers((prev) => prev.map((u) => (u.id === id ? data : u)))
    return data
  }

  async function deleteUser(id) {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    setUsers((prev) => prev.filter((u) => u.id !== id))
    setSubscriptions((prev) => prev.filter((s) => s.user_id !== id))
  }

  async function renewUser(userId, { packageId, amount, startDate, endDate, method, notes }) {
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        package_id: packageId || null,
        amount,
        start_date: startDate,
        end_date: endDate,
        method,
        notes,
      })
      .select('*, users(full_name, phone), packages(name)')
      .single()
    if (subError) throw subError

    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .update({
        package_id: packageId || null,
        subscription_start: startDate,
        subscription_end: endDate,
        status: 'active',
      })
      .eq('id', userId)
      .select('*, packages(name, price, duration_days)')
      .single()
    if (userError) throw userError

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)))
    setSubscriptions((prev) => [sub, ...prev])
    return { sub, user: updatedUser }
  }

  async function addPackage(payload) {
    const { data, error } = await supabase.from('packages').insert(payload).select('*').single()
    if (error) throw error
    setPackages((prev) => [...prev, data])
    return data
  }

  async function updatePackage(id, payload) {
    const { data, error } = await supabase
      .from('packages')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    setPackages((prev) => prev.map((p) => (p.id === id ? data : p)))
    setUsers((prev) => prev.map((u) => (u.package_id === id ? { ...u, packages: data } : u)))
    return data
  }

  async function deletePackage(id) {
    const { error } = await supabase.from('packages').delete().eq('id', id)
    if (error) throw error
    setPackages((prev) => prev.filter((p) => p.id !== id))
    setUsers((prev) => prev.map((u) => (u.package_id === id ? { ...u, package_id: null, packages: null } : u)))
  }

  return (
    <DataContext.Provider
      value={{
        packages,
        users,
        subscriptions,
        loading,
        error,
        reload: loadAll,
        addUser,
        updateUser,
        deleteUser,
        renewUser,
        addPackage,
        updatePackage,
        deletePackage,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useData() {
  return useContext(DataContext)
}

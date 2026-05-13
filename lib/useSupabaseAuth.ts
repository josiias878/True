"use client"
import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

export function useSupabaseAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Password-based auth ───────────────────────────────────────────────────

  async function signInWithPassword(email: string, password: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert"), data: null }
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUpWithPassword(email: string, password: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert"), data: null }
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://get-true.de"}/auth/callback`,
      },
    })
  }

  async function resetPassword(email: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert") }
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://get-true.de"}/auth/reset-password`,
    })
  }

  // ── OTP-based auth (fallback) ─────────────────────────────────────────────

  // Registrierung: erstellt Account wenn nicht vorhanden
  async function signInWithEmail(email: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert") }
    return supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://get-true.de"}/auth/callback`,
      },
    })
  }

  // Login-OTP: schlägt fehl wenn Account nicht existiert
  async function signInWithEmailLoginOnly(email: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert") }
    return supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })
  }

  async function verifyEmailOtp(email: string, token: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert") }
    return supabase.auth.verifyOtp({ email, token, type: "email" })
  }

  // ── Legacy phone ─────────────────────────────────────────────────────────

  async function signInWithPhone(phone: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert") }
    return supabase.auth.signInWithOtp({ phone })
  }

  async function verifyOtp(phone: string, token: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert") }
    return supabase.auth.verifyOtp({ phone, token, type: "sms" })
  }

  async function updateUserMetadata(data: Record<string, unknown>) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert"), data: null }
    return supabase.auth.updateUser({ data })
  }

  async function updatePassword(password: string) {
    if (!supabase) return { error: new Error("Supabase nicht konfiguriert"), data: null }
    return supabase.auth.updateUser({ password })
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return {
    user, loading,
    signInWithPassword, signUpWithPassword, resetPassword,
    signInWithEmail, signInWithEmailLoginOnly, verifyEmailOtp,
    signInWithPhone, verifyOtp,
    updateUserMetadata, updatePassword,
    signOut,
  }
}

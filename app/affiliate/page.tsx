"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AffiliateApplicationPage() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    website: "",
    audience: "",
    payoutEmail: "",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [referralLink, setReferralLink] = useState("")
  const [usernameError, setUsernameError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.name === "username") {
      setForm({ ...form, username: e.target.value.toLowerCase() })
    } else {
      setForm({ ...form, [e.target.name]: e.target.value })
    }
  }

  const validate = () => {
    if (!form.name.trim()) return "Full Name is required"
    if (!form.username.trim()) return "Username is required"
    if (!/^[a-z0-9_-]{3,20}$/.test(form.username)) return "Username must be 3-20 characters, lowercase letters, numbers, - or _"
    // Placeholder for uniqueness check
    // if (username is not unique) return "Username is already taken"
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return "Valid Email is required"
    if (!form.audience.trim()) return "Audience size is required"
    if (!form.payoutEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.payoutEmail)) return "Valid e-Transfer Email is required"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setUsernameError("")
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/affiliate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.error === "Username is already taken") {
          setUsernameError("This username is already taken. Please choose another.")
        } else {
          setError(data.error || "Something went wrong. Please try again.")
        }
        setSubmitting(false)
        return
      }
      setReferralLink(data.referralLink)
      setSuccess(true)
    } catch (err) {
      setError("Server error. Please try again later.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Affiliate Program Application</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="text-green-600 font-semibold text-lg">Thanks for applying!</div>
              <div>Your referral link:</div>
              <div className="flex items-center justify-center gap-2">
                <Input value={referralLink} readOnly className="w-64 text-center" />
                <Button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink)
                  }}
                  size="sm"
                  variant="outline"
                >
                  Copy
                </Button>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                This link is <span className="font-semibold text-yellow-600">pending admin approval</span> and will become active once verified.
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required disabled={submitting} />
              </div>
              <div>
                <Label htmlFor="username">Username (Business/Brand Name)</Label>
                <Input id="username" name="username" value={form.username} onChange={handleChange} required disabled={submitting} placeholder="yourbrand" autoComplete="off" />
                {usernameError && <div className="text-red-600 text-xs mt-1">{usernameError}</div>}
                <div className="text-xs text-gray-500 mt-1">This will be your public referral link: resumepilot.ca/ref/<span className="font-mono">yourbrand</span></div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required disabled={submitting} />
              </div>
              <div>
                <Label htmlFor="website">Social Media or Website <span className="text-gray-400">(optional)</span></Label>
                <Input id="website" name="website" value={form.website} onChange={handleChange} disabled={submitting} />
              </div>
              <div>
                <Label htmlFor="audience">Size of Audience</Label>
                <Input id="audience" name="audience" value={form.audience} onChange={handleChange} required disabled={submitting} />
              </div>
              <div>
                <Label htmlFor="payoutEmail">e-Transfer Email (for payouts)</Label>
                <Input id="payoutEmail" name="payoutEmail" type="email" value={form.payoutEmail} onChange={handleChange} required disabled={submitting} />
              </div>
              <div>
                <Label htmlFor="message">Optional Message</Label>
                <textarea id="message" name="message" value={form.message} onChange={handleChange} className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 min-h-[80px]" disabled={submitting} />
              </div>
              {error && <div className="text-red-600 text-sm text-center">{error}</div>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 